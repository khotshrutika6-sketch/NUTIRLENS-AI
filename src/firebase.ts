// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import type { Analytics } from "firebase/analytics";
import { firebaseConfig } from "../shared/firebase-config.js";

// Your web app's Firebase configuration
// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Auth, Firestore, Storage
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Export auth helpers
export const googleProvider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email.trim(), password);
export const signUpWithEmail = (email: string, password: string) => createUserWithEmailAndPassword(auth, email.trim(), password);

// Analytics only works in browser environments (not SSR / Node)
export let analytics: Analytics | null = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export default app;
