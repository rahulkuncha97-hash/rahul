import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from './firebase';
import { User, Post, Message } from './types';

// Helper to compress images before upload
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimensions
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.7 quality
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original if compression fails
          }
        }, 'image/jpeg', 0.7);
      };
      img.onerror = () => resolve(file); // Fallback to original on error
    };
    reader.onerror = () => resolve(file); // Fallback to original on error
  });
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const fbDb = {
  async getPosts(): Promise<Post[]> {
    try {
      const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Post);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      return [];
    }
  },
  subscribePosts(callback: (posts: Post[]) => void) {
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as Post));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });
  },
  async savePost(post: Post): Promise<void> {
    try {
      await setDoc(doc(db, 'posts', post.id), post);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${post.id}`);
    }
  },
  async updatePost(updatedPost: Post): Promise<void> {
    try {
      await updateDoc(doc(db, 'posts', updatedPost.id), updatedPost as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${updatedPost.id}`);
    }
  },
  async deletePost(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'posts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${id}`);
    }
  },

  async getMessages(): Promise<Message[]> {
    try {
      const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Message);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'messages');
      return [];
    }
  },
  subscribeMessages(callback: (messages: Message[]) => void) {
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as Message));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });
  },
  async saveMessage(message: Message): Promise<void> {
    try {
      await setDoc(doc(db, 'messages', message.id), message);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `messages/${message.id}`);
    }
  },
  async updateMessage(updatedMessage: Message): Promise<void> {
    try {
      await updateDoc(doc(db, 'messages', updatedMessage.id), updatedMessage as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `messages/${updatedMessage.id}`);
    }
  },
  async deleteMessage(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'messages', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `messages/${id}`);
    }
  },

  async getUser(id: string): Promise<User | null> {
    try {
      const docSnap = await getDoc(doc(db, 'users', id));
      return docSnap.exists() ? (docSnap.data() as User) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${id}`);
      return null;
    }
  },
  async saveUser(user: User): Promise<void> {
    try {
      await setDoc(doc(db, 'users', user.id), user);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
    }
  },

  async getLocations(): Promise<Record<string, { lat: number, lng: number, timestamp: number, userName: string, userAvatar: string }>> {
    try {
      const snapshot = await getDocs(collection(db, 'locations'));
      const locations: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        locations[doc.id] = doc.data();
      });
      return locations;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'locations');
      return {};
    }
  },
  subscribeLocations(callback: (locations: Record<string, any>) => void) {
    return onSnapshot(collection(db, 'locations'), (snapshot) => {
      const locations: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        locations[doc.id] = doc.data();
      });
      callback(locations);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'locations');
    });
  },
  async saveLocation(userId: string, location: any): Promise<void> {
    try {
      await setDoc(doc(db, 'locations', userId), { ...location, id: userId, userId });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `locations/${userId}`);
    }
  },

  async uploadFile(file: File, path: string): Promise<string> {
    // Compress image if it's an image file
    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
      try {
        const compressedFile = await compressImage(file);
        fileToUpload = compressedFile;
      } catch (e) {
        console.warn('Image compression failed, uploading original', e);
      }
    }

    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, fileToUpload);
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
