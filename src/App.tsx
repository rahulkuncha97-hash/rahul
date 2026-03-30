import React, { Component, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GlassCard } from "@/components/ui/Card";
import { FloatingOrbs } from "@/components/ui/FloatingOrbs";
import { VoicePlayer, VoiceRecorder } from "@/components/ui/VoiceControls";
import { 
  Home, 
  Rss, 
  MessageSquare, 
  Map as MapIcon, 
  User as UserIcon, 
  LogOut, 
  Plus, 
  Heart, 
  MessageCircle, 
  Trash2, 
  Send, 
  Image as ImageIcon, 
  Video,
  Mic, 
  Phone, 
  ShieldAlert, 
  Flame, 
  Ambulance, 
  ExternalLink, 
  QrCode,
  Globe,
  Edit2,
  Camera,
  Check,
  X,
  Sparkles,
  Bot,
  Wand2,
  Info,
  Play,
  Pause,
  Square,
  ArrowLeft
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { formatDistanceToNow } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { fbDb as db } from "./firebase-utils";
import { auth, db as firestoreDb } from "./firebase";
import { getDocFromServer, doc } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

async function testConnection() {
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
import { User, Post, Message, Comment } from "./types";
import { summarizeFeed, suggestPost, generateAIResponse } from "./services/aiService";

// --- Error Boundary ---
const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const CommentSection = ({ post, user }: { post: Post, user: User }) => {
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      userName: user.name,
      content: comment,
      timestamp: Date.now()
    };

    try {
      const updatedPost = { ...post, comments: [...post.comments, newComment] };
      await db.updatePost(updatedPost);
      setComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  return (
    <div className="px-3 pb-3 space-y-3">
      <button 
        onClick={() => setShowComments(!showComments)}
        className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-purple-400 transition-colors"
      >
        {showComments ? "Hide Comments" : `View ${post.comments.length} Comments`}
      </button>

      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {post.comments.map(c => (
              <div key={c.id} className="bg-white/5 p-2 rounded-lg border border-white/5">
                <p className="text-[10px] font-bold text-purple-400">{c.userName}</p>
                <p className="text-xs text-gray-300">{c.content}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleAddComment} className="flex gap-2">
        <input 
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500/50"
        />
        <button type="submit" className="text-purple-500 hover:text-purple-400">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

// --- Main App ---

export default function ColonyConnect() {
  return (
    <ErrorBoundary>
      <ColonyConnectApp />
    </ErrorBoundary>
  );
}

function ColonyConnectApp() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("home");
  const [posts, setPosts] = useState<Post[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallpaper, setWallpaper] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await db.getUser(firebaseUser.uid);
        if (userDoc) {
          setUser(userDoc);
        } else {
          const newUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`
          };
          await db.saveUser(newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Wallpaper from local storage
    const savedWallpaper = localStorage.getItem("colony_wallpaper");
    if (savedWallpaper) setWallpaper(savedWallpaper);

    const unsubPosts = db.subscribePosts(setPosts);
    const unsubMessages = db.subscribeMessages(setMessages);

    return () => {
      unsubPosts();
      unsubMessages();
    };
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-black text-white">Loading...</div>;

  if (!user) return <Auth onAuth={setUser} />;

  return (
    <div 
      className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 bg-cover bg-center bg-no-repeat transition-all duration-700"
      style={wallpaper ? { backgroundImage: `url(${wallpaper})` } : {}}
    >
      <div className={cn("min-h-screen", wallpaper && "bg-black/40 backdrop-blur-[2px]")}>
        <FloatingOrbs />
        
        <main className="pb-24 pt-6 px-4 max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === "home" && <HomeTab user={user} posts={posts} messages={messages} />}
            {activeTab === "feed" && <FeedTab user={user} posts={posts} setPosts={setPosts} />}
            {activeTab === "chat" && <ChatTab user={user} messages={messages} />}
            {activeTab === "map" && <MapTab user={user} />}
            {activeTab === "profile" && <ProfileTab user={user} setUser={setUser} posts={posts} onLogout={handleLogout} setWallpaper={setWallpaper} />}
          </AnimatePresence>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 px-6 py-4 flex justify-between items-center z-50">
          {[
            { id: "home", icon: Home, label: "Home" },
            { id: "feed", icon: Rss, label: "Feed" },
            { id: "chat", icon: MessageSquare, label: "Chat" },
            { id: "map", icon: MapIcon, label: "Map" },
            { id: "profile", icon: UserIcon, label: "Profile" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-300 relative",
                activeTab === tab.id ? "text-purple-400 scale-110" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <tab.icon size={24} />
              <span className="text-[10px] font-medium uppercase tracking-widest">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div layoutId="nav-indicator" className="absolute -top-4 w-1 h-1 bg-purple-400 rounded-full shadow-[0_0_10px_#a855f7]" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// --- Tab Components ---

const HomeTab = ({ user, posts, messages }: { user: User, posts: Post[], messages: Message[] }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const handleSummarize = async () => {
    setSummarizing(true);
    const text = await summarizeFeed(posts);
    setSummary(text || "No summary available.");
    setSummarizing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tighter">ColonyConnect</h1>
          <p className="text-gray-400 text-lg">Hi, {user.name.split(' ')[0]}</p>
          <p className="text-gray-500 text-sm">Your community is active today.</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Sparkles size={20} className="text-purple-400" />
        </div>
      </header>

      <form action="https://www.google.com/search" method="GET" target="_blank" className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
          </svg>
        </div>
        <input 
          type="text" 
          name="q" 
          placeholder="Search Google..." 
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-gray-500"
        />
      </form>

      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4 space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Posts</p>
          <p className="text-2xl font-mono font-bold">{posts.length}</p>
        </GlassCard>
        <GlassCard className="p-4 space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Messages</p>
          <p className="text-2xl font-mono font-bold">{messages.length}</p>
        </GlassCard>
      </div>

      <GlassCard className="p-5 space-y-3 border-purple-500/20 bg-purple-500/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Bot size={16} className="text-purple-400" /> AI Community Summary
          </h3>
          <button 
            onClick={handleSummarize}
            disabled={summarizing}
            className="text-[10px] uppercase tracking-widest font-bold text-purple-400 hover:text-purple-300 disabled:opacity-50"
          >
            {summarizing ? "Analyzing..." : "Refresh"}
          </button>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed italic">
          {summary || "Click refresh to get an AI-powered summary of the latest community updates."}
        </p>
      </GlassCard>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
          <Rss size={14} /> Recent Activity
        </h2>
        <div className="space-y-3">
          {posts.slice(0, 3).map(post => (
            <GlassCard key={post.id} className="p-3 flex gap-3 items-center">
              <img src={post.userAvatar} className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{post.userName}</p>
                <p className="text-xs text-gray-400 truncate">{post.content}</p>
              </div>
              <p className="text-[9px] text-gray-500 whitespace-nowrap">{formatDistanceToNow(post.timestamp)}</p>
            </GlassCard>
          ))}
        </div>
      </section>
    </motion.div>
  );
};

const FeedTab = ({ user, posts, setPosts }: { user: User, posts: Post[], setPosts: any }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [voice, setVoice] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [voicePreview, setVoicePreview] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [optimisticPosts, setOptimisticPosts] = useState<(Post & { isOptimistic?: boolean })[]>([]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1 || items[i].type.indexOf("video") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setImage(file);
          setPreview(URL.createObjectURL(file));
        }
      }
    }
  };

  const uploadFile = async (file: File | Blob, path: string) => {
    return await db.uploadFile(file as File, path);
  };

  const handleAISuggest = async () => {
    if (!content.trim()) {
      alert("Please type a topic first (e.g., 'community garden' or 'lost keys')");
      return;
    }
    setSuggesting(true);
    const suggestion = await suggestPost(content);
    if (suggestion) setContent(suggestion);
    setSuggesting(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentContent = content;
    const currentImage = image;
    const currentVoice = voice;
    const currentPreview = preview;
    const currentVoicePreview = voicePreview;

    const postId = "post_" + Date.now();
    const isUploading = !!currentImage || !!currentVoice;
    
    const optimisticPost: Post & { isOptimistic?: boolean } = {
      id: postId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar || "",
      content: currentContent,
      image: currentPreview || "",
      voice: currentVoicePreview || "",
      timestamp: Date.now(),
      likes: [],
      comments: [],
      isOptimistic: true,
      isUploadingMedia: isUploading
    };

    setOptimisticPosts(prev => [optimisticPost, ...prev]);
    
    setContent("");
    setImage(null);
    setVoice(null);
    setPreview(null);
    setVoicePreview(null);
    setShowCreate(false);

    try {
      // Save to DB immediately without media URLs
      const { isOptimistic, ...rest } = optimisticPost;
      const dbPost: Post = {
        ...rest,
        image: "",
        voice: ""
      };
      await db.savePost(dbPost);

      if (isUploading) {
        // Fire and forget background upload
        (async () => {
          try {
            let imageUrl = "";
            let voiceUrl = "";
            
            if (currentImage) imageUrl = await uploadFile(currentImage, `posts/images/${postId}_${Date.now()}`);
            if (currentVoice) voiceUrl = await uploadFile(currentVoice, `posts/voice/${postId}_${Date.now()}`);

            const updatedPost = {
              ...dbPost,
              image: imageUrl,
              voice: voiceUrl,
              isUploadingMedia: false
            };
            await db.updatePost(updatedPost);
          } catch (err) {
            console.error("Background upload error:", err);
          } finally {
            setOptimisticPosts(prev => prev.filter(p => p.id !== postId));
          }
        })();
      } else {
        setOptimisticPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (err) {
      console.error("Post error:", err);
      setOptimisticPosts(prev => prev.filter(p => p.id !== postId));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await db.deletePost(id);
      setPosts(await db.getPosts());
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-5"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tighter">Community Feed</h1>
          <div className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border bg-green-500/20 border-green-500/40 text-green-400 flex items-center gap-1">
            <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
            Live
          </div>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="bg-purple-600 hover:bg-purple-500 p-2.5 rounded-full transition-colors shadow-lg shadow-purple-500/20"
        >
          <Plus size={20} />
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <GlassCard className="w-full max-w-md p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">New Post</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="What's happening in the colony?"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-purple-500/50 min-h-[100px] resize-none text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleAISuggest}
                    disabled={suggesting}
                    className="absolute bottom-3 right-3 text-purple-400 hover:text-purple-300 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/20"
                  >
                    <Wand2 size={12} /> {suggesting ? "Writing..." : "AI Help"}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-2.5 cursor-pointer transition-colors">
                    <ImageIcon size={18} className="text-blue-400" />
                    <span className="text-xs font-medium text-gray-400 hidden sm:inline">Gallery</span>
                    <input type="file" className="hidden" accept="image/*,video/*" onChange={handleImageChange} />
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-2.5 cursor-pointer transition-colors">
                    <Camera size={18} className="text-pink-400" />
                    <span className="text-xs font-medium text-gray-400 hidden sm:inline">Camera</span>
                    <input type="file" className="hidden" accept="image/*,video/*" capture="environment" onChange={handleImageChange} />
                  </label>
                  <VoiceRecorder label="Voice" onRecordingComplete={(blob) => {
                    setVoice(blob);
                    setVoicePreview(URL.createObjectURL(blob));
                  }} />
                  <button 
                    type="submit" 
                    disabled={posting}
                    className="bg-purple-600 hover:bg-purple-500 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {posting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Posting...
                      </>
                    ) : "Post"}
                  </button>
                </div>
                {preview && (
                  <div className="relative rounded-xl overflow-hidden aspect-video border border-white/10">
                    <img src={preview} className="w-full h-full object-cover" />
                    <button onClick={() => { setImage(null); setPreview(null); }} className="absolute top-2 right-2 bg-black/50 p-1 rounded-full"><X size={14}/></button>
                  </div>
                )}
                {voicePreview && (
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                    <VoicePlayer url={voicePreview} />
                    <button onClick={() => { setVoice(null); setVoicePreview(null); }} className="text-gray-500 hover:text-red-400"><X size={16}/></button>
                  </div>
                )}
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {[...optimisticPosts, ...posts.filter(p => !optimisticPosts.find(op => op.id === p.id))].sort((a, b) => b.timestamp - a.timestamp).map(post => (
          <GlassCard key={post.id} tilt className={cn("group", post.isOptimistic && "opacity-70")}>
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img src={post.userAvatar} className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                <div>
                  <p className="font-bold text-xs">{post.userName}</p>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest">
                    {post.isOptimistic ? "Posting..." : `${formatDistanceToNow(post.timestamp)} ago`}
                  </p>
                </div>
              </div>
              {post.userId === user.id && !post.isOptimistic && (
                <button 
                  onClick={() => handleDelete(post.id)} 
                  className="p-2 -mr-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all active:scale-95"
                  aria-label="Delete post"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
            <div className="px-3 pb-2">
              <p className="text-gray-200 text-sm leading-relaxed">{post.content}</p>
            </div>
            {post.image && (
              <div className="relative aspect-video overflow-hidden border-y border-white/5">
                {post.isOptimistic && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                {post.image.endsWith('.mp4') || post.image.endsWith('.mov') || post.image.startsWith('blob:') ? (
                  <video src={post.image} controls className="w-full h-full object-cover" />
                ) : (
                  <img 
                    src={post.image} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    referrerPolicy="no-referrer" 
                  />
                )}
              </div>
            )}
            {post.isUploadingMedia && !post.image && (
              <div className="relative aspect-video overflow-hidden border-y border-white/5 bg-white/5 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-purple-400">
                  <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium tracking-widest uppercase">Uploading media...</span>
                </div>
              </div>
            )}
            {post.voice && (
              <div className="px-3 pb-3">
                <VoicePlayer url={post.voice} />
              </div>
            )}
            <div className="p-3 flex items-center gap-5">
              <button 
                disabled={post.isOptimistic}
                onClick={async () => {
                  const isLiked = post.likes.includes(user.id);
                  const newLikes = isLiked 
                    ? post.likes.filter(id => id !== user.id)
                    : [...post.likes, user.id];
                  try {
                    const updatedPost = { ...post, likes: newLikes };
                    await db.updatePost(updatedPost);
                    setPosts(await db.getPosts());
                  } catch (error) {
                    console.error("Like error:", error);
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 transition-colors",
                  post.likes.includes(user.id) ? "text-pink-500" : "text-gray-400 hover:text-pink-400",
                  post.isOptimistic && "opacity-50 cursor-not-allowed"
                )}
              >
                <Heart size={18} fill={post.likes.includes(user.id) ? "currentColor" : "none"} />
                <span className="text-[10px] font-bold">{post.likes.length}</span>
              </button>
              <button className="flex items-center gap-1.5 text-gray-400 hover:text-blue-400 transition-colors" disabled={post.isOptimistic}>
                <MessageCircle size={18} />
                <span className="text-[10px] font-bold">{post.comments.length}</span>
              </button>
            </div>
            {!post.isOptimistic && <CommentSection post={post} user={user} />}
          </GlassCard>
        ))}
      </div>

    </motion.div>
  );
};

const ChatTab = ({ user, messages }: { user: User, messages: Message[] }) => {
  const [content, setContent] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<File | null>(null);
  const [pendingVoice, setPendingVoice] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localMediaPreview, setLocalMediaPreview] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<(Message & { isOptimistic?: boolean })[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<any>(null);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1 || items[i].type.indexOf("video") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleFileUpload(file);
        }
      }
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const uploadFile = async (file: File | Blob, path: string) => {
    return await db.uploadFile(file as File, path);
  };

  const handleFileUpload = (file: File) => {
    const localUrl = URL.createObjectURL(file);
    setLocalMediaPreview(localUrl);
    setPendingMedia(file);
  };

  const handleVoiceUpload = (blob: Blob) => {
    setPendingVoice(blob);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !pendingMedia && !pendingVoice) return;

    if (aiMode) {
      const userMsg = content;
      setContent("");
      setAiLoading(true);
      
      const response = await generateAIResponse(userMsg);
      const newMsg: Message = {
        id: "ai_" + Date.now(),
        userId: "ai-assistant",
        userName: "Colony AI",
        content: response,
        timestamp: Date.now(),
        triggeredBy: user.id
      };
      await db.saveMessage(newMsg);
      setAiLoading(false);
    } else {
      const currentContent = content;
      const currentMedia = pendingMedia;
      const currentLocalPreview = localMediaPreview;
      const currentVoice = pendingVoice;

      const msgId = "msg_" + Date.now();
      const isUploading = !!currentMedia || !!currentVoice;

      const optimisticMsg: Message & { isOptimistic?: boolean } = {
        id: msgId,
        userId: user.id,
        userName: user.name,
        content: currentContent,
        image: currentLocalPreview || "",
        voice: currentVoice ? URL.createObjectURL(currentVoice) : "",
        timestamp: Date.now(),
        isOptimistic: true,
        isUploadingMedia: isUploading
      };

      setOptimisticMessages(prev => [...prev, optimisticMsg]);
      
      setContent("");
      setPendingMedia(null);
      setLocalMediaPreview(null);
      setPendingVoice(null);

      try {
        const { isOptimistic, ...rest } = optimisticMsg;
        const dbMsg: Message = {
          ...rest,
          image: "",
          voice: ""
        };
        await db.saveMessage(dbMsg);

        if (isUploading) {
          (async () => {
            try {
              let mediaUrl = "";
              let voiceUrl = "";

              if (currentMedia) mediaUrl = await uploadFile(currentMedia, `chat/media/${msgId}_${Date.now()}`);
              if (currentVoice) voiceUrl = await uploadFile(currentVoice, `chat/voice/${msgId}_${Date.now()}`);

              const updatedMsg = {
                ...dbMsg,
                image: mediaUrl,
                voice: voiceUrl,
                isUploadingMedia: false
              };
              await db.updateMessage(updatedMsg);
            } catch (error) {
              console.error("Background send error:", error);
            } finally {
              setOptimisticMessages(prev => prev.filter(m => m.id !== msgId));
            }
          })();
        } else {
          setOptimisticMessages(prev => prev.filter(m => m.id !== msgId));
        }
      } catch (error) {
        console.error("Send error:", error);
        setOptimisticMessages(prev => prev.filter(m => m.id !== msgId));
      }
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await db.deleteMessage(id);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-[calc(100vh-160px)] flex flex-col"
    >
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tighter">Community Chat</h1>
          <div className={cn(
            "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border flex items-center gap-1",
            aiMode ? "bg-purple-500/20 border-purple-500/40 text-purple-400" : "bg-green-500/20 border-green-500/40 text-green-400"
          )}>
            {!aiMode && <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />}
            {aiMode ? "AI Mode" : "Live"}
          </div>
        </div>
        <button 
          onClick={() => setAiMode(!aiMode)}
          className={cn(
            "p-2 rounded-full transition-all",
            aiMode ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"
          )}
        >
          <Bot size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {[...messages.filter(m => !optimisticMessages.find(om => om.id === m.id)), ...optimisticMessages].sort((a, b) => a.timestamp - b.timestamp).map((msg) => {
          const isMe = msg.userId === user.id;
          const isAI = msg.userId === "ai-assistant";
          const canDelete = !msg.isOptimistic && (isMe || (isAI && msg.triggeredBy === user.id));
          
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={cn("flex flex-col", isMe ? "items-end" : "items-start", msg.isOptimistic && "opacity-70")}
              onContextMenu={(e) => {
                if (canDelete) e.preventDefault();
              }}
            >
              {!isMe && <p className="text-[9px] text-gray-500 ml-1 mb-0.5 font-bold uppercase tracking-widest">{msg.userName}</p>}
              <div className="relative group">
                <AnimatePresence>
                  {deletingId === msg.id && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl gap-2"
                    >
                      <button 
                        onClick={() => {
                          handleDeleteMessage(msg.id);
                          setDeletingId(null);
                        }}
                        className="bg-red-600 p-2 rounded-full text-white hover:bg-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => setDeletingId(null)}
                        className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20"
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <motion.div 
                  whileTap={canDelete ? { scale: 0.98 } : {}}
                  onPointerDown={() => {
                    if (!canDelete) return;
                    longPressTimer.current = setTimeout(() => {
                      setDeletingId(msg.id);
                    }, 600);
                  }}
                  onPointerUp={() => {
                    if (longPressTimer.current) clearTimeout(longPressTimer.current);
                  }}
                  onPointerLeave={() => {
                    if (longPressTimer.current) clearTimeout(longPressTimer.current);
                  }}
                  className={cn(
                    "max-w-[85%] p-3 rounded-2xl shadow-lg text-sm leading-relaxed space-y-2 cursor-pointer select-none relative",
                    isMe ? "bg-purple-600 text-white rounded-tr-none" : 
                    isAI ? "bg-purple-900/40 text-purple-100 rounded-tl-none border border-purple-500/30" :
                    "bg-white/10 text-gray-200 rounded-tl-none border border-white/10"
                  )}
                >
                  {msg.isOptimistic && (
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2">
                      <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {msg.image && (
                    <div className="rounded-lg overflow-hidden border border-white/10">
                      {msg.image.endsWith('.mp4') || msg.image.endsWith('.mov') || msg.image.startsWith('blob:') ? (
                        <video src={msg.image} controls className="w-full max-h-60 object-cover" />
                      ) : (
                        <img src={msg.image} className="w-full max-h-60 object-cover" referrerPolicy="no-referrer" />
                      )}
                    </div>
                  )}
                  {msg.isUploadingMedia && !msg.image && (
                    <div className="rounded-lg overflow-hidden border border-white/10 w-48 h-32 bg-white/5 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2 text-purple-400">
                        <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] font-medium uppercase tracking-widest">Uploading...</span>
                      </div>
                    </div>
                  )}
                  {msg.voice && <VoicePlayer url={msg.voice} />}
                  {msg.content && <p>{msg.content}</p>}
                  <p className={cn("text-[8px] mt-1 opacity-50", isMe ? "text-right" : "text-left")}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
        {aiLoading && (
          <div className="flex items-center gap-2 text-purple-400 text-xs italic">
            <Bot size={14} className="animate-pulse" /> AI is thinking...
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="space-y-2 mt-4">
        {(pendingMedia || localMediaPreview) && (
          <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-purple-500/50 group">
            {localMediaPreview && (
              localMediaPreview.includes('video') || localMediaPreview.includes('mp4') ? (
                <video src={localMediaPreview} className="w-full h-full object-cover" />
              ) : (
                <img src={localMediaPreview} className="w-full h-full object-cover" />
              )
            )}
            <button 
              onClick={() => {
                setPendingMedia(null);
                setLocalMediaPreview(null);
              }} 
              className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12}/>
            </button>
          </div>
        )}
        {pendingVoice && (
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 w-fit">
            <VoicePlayer url={URL.createObjectURL(pendingVoice)} />
            <button onClick={() => setPendingVoice(null)} className="text-gray-500 hover:text-red-400"><X size={14}/></button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2 items-center">
          <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 focus-within:border-purple-500/50 transition-all">
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept="image/*,video/*" 
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <ImageIcon size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Gallery</span>
            </button>
            <label className="text-gray-400 hover:text-pink-400 transition-colors flex items-center gap-1 cursor-pointer">
              <Camera size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Camera</span>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*,video/*" 
                capture="environment"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} 
              />
            </label>
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handlePaste}
              placeholder={aiMode ? "Ask AI anything..." : "Message community..."}
              className="flex-1 bg-transparent border-none focus:outline-none text-sm"
            />
            <VoiceRecorder onRecordingComplete={handleVoiceUpload} />
          </div>
          <button 
            type="submit" 
            className="bg-purple-600 hover:bg-purple-500 p-3 rounded-full transition-all shadow-lg shadow-purple-500/20"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </motion.div>
  );
};

const MapTab = ({ user }: { user: User }) => {
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [aiGuide, setAiGuide] = useState<string | null>(null);
  const [loadingGuide, setLoadingGuide] = useState(false);
  const [isLiveEnabled, setIsLiveEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [otherUsers, setOtherUsers] = useState<{ [key: string]: any }>({});
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (isLiveEnabled) {
      if ("geolocation" in navigator) {
        watchId.current = window.navigator.geolocation.watchPosition(
          async (position) => {
            const loc = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setCurrentLocation(loc);
            try {
              await db.saveLocation(user.id, {
                lat: loc.lat,
                lng: loc.lng,
                timestamp: Date.now(),
                userName: user.name,
                userAvatar: user.avatar
              } as any);
            } catch (error) {
              console.error("Location update failed:", error);
            }
          },
          (error) => console.error("Geolocation error:", error),
          { enableHighAccuracy: true }
        );
      }
    } else {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    }

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [isLiveEnabled, user]);

  useEffect(() => {
    const unsubLocations = db.subscribeLocations((allLocations) => {
      const users: { [key: string]: any } = {};
      Object.entries(allLocations).forEach(([userId, data]: [string, any]) => {
        if (userId !== user.id && Date.now() - data.timestamp < 300000) { // Only show active users (last 5 mins)
          users[userId] = data;
        }
      });
      setOtherUsers(users);
    });

    return () => unsubLocations();
  }, [user.id]);

  const locations = [
    { id: 1, name: "Colony Main Gate", lat: 12.9716, lng: 77.5946, type: "gate" },
    { id: 2, name: "Community Center", lat: 12.9720, lng: 77.5950, type: "amenity" },
    { id: 3, name: "Central Park", lat: 12.9710, lng: 77.5940, type: "park" },
  ];

  const center = currentLocation || {
    lat: 12.9716,
    lng: 77.5946
  };

  const handleEmergency = async (type: string) => {
    // Initiate phone call
    const numbers: any = {
      'Women Safety': '181',
      'Fire': '112',
      'Medical': '112'
    };
    
    if (numbers[type]) {
      window.location.href = `tel:${numbers[type]}`;
    }

    setLoadingGuide(true);
    const guide = await generateAIResponse(`Provide a 3-step emergency guide for: ${type}. Keep it very concise.`, "You are an emergency response expert.");
    setAiGuide(guide || "Stay calm and call emergency services immediately.");
    setLoadingGuide(false);
  };

  const openBooking = (app: string) => {
    const urls: any = {
      uber: "https://m.uber.com",
      rapido: "https://www.rapido.bike"
    };
    setBookingUrl(urls[app]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-[calc(100vh-160px)] flex flex-col gap-4 relative"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tighter">Colony Map</h1>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
          <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Live Location</span>
          <button 
            onClick={() => setIsLiveEnabled(!isLiveEnabled)}
            className={cn(
              "w-10 h-5 rounded-full relative transition-colors",
              isLiveEnabled ? "bg-purple-600" : "bg-gray-700"
            )}
          >
            <motion.div 
              animate={{ x: isLiveEnabled ? 20 : 2 }}
              className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-md"
            />
          </button>
        </div>
      </div>

      <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.google.com/intl/en_us/help/terms_maps/">Google Maps</a>'
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          />
          
          {locations.map(loc => (
            <Marker 
              key={loc.id} 
              position={[loc.lat, loc.lng]}
              eventHandlers={{
                click: () => setSelectedLocation(loc),
              }}
            />
          ))}

          {currentLocation && (
            <Marker 
              position={[currentLocation.lat, currentLocation.lng]}
              icon={L.divIcon({
                className: 'custom-div-icon',
                html: "<div style='background-color:#a855f7;width:14px;height:14px;border-radius:50%;border:2px solid white;'></div>",
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              })}
            />
          )}

          {Object.values(otherUsers).map((u: any) => {
            const lat = u.lat ?? u.location?.lat;
            const lng = u.lng ?? u.location?.lng;
            if (lat === undefined || lng === undefined) return null;
            return (
              <Marker 
                key={u.userId || u.id}
                position={[lat, lng]}
                icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style='background-color:rgba(0,0,0,0.5);color:white;padding:2px 4px;border-radius:4px;font-size:10px;font-weight:bold;white-space:nowrap;'>${u.userName || 'User'}</div>`,
                  iconAnchor: [0, 0]
                })}
              />
            );
          })}
        </MapContainer>

        {/* Floating Ride Buttons */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button 
            onClick={() => openBooking('uber')}
            className="w-12 h-12 bg-black border border-white/20 rounded-full flex items-center justify-center shadow-xl hover:bg-white/10 transition-all group"
            title="Book Uber"
          >
            <span className="text-white font-black text-xl group-hover:scale-110 transition-transform">U</span>
          </button>
          <button 
            onClick={() => openBooking('rapido')}
            className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center shadow-xl hover:bg-yellow-400 transition-all group"
            title="Book Rapido"
          >
            <span className="text-black font-black text-xl group-hover:scale-110 transition-transform">R</span>
          </button>
        </div>
        
        {selectedLocation && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl z-20"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm">{selectedLocation.name}</h3>
                <p className="text-[10px] text-gray-400">Coordinates: {selectedLocation.lat}, {selectedLocation.lng}</p>
              </div>
              <button onClick={() => setSelectedLocation(null)} className="text-gray-500"><X size={14}/></button>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => openBooking('uber')} className="flex-1 bg-black border border-white/20 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
                Book Uber
              </button>
              <button onClick={() => openBooking('rapido')} className="flex-1 bg-yellow-500 text-black py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors">
                Book Rapido
              </button>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {bookingUrl && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 z-50 bg-white flex flex-col"
            >
              <div className="bg-black text-white p-3 flex items-center shadow-md z-10">
                <button 
                  onClick={() => setBookingUrl(null)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to Map
                </button>
                <div className="flex-1 text-center font-bold text-sm mr-20">
                  {bookingUrl.includes('uber') ? 'Uber' : 'Rapido'}
                </div>
              </div>
              <iframe 
                src={bookingUrl} 
                className="w-full flex-1 border-none bg-white"
                title="Booking Service"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => handleEmergency('Women Safety')} className="bg-pink-600/10 hover:bg-pink-600/20 border border-pink-600/20 p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all">
          <ShieldAlert size={20} className="text-pink-500" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Women</span>
        </button>
        <button onClick={() => handleEmergency('Fire')} className="bg-orange-600/10 hover:bg-orange-600/20 border border-orange-600/20 p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all">
          <Flame size={20} className="text-orange-500" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Fire</span>
        </button>
        <button onClick={() => handleEmergency('Medical')} className="bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all">
          <Ambulance size={20} className="text-red-500" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Medical</span>
        </button>
      </div>

      <AnimatePresence>
        {aiGuide && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <GlassCard className="p-4 border-red-500/20 bg-red-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold flex items-center gap-2 text-red-400">
                  <Bot size={14} /> AI Emergency Guide
                </h3>
                <button onClick={() => setAiGuide(null)} className="text-gray-500"><X size={14}/></button>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{aiGuide}</p>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const QRModal = ({ url, onClose }: { url: string, onClose: () => void }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-zinc-900 border border-white/10 p-8 rounded-3xl flex flex-col items-center gap-6 max-w-xs w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-white p-4 rounded-2xl">
          <QRCodeSVG value={window.location.origin} size={200} />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold">Hackathon App Link</h3>
          <p className="text-xs text-gray-400">Scan or copy the link to open ColonyConnect</p>
        </div>
        <div className="w-full space-y-2">
          <button 
            onClick={handleCopy}
            className={cn(
              "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
              copied ? "bg-green-600 text-white" : "bg-purple-600 text-white hover:bg-purple-500"
            )}
          >
            {copied ? <Check size={18} /> : <ExternalLink size={18} />}
            {copied ? "Link Copied!" : "Copy App Link"}
          </button>
          <button onClick={onClose} className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-xl font-bold transition-colors">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ProfileTab = ({ user, setUser, posts, onLogout, setWallpaper }: { user: User, setUser: any, posts: Post[], onLogout: any, setWallpaper: any }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || "");
  const [website, setWebsite] = useState(user.website || "");
  const [showQR, setShowQR] = useState(false);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    try {
      const updated = { ...user, name, bio, website };
      await db.saveUser(updated);
      setUser(updated);
      setEditing(false);
    } catch (error) {
      console.error("Profile update failed:", error);
    }
  };

  const handleWallpaperChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await db.uploadFile(file, `wallpapers/${user.id}_${Date.now()}`);
      setWallpaper(url);
      localStorage.setItem("colony_wallpaper", url);
    } catch (error) {
      console.error("Wallpaper upload failed:", error);
    }
  };

  const generateAIBio = async () => {
    setIsGeneratingBio(true);
    try {
      const prompt = `Generate a short, professional, and friendly bio for a community app. Name: ${name}. Current bio: ${bio}. Interests: Community building, local events. Keep it under 150 characters.`;
      const suggestion = await generateAIResponse(prompt);
      setBio(suggestion);
    } catch (error) {
      console.error("AI Bio Error:", error);
    } finally {
      setIsGeneratingBio(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await db.uploadFile(file, `avatars/${user.id}_${Date.now()}`);
      const updated = { ...user, avatar: url };
      await db.saveUser(updated);
      setUser(updated);
    } catch (error) {
      console.error("Avatar upload failed:", error);
    }
  };

  const myPosts = posts.filter(p => p.userId === user.id);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative group">
          <img src={user.avatar} className="w-32 h-32 rounded-full border-4 border-purple-500/20 p-1 object-cover" referrerPolicy="no-referrer" />
          <label className="absolute bottom-0 right-0 bg-purple-600 p-2 rounded-full cursor-pointer hover:bg-purple-500 transition-colors shadow-lg">
            <Camera size={18} />
            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
          </label>
        </div>
        
        {editing ? (
          <div className="w-full space-y-4">
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-center text-xl font-bold" />
            <div className="relative">
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-center text-sm resize-none min-h-[100px]" />
              <button 
                onClick={generateAIBio}
                disabled={isGeneratingBio}
                className="absolute bottom-3 right-3 p-2 bg-purple-600/20 hover:bg-purple-600/40 rounded-lg text-purple-400 transition-all disabled:opacity-50"
                title="Generate AI Bio"
              >
                <Bot size={16} className={isGeneratingBio ? "animate-pulse" : ""} />
              </button>
            </div>
            <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="Website URL" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-center text-sm" />
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 bg-green-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Check size={18}/> Save</button>
              <button onClick={() => setEditing(false)} className="flex-1 bg-white/5 py-3 rounded-xl font-bold flex items-center justify-center gap-2"><X size={18}/> Cancel</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter">{user.name}</h2>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">{user.bio || "No bio yet."}</p>
            {user.website && (
              <a href={user.website} target="_blank" className="text-purple-400 text-sm flex items-center justify-center gap-1 hover:underline">
                <ExternalLink size={14} /> {user.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <div className="flex flex-wrap gap-3 justify-center pt-4">
              <button onClick={() => setEditing(true)} className="bg-white/5 hover:bg-white/10 px-5 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-2">
                <Edit2 size={14} /> Edit Profile
              </button>
              <button 
                onClick={() => wallpaperInputRef.current?.click()}
                className="bg-white/5 hover:bg-white/10 px-5 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-2"
              >
                <ImageIcon size={14} /> Wallpaper
                <input type="file" className="hidden" ref={wallpaperInputRef} accept="image/*" onChange={handleWallpaperChange} />
              </button>
              <button onClick={() => setShowQR(true)} className="bg-purple-600 hover:bg-purple-500 px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20">
                <QrCode size={14} /> Share App
              </button>
              <a 
                href={window.location.origin} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/5 hover:bg-white/10 px-5 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-2"
              >
                <Globe size={14} /> Visit Website
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold">{myPosts.length}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">My Posts</p>
        </GlassCard>
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-bold">My Recent Posts</h3>
        <div className="space-y-4">
          {myPosts.length > 0 ? myPosts.map(post => (
            <GlassCard key={post.id} className="p-4 flex gap-4 items-center">
              {post.image && <img src={post.image} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 line-clamp-2">{post.content}</p>
                <p className="text-[10px] text-gray-500 mt-1">{formatDistanceToNow(new Date(post.timestamp))} ago</p>
              </div>
            </GlassCard>
          )) : (
            <p className="text-center text-gray-500 text-sm py-8">No posts yet.</p>
          )}
        </div>
      </section>

      <button onClick={onLogout} className="w-full bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 text-red-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
        <LogOut size={18} /> Logout
      </button>

      <AnimatePresence>
        {showQR && <QRModal url={window.location.origin} onClose={() => setShowQR(false)} />}
      </AnimatePresence>
    </motion.div>
  );
};

// --- Auth Component ---

const Auth = ({ onAuth }: { onAuth: any }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      const userDoc = await db.getUser(firebaseUser.uid);
      if (!userDoc) {
        const newUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`
        };
        await db.saveUser(newUser);
      }
    } catch (err: any) {
      setError(err.message || "Google login failed.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const newUser: User = {
          id: result.user.uid,
          name: name || email.split('@')[0],
          email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.user.uid}`
        };
        await db.saveUser(newUser);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError("Email/Password login is not enabled. Please use Google Login or enable it in your Firebase Console.");
      } else {
        setError(err.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <FloatingOrbs />
      <GlassCard className="w-full max-w-md p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter">Colony<span className="text-purple-500">Connect</span></h1>
          <p className="text-gray-400">{isLogin ? "Welcome back, neighbor." : "Join your community today."}</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center w-full">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white text-black hover:bg-gray-200 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-purple-500/50"
                required
              />
            )}
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-purple-500/50"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-purple-500/50"
              required
            />
            {error && <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest text-center">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 py-4 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50">
              {loading ? "Processing..." : (isLogin ? "Login" : "Register")}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400">
          {isLogin ? "New here?" : "Already have an account?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-purple-400 font-bold hover:underline">
            {isLogin ? "Create account" : "Login now"}
          </button>
        </p>
      </GlassCard>
    </div>
  );
};
