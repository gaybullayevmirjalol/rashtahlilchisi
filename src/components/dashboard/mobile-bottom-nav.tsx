'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '../ui/sidebar';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/types';


const mainMenuItems = [
  { href: '/dashboard', label: 'Boshqaruv', icon: LayoutDashboard },
  { href: '/dashboard/tests', label: 'Testlar', icon: FileText },
  { href: '/dashboard/students', label: 'Talabalar', icon: Users },
  { href: '/dashboard/scan', label: 'Skanerlash', icon: Camera },
  { href: '/dashboard/groups', label: 'Guruhlar', icon: Users },
];


export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileDocRef);

  const menuItems = mainMenuItems;
  
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t md:hidden">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex flex-col items-center justify-center px-2 text-muted-foreground hover:bg-muted/50",
                isActive && "text-primary"
              )}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] text-center">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  );
}
