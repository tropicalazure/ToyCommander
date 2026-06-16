import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missingKeys.length > 0) {
  console.warn(
    `[Firebase] Missing config values: ${missingKeys.join(', ')}. ` +
    `Check that the NEXT_PUBLIC_FIREBASE_* env vars are set — RTDB calls will fail otherwise.`
  );
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
// Ensure the databaseURL is explicitly passed to getDatabase
const rtdb = getDatabase(app, firebaseConfig.databaseURL);

export { rtdb };
