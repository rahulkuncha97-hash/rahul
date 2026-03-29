import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import { User, Post, Message, Comment } from "./src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// In-memory storage (simulating a database)
const users: User[] = [];
const posts: Post[] = [];
const messages: Message[] = [];

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  // --- API Routes ---

  // Auth (Simulated)
  app.post("/api/auth/register", (req, res) => {
    const { name, email, password } = req.body;
    if (users.find((u) => u.email === email)) {
      return res.status(400).json({ error: "User already exists" });
    }
    const newUser: User = {
      id: Math.random().toString(36).substring(2, 11),
      name,
      email,
      bio: "",
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    };
    users.push(newUser);
    res.json(newUser);
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = users.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json(user);
  });

  // Profile
  app.put("/api/profile/:id", (req, res) => {
    const { id } = req.params;
    const { name, bio, website } = req.body;
    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) return res.status(404).json({ error: "User not found" });
    users[userIndex] = { ...users[userIndex], name, bio, website };
    res.json(users[userIndex]);
  });

  app.post("/api/profile/:id/avatar", upload.single("avatar"), (req: any, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) return res.status(404).json({ error: "User not found" });
    const avatarUrl = `/uploads/${req.file.filename}`;
    users[userIndex].avatar = avatarUrl;
    res.json({ avatar: avatarUrl });
  });

  // Posts
  app.get("/api/posts", (req, res) => {
    res.json(posts);
  });

  app.post("/api/posts", upload.fields([{ name: "image", maxCount: 1 }, { name: "voice", maxCount: 1 }]), (req: any, res) => {
    const { userId, userName, userAvatar, content } = req.body;
    const newPost: Post = {
      id: Math.random().toString(36).substring(2, 11),
      userId,
      userName,
      userAvatar,
      content,
      image: req.files?.["image"] ? `/uploads/${req.files["image"][0].filename}` : undefined,
      voice: req.files?.["voice"] ? `/uploads/${req.files["voice"][0].filename}` : undefined,
      timestamp: Date.now(),
      likes: [],
      comments: [],
    };
    posts.unshift(newPost);
    io.emit("new_post", newPost);
    res.json(newPost);
  });

  // Generic Upload
  app.post("/api/upload", upload.single("file"), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  app.delete("/api/posts/:id", (req, res) => {
    const { id } = req.params;
    const index = posts.findIndex((p) => p.id === id);
    if (index !== -1) {
      posts.splice(index, 1);
      io.emit("post_deleted", id);
      return res.json({ success: true });
    }
    res.status(404).json({ error: "Post not found" });
  });

  // Chat History
  app.get("/api/chat", (req, res) => {
    res.json(messages);
  });

  // --- Socket.io ---
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("send_message", (data) => {
      const newMessage: Message = {
        id: Math.random().toString(36).substring(2, 11),
        userId: data.userId,
        userName: data.userName,
        content: data.content,
        image: data.image,
        voice: data.voice,
        timestamp: Date.now(),
      };
      messages.push(newMessage);
      io.emit("receive_message", newMessage);
    });

    socket.on("add_comment", (data) => {
      const { postId, userId, userName, content } = data;
      const post = posts.find((p) => p.id === postId);
      if (post) {
        const newComment: Comment = {
          id: Math.random().toString(36).substring(2, 11),
          userId,
          userName,
          content,
          timestamp: Date.now(),
        };
        post.comments.push(newComment);
        io.emit("comment_added", { postId, comment: newComment });
      }
    });

    socket.on("like_post", (data) => {
      const { postId, userId } = data;
      const post = posts.find((p) => p.id === postId);
      if (post) {
        const index = post.likes.indexOf(userId);
        if (index === -1) {
          post.likes.push(userId);
        } else {
          post.likes.splice(index, 1);
        }
        io.emit("post_liked", { postId, likes: post.likes });
      }
    });

    socket.on("update_location", (data) => {
      // Broadcast location to all other users
      socket.broadcast.emit("user_location_updated", {
        userId: data.userId,
        userName: data.userName,
        avatar: data.avatar,
        location: data.location,
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
