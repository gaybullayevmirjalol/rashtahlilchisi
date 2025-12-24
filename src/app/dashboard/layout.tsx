'use client';

import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { useUser } from '@/firebase/hooks';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav';
import { useIsMobile } from '@/hooks/use-mobile';
import { AssistantButton } from '@/components/dashboard/assistant/assistant-button';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  useEffect(() => {
    // This is the ONLY automatic check.
    // If the loading is finished and there is NO user, redirect to login.
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [isUserLoading, user, router]);
  
  // The print and telegram-test pages have a special, simplified layout.
  if (pathname === '/dashboard/print' || pathname === '/dashboard/telegram-test') {
      return children;
  }

  // While loading, or if there's no user yet, show a loader.
  // This prevents rendering the dashboard with incomplete data.
  if (isUserLoading || !user) {
    return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }
  
  // ONLY if loading is done AND there is a user, render the dashboard.
  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar/>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 md:justify-end">
          <SidebarTrigger className="md:hidden" />
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 pb-20 md:pb-6">
            {children}
        </main>
        <AssistantButton />
        {isMobile && <MobileBottomNav />}
      </SidebarInset>
    </SidebarProvider>
  );
}
