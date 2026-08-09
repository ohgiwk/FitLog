import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, browserLocalPersistence, getAuth, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore, initializeFirestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

/**
 * Firebaseの接続設定が入っているかを判定する
 */
export function isFirebaseConfigured() {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_APP_ID,
  );
}

/**
 * 設定済みの場合だけ Firebase クライアントを返す
 */
export function getFirebaseClient() {
  const apiKey =
    typeof import.meta.env.VITE_FIREBASE_API_KEY === 'string'
      ? import.meta.env.VITE_FIREBASE_API_KEY
      : '';
  const authDomain =
    typeof import.meta.env.VITE_FIREBASE_AUTH_DOMAIN === 'string'
      ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
      : '';
  const projectId =
    typeof import.meta.env.VITE_FIREBASE_PROJECT_ID === 'string'
      ? import.meta.env.VITE_FIREBASE_PROJECT_ID
      : '';
  const appId =
    typeof import.meta.env.VITE_FIREBASE_APP_ID === 'string'
      ? import.meta.env.VITE_FIREBASE_APP_ID
      : '';
  const storageBucket =
    typeof import.meta.env.VITE_FIREBASE_STORAGE_BUCKET === 'string'
      ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
      : undefined;
  const messagingSenderId =
    typeof import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID === 'string'
      ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
      : undefined;
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  if (!app) {
    app =
      getApps()[0] ??
      initializeApp({
        apiKey,
        authDomain,
        projectId,
        appId,
        storageBucket,
        messagingSenderId,
      });
    auth = Capacitor.isNativePlatform()
      ? initializeAuth(app, {
          persistence: browserLocalPersistence,
          popupRedirectResolver: undefined,
        })
      : getAuth(app);
    try {
      db = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        experimentalForceLongPolling: Capacitor.isNativePlatform(),
      });
    } catch {
      db = getFirestore(app);
    }
  }
  if (!auth || !db) return null;
  return { app, auth, db };
}
