/**
 * Firebase shell — wired but inactive by default.
 *
 * To activate Firebase Auth as the primary provider:
 *   1. Add your Firebase web config to .env (see .env.example below).
 *   2. `npm install firebase`
 *   3. Uncomment the `initializeApp` block.
 *   4. The exported `firebase` object will become non-null. AuthContext
 *      will detect it and prefer Firebase over Lovable Cloud Auth.
 *
 * Required env vars:
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_APP_ID
 *
 * NOTE: While inactive, the entire backend (listings, transactions,
 * encrypted credentials) continues to run on Lovable Cloud / Supabase.
 * Swapping to Firebase requires also rebuilding the database layer —
 * this shell only handles the auth side.
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured =
  !!config.apiKey && !!config.authDomain && !!config.projectId && !!config.appId;

// Stub. Replace this entire block once `firebase` is installed:
//
//   import { initializeApp } from "firebase/app";
//   import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
//   const app = firebaseConfigured ? initializeApp(config) : null;
//   export const firebase = app
//     ? {
//         auth: getAuth(app),
//         google: new GoogleAuthProvider(),
//         signInWithGoogle: () => signInWithPopup(getAuth(app), new GoogleAuthProvider()),
//         signOut: () => signOut(getAuth(app)),
//       }
//     : null;

export const firebase = null as null | {
  signInWithGoogle: () => Promise<unknown>;
  signOut: () => Promise<void>;
};
