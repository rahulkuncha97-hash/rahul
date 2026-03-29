import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { User, Post, Message } from './types';

export const fbDb = {
  async getPosts(): Promise<Post[]> {
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Post);
  },
  subscribePosts(callback: (posts: Post[]) => void) {
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as Post));
    });
  },
  async savePost(post: Post): Promise<void> {
    await setDoc(doc(db, 'posts', post.id), post);
  },
  async updatePost(updatedPost: Post): Promise<void> {
    await updateDoc(doc(db, 'posts', updatedPost.id), updatedPost as any);
  },
  async deletePost(id: string): Promise<void> {
    await deleteDoc(doc(db, 'posts', id));
  },

  async getMessages(): Promise<Message[]> {
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Message);
  },
  subscribeMessages(callback: (messages: Message[]) => void) {
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as Message));
    });
  },
  async saveMessage(message: Message): Promise<void> {
    await setDoc(doc(db, 'messages', message.id), message);
  },
  async deleteMessage(id: string): Promise<void> {
    await deleteDoc(doc(db, 'messages', id));
  },

  async getUser(id: string): Promise<User | null> {
    const docSnap = await getDoc(doc(db, 'users', id));
    return docSnap.exists() ? (docSnap.data() as User) : null;
  },
  async saveUser(user: User): Promise<void> {
    await setDoc(doc(db, 'users', user.id), user);
  },

  async getLocations(): Promise<Record<string, { lat: number, lng: number, timestamp: number, userName: string, userAvatar: string }>> {
    const snapshot = await getDocs(collection(db, 'locations'));
    const locations: Record<string, any> = {};
    snapshot.docs.forEach(doc => {
      locations[doc.id] = doc.data();
    });
    return locations;
  },
  subscribeLocations(callback: (locations: Record<string, any>) => void) {
    return onSnapshot(collection(db, 'locations'), (snapshot) => {
      const locations: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        locations[doc.id] = doc.data();
      });
      callback(locations);
    });
  },
  async saveLocation(userId: string, location: any): Promise<void> {
    await setDoc(doc(db, 'locations', userId), { ...location, id: userId, userId });
  },

  async uploadFile(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
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
