'use client';

import { cn } from "@/lib/utils";
import Image from 'next/image';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { doc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import type { SiteSettings } from '@/types';


export function Logo({ className }: { className?: string }) {
  const firestore = useFirestore();
  
  const settingsDocRef = useMemoFirebase(() => {
    // firestore might not be initialized on first render, so we check
    if (!firestore) return null;
    return doc(firestore, `siteSettings/global`);
  }, [firestore]);

  const { data: siteSettings, isLoading: isSettingsLoading } = useDoc<SiteSettings>(settingsDocRef);
  
  const logoUrl = siteSettings?.logoUrl;

  if (isSettingsLoading) {
      return <Skeleton className={cn("h-12 w-12 rounded-lg", className)} />;
  }

  return (
    <div
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-lg overflow-hidden bg-muted",
        className
      )}
    >
      {logoUrl ? (
        <Image 
          src={logoUrl} 
          alt="RashExam Logotipi" 
          width={48} 
          height={48} 
          className="h-full w-full object-cover"
        />
      ) : (
         <span className="text-xs text-muted-foreground">Logo</span>
      )}
    </div>
  );
}
