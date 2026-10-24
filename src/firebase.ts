// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import type { Analytics } from "firebase/analytics";
/*
<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyBHMTgIEvoERMDmL9C8WW7ananmi7EE4Fs",
    authDomain: "nutrilens-5a81b.firebaseapp.com",
    projectId: "nutrilens-5a81b",
    storageBucket: "nutrilens-5a81b.firebasestorage.app",
    messagingSenderId: "253329617311",
    appId: "1:253329617311:web:340a7bbbb7be86d3704daa",
    measurementId: "G-03J347X4ER"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
*/

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHMTgIEvoERMDmL9C8WW7ananmi7EE4Fs",
  authDomain: "nutrilens-5a81b.firebaseapp.com",
  projectId: "nutrilens-5a81b",
  storageBucket: "nutrilens-5a81b.firebasestorage.app",
  messagingSenderId: "253329617311",
  appId: "1:253329617311:web:340a7bbbb7be86d3704daa",
  measurementId: "G-03J347X4ER",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Auth, Firestore, Storage
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Export auth helpers
export const googleProvider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);

// Analytics only works in browser environments (not SSR / Node)
export let analytics: Analytics | null = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export default app;
