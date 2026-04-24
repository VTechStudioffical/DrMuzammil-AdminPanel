// Firebase client SDK initialization.
// Uses Vite environment variables from .env / Vercel settings.

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ??
    "AIzaSyBrdsYmdptoHxL9GToc6Cts_ghV4kz-3N4",

  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ??
    "drmuzammilwebapplication.firebaseapp.com",

  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "drmuzammilwebapplication",

  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ??
    "drmuzammilwebapplication.firebasestorage.app",

  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "273188107454",

  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ??
    "1:273188107454:web:b1d4677d8fe7d915635aef",
};

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function getApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export const getFirebaseAuth = (): Auth => {
  if (!_auth) {
    _auth = getAuth(getApp());
  }
  return _auth;
};

export const getDb = (): Firestore => {
  if (!_db) {
    _db = getFirestore(getApp());
  }
  return _db;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!_storage) {
    _storage = getStorage(getApp());
  }
  return _storage;
};

export const isFirebaseConfigured = (): boolean =>
  Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
  );
