import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB120Pzio7zzsU0SvjvfYSWzDWS_u9IB9Q",
  authDomain: "pathfinder-6ae80.firebaseapp.com",
  projectId: "pathfinder-6ae80",
  storageBucket: "pathfinder-6ae80.firebasestorage.app",
  messagingSenderId: "946236335566",
  appId: "1:946236335566:web:c9a2690f5d5808b502379f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
