import localforage from 'localforage';
import { User, Post, Message } from '../types';

localforage.config({
  name: 'ColonyConnectDB',
  storeName: 'colony_data'
});

export const db = {
  async getPosts(): Promise<Post[]> {
    const posts = await localforage.getItem<Post[]>('posts') || [];
    return posts.sort((a, b) => b.timestamp - a.timestamp);
  },
  async savePost(post: Post): Promise<void> {
    const posts = await this.getPosts();
    posts.push(post);
    await localforage.setItem('posts', posts);
  },
  async updatePost(updatedPost: Post): Promise<void> {
    const posts = await this.getPosts();
    const index = posts.findIndex(p => p.id === updatedPost.id);
    if (index !== -1) {
      posts[index] = updatedPost;
      await localforage.setItem('posts', posts);
    }
  },
  async deletePost(id: string): Promise<void> {
    const posts = await this.getPosts();
    await localforage.setItem('posts', posts.filter(p => p.id !== id));
  },

  async getMessages(): Promise<Message[]> {
    const messages = await localforage.getItem<Message[]>('messages') || [];
    return messages.sort((a, b) => a.timestamp - b.timestamp);
  },
  async saveMessage(message: Message): Promise<void> {
    const messages = await this.getMessages();
    messages.push(message);
    await localforage.setItem('messages', messages);
  },
  async deleteMessage(id: string): Promise<void> {
    const messages = await this.getMessages();
    await localforage.setItem('messages', messages.filter(m => m.id !== id));
  },

  async getUser(id: string): Promise<User | null> {
    const users = await localforage.getItem<Record<string, User>>('users') || {};
    return users[id] || null;
  },
  async saveUser(user: User): Promise<void> {
    const users = await localforage.getItem<Record<string, User>>('users') || {};
    users[user.id] = user;
    await localforage.setItem('users', users);
  },

  async getLocations(): Promise<Record<string, { lat: number, lng: number }>> {
    return await localforage.getItem('locations') || {};
  },
  async saveLocation(userId: string, location: { lat: number, lng: number }): Promise<void> {
    const locations = await this.getLocations();
    locations[userId] = location;
    await localforage.setItem('locations', locations);
  },

  async fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
};
