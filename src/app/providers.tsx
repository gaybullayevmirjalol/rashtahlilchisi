'use client';

import { FirebaseProvider } from '@/firebase/provider';
import React from 'react';

// This component wraps the FirebaseProvider and is marked as a client component.
// This is the correct way to use a client-side provider within a server component layout.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseProvider>
      {children}
    </FirebaseProvider>
  );
}
