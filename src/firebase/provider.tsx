'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { app, isFirebaseConfigValid } from './config';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

// =================================================================
// CONTEXTS
// =================================================================
export interface FirebaseContextValue {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
}
export const FirebaseContext = createContext<FirebaseContextValue>({
  app: null,
  auth: null,
  firestore: null,
});

export interface UserContextValue {
  user: User | null;
  isUserLoading: boolean;
}
export const UserContext = createContext<UserContextValue>({
  user: null,
  isUserLoading: true,
});

// =================================================================
// PROVIDER COMPONENT
// =================================================================
export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [firebaseServices, setFirebaseServices] = useState<FirebaseContextValue>({
    app: null,
    auth: null,
    firestore: null,
  });

  useEffect(() => {
    if (isFirebaseConfigValid) {
      const authInstance = getAuth(app);
      const firestoreInstance = getFirestore(app);
      setFirebaseServices({ app, auth: authInstance, firestore: firestoreInstance });

      const unsubscribe = onAuthStateChanged(authInstance, (user) => {
        setUser(user);
        setIsUserLoading(false);
      });

      return () => unsubscribe();
    } else {
      setIsUserLoading(false);
    }
  }, []);

  if (!isFirebaseConfigValid) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive">Xatolik: Firebase Sozlamalari Topilmadi!</h1>
        <p className="mt-2 max-w-lg text-muted-foreground">
          Ilova Firebase'ga ulanish uchun zarur bo'lgan konfiguratsiya ma'lumotlarini topa olmadi. Bu odatda <code>.env</code> fayli sozlanmaganida yuz beradi.
        </p>
        <div className="mt-6 max-w-lg rounded-md border bg-muted p-4 text-left">
            <h3 className="font-semibold text-foreground">Nima qilish kerak?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
                1. Firebase loyihangizdan veb-konfiguratsiya ma'lumotlaringizni nusxalab oling.
                <br/>
                2. Loyiha ildiz papkasida <code>.env</code> nomli fayl yarating.
                <br/>
                3. Ma'lumotlarni shu faylga quyidagi formatda joylashtiring (o'z qiymatlaringiz bilan almashtiring):
            </p>
            <pre className="mt-2 rounded-md bg-background p-2 text-xs text-foreground">
                <code>
                    NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...<br/>
                    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com<br/>
                    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id<br/>
                    ...
                </code>
            </pre>
        </div>
      </div>
    );
  }
  
  if (firebaseServices.auth === null) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <p>Firebase ulanmoqda...</p>
        </div>
      );
  }

  return (
    <FirebaseContext.Provider value={firebaseServices}>
      <UserContext.Provider value={{ user, isUserLoading }}>
        {children}
      </UserContext.Provider>
    </FirebaseContext.Provider>
  );
}
