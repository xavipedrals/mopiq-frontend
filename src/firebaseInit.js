// import { initializeApp } from 'firebase/app';
// import { getFirestore } from 'firebase/firestore';

// const app = initializeApp();
// const db = getFirestore(app);

// export default db;

// const myCollection = collection(db, 'shared-decks');
// getDocs(myCollection).then(snapshot => {
//   // Process snapshot
//   print(snapshot.docs.length);
// });

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDOZJJ4okDK--j4iZHzx750S6rCt8BQ0mc",
  authDomain: "anki-e894e.firebaseapp.com",
  projectId: "anki-e894e",
  storageBucket: "anki-e894e.appspot.com",
  messagingSenderId: "995730459038",
  appId: "1:995730459038:web:8e52f6512435b7e6056e8f",
  measurementId: "G-HKWN8CG2E8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export default db;