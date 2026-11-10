// Cloud layer: Firebase Authentication (login) + Firestore (one document per user).
// Loaded as an ES module so it can import the Firebase SDK from Google's CDN.
// If this file fails to load (no internet the first time), the app keeps working offline.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, runTransaction, onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const cfg = window.FIREBASE_CONFIG || {};
const configured = !!cfg.apiKey && !/^PASTE/.test(cfg.apiKey);
const Cloud = { configured };

function parse(snapData) {
  try { return JSON.parse((snapData && snapData.blob) || "{}") || {}; } catch (e) { return {}; }
}

if (configured) {
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const ref = (uid) => doc(db, "users", uid);

  Cloud.onAuth = (cb) => onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null));
  Cloud.signIn = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
  Cloud.signUp = (email, pw) => createUserWithEmailAndPassword(auth, email, pw);
  Cloud.google = () => signInWithPopup(auth, new GoogleAuthProvider());
  Cloud.reset = (email) => sendPasswordResetEmail(auth, email);
  Cloud.signOut = () => signOut(auth);

  // Read the cloud copy, merge it with ours (newest change per item wins), write it back, return the result.
  Cloud.push = (uid, items) =>
    runTransaction(db, async (tx) => {
      const snap = await tx.get(ref(uid));
      const merged = window.mergeItems(snap.exists() ? parse(snap.data()) : {}, items);
      tx.set(ref(uid), { blob: JSON.stringify(merged), updatedAt: Date.now() });
      return merged;
    });

  // Live updates (e.g. you marked something on your laptop and the phone is open)
  Cloud.subscribe = (uid, cb, onErr) =>
    onSnapshot(
      ref(uid),
      (snap) => { if (!snap.metadata.hasPendingWrites) cb(snap.exists() ? parse(snap.data()) : {}); },
      onErr
    );
}

window.Cloud = Cloud;
window.dispatchEvent(new Event("cloud-ready"));
