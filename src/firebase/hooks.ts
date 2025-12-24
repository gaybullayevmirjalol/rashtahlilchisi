'use client';

import { useContext, useState, useEffect, useMemo, DependencyList } from 'react';
import { FirebaseContext, UserContext } from './provider';
import {
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  DocumentSnapshot,
  CollectionReference,
  Query as FirestoreQuery,
  DocumentReference,
  onSnapshot,
  addDoc
} from 'firebase/firestore';

// =================================================================
// HOOKS
// =================================================================

// --- Service Hooks ---
export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useAuth = () => useFirebase()?.auth;
export const useFirestore = () => useFirebase()?.firestore;

// --- User Hook ---
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider.');
  }
  return context;
};

// --- Firestore Data Hooks ---
export interface WithId<T> {
  id: string;
}

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | null;
}

export function useCollection<T = any>(
  memoizedTargetRefOrQuery:
    | CollectionReference<DocumentData>
    | FirestoreQuery<DocumentData>
    | null
    | undefined
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: WithId<T>[] = snapshot.docs.map((doc) => ({
          ...(doc.data() as T),
          id: doc.id,
        }));
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        console.error(`useCollection error:`, error);
        setError(error);
        setData(null);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]);

  return { data, isLoading, error };
}

export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: FirestoreError | null;
}

export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined
): UseDocResult<T> {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    const unsubscribe = onSnapshot(
      memoizedDocRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id });
        } else {
          setData(null);
        }
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        console.error(`useDoc error for path ${memoizedDocRef.path}:`, error);
        setError(error);
        setData(null);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [memoizedDocRef]);

  return { data, isLoading, error };
}

// --- Memoization Hook ---
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}
