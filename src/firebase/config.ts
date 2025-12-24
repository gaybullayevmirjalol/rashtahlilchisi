import { FirebaseApp, initializeApp, getApps, getApp } from 'firebase/app';

const firebaseConfigOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigValid = !!(
  firebaseConfigOptions.apiKey &&
  firebaseConfigOptions.authDomain &&
  firebaseConfigOptions.projectId
);

function initializeFirebaseApp(): FirebaseApp {
    if (getApps().length) {
        return getApp();
    }
    return initializeApp(firebaseConfigOptions);
}

export const app: FirebaseApp = isFirebaseConfigValid ? initializeFirebaseApp() : {} as FirebaseApp;
