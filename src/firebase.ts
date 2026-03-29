import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Import the Firebase configuration
import config from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || config.apiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || config.authDomain,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || config.projectId,
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || config.storageBucket,
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || config.messagingSenderId,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || config.appId,
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string) || config.measurementId,
};

const databaseId = (import.meta.env.VITE_FIREBASE_DATABASE_ID as string) || config.firestoreDatabaseId;

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
