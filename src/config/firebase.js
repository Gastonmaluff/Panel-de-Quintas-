import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyDmCunjI_X-n8gMcrFbRM3OwDJ6uSHA4kw",
  authDomain: "panel-de-quintas.firebaseapp.com",
  projectId: "panel-de-quintas",
  storageBucket: "panel-de-quintas.firebasestorage.app",
  messagingSenderId: "1021111329358",
  appId: "1:1021111329358:web:c4f95f2f87f720c2b4991f",
  measurementId: "G-FJKBJTHSCC",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
