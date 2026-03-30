export interface User {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatar?: string;
  website?: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  image?: string;
  voice?: string;
  timestamp: number;
  likes: string[]; // User IDs
  comments: Comment[];
  isUploadingMedia?: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  image?: string;
  voice?: string;
  timestamp: number;
  triggeredBy?: string;
  isUploadingMedia?: boolean;
}
