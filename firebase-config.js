// ============================================================
// FIREBASE CONFIG  (this is what turns on login + cloud sync)
// Steps are in README.md ("Part A: Firebase"). Paste the values from
// Firebase console > Project settings > Your apps > Web app > SDK setup and configuration.
// These values are NOT secret (they are public in every Firebase web app);
// your data is protected by the Firestore security rules, not by hiding this file.
// While apiKey still says PASTE_..., the app works normally but only saves on the phone.
// ============================================================
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCxhrkyNjtLwrvWLBmM92AWhvaRvTdD59M",
  authDomain: "bict-attendance.firebaseapp.com",
  projectId: "bict-attendance",
  appId: "1:797358894379:web:5c72585d82ec3b2d7c296e",
};
/*

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCxhrkyNjtLwrvWLBmM92AWhvaRvTdD59M",
  authDomain: "bict-attendance.firebaseapp.com",
  projectId: "bict-attendance",
  storageBucket: "bict-attendance.firebasestorage.app",
  messagingSenderId: "797358894379",
  appId: "1:797358894379:web:5c72585d82ec3b2d7c296e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);*/