import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAuigYOf4q-piuPvpP3L4_RlMjbF6NX8IA",
  authDomain: "opensourcery-website-backend.firebaseapp.com",
  projectId: "opensourcery-website-backend",
  storageBucket: "opensourcery-website-backend.firebasestorage.app",
  messagingSenderId: "122874880770",
  appId: "1:122874880770:web:6f59ec5fcb12b57a9c981b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };