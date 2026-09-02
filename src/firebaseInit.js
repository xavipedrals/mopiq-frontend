import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDOZJJ4okDK--j4iZHzx750S6rCt8BQ0mc",
  authDomain: "anki-e894e.firebaseapp.com",
  projectId: "anki-e894e",
  storageBucket: "anki-e894e.appspot.com",
  messagingSenderId: "995730459038",
  appId: "1:995730459038:web:8e52f6512435b7e6056e8f",
  measurementId: "G-HKWN8CG2E8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const functions = getFunctions(app, 'us-central1');

export { app, db, storage, auth, functions };
