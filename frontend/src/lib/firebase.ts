'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// Firebase web config. These values are safe to expose in client code.
// They can be overridden with NEXT_PUBLIC_* env vars on Vercel.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCrzoJDf-wAREVvsgJb6V4u-VfR4jyaizs',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'mordenshopauth.firebaseapp.com',
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    'https://mordenshopauth-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mordenshopauth',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'mordenshopauth.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '478114959110',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:478114959110:web:6bc07686cfadc4fa659887',
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

/** Lazily initialise Firebase (browser only) and return the Auth instance. */
export function getFirebaseAuth(): Auth {
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  if (!auth) auth = getAuth(app);
  return auth;
}

/** The email that is treated as the store administrator. */
export const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'rexoagency.in@gmail.com'
).toLowerCase();

/** Convert a Firebase auth error into a friendly, user-facing message. */
export function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Invalid email or password',
    'auth/wrong-password': 'Invalid email or password',
    'auth/user-not-found': 'No account found with this email',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/invalid-email': 'Please enter a valid email address',
    'auth/missing-password': 'Please enter your password',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled',
    'auth/cancelled-popup-request': 'Google sign-in was cancelled',
    'auth/popup-blocked': 'Popup was blocked — allow popups and try again',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Check your connection',
    'auth/operation-not-allowed':
      'This sign-in method is not enabled. Enable it in the Firebase console.',
    'auth/user-disabled': 'This account has been disabled',
    'auth/requires-recent-login': 'Please log out and log in again, then retry this change',
    'auth/unauthorized-domain':
      'This domain is not authorised in Firebase. Add it under Authentication → Settings → Authorized domains.',
  };
  return map[code] || (e as Error)?.message?.replace(/^Firebase:\s*/, '') || 'Something went wrong';
}
