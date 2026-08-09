import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC1oenC7Iv2MmIJzBQi9bPfFpABABb7PSo",
  authDomain: "yangiyer-taksi.firebaseapp.com",
  projectId: "yangiyer-taksi",
  storageBucket: "yangiyer-taksi.firebasestorage.app",
  messagingSenderId: "196999224608",
  appId: "1:196999224608:web:00de0a007e5cac277ecb45",
  measurementId: "G-5XS6E435XY"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
