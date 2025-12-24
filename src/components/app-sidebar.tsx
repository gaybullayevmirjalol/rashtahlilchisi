'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Logo } from './logo';
import {
  ChevronRight,
  LayoutDashboard,
  FileText,
  Users,
  Camera,
  LogOut,
  Settings,
  ShieldCheck,
  Users2,
  AlertCircle,
  PenSquare,
  Bot,
} from 'lucide-react';
import { useUser, useCollection, useDoc, useAuth, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { signOut } from 'firebase/auth';
import { doc, collection, query } from 'firebase/firestore';

import type { Test, UserProfile } from '@/types';


const menuItems = [
  { href: '/dashboard', label: 'Boshqaruv paneli', icon: LayoutDashboard },
  { href: '/dashboard/tests', label: 'Testlar', icon: FileText },
  { href: '/dashboard/students', label: 'Talabalar', icon: Users },
  { href: '/dashboard/groups', label: 'Guruhlar', icon: Users2 },
  { href: '/dashboard/scan', label: 'Skanerlash', icon: Camera },
  { href: '/dashboard/manual-entry', label: "Qo'lda kiritish", icon: PenSquare },
  {
    href: '/dashboard/teachers',
    label: "Foydalanuvchilar",
    icon: ShieldCheck,
    role: 'admin',
  },
   {
    href: '/dashboard/bot-settings',
    label: "Bot Sozlamalari",
    icon: Bot,
    role: 'admin',
  },
  {
    href: '/dashboard/settings',
    label: "Umumiy Sozlamalar",
    icon: Settings,
    role: 'admin',
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { setOpenMobile, isMobile } = useSidebar();

  const userProfileDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileDocRef);

  const testsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/tests`));
  }, [user, firestore]);
  const { data: tests, isLoading: isLoadingTests } = useCollection<Test>(testsQuery);
  // --- End of data fetching specific to the sidebar ---

  const isLoading = isProfileLoading || isLoadingTests;
  
  const userRole = userProfile?.role;
  const userDisplayName = !isLoading && (userProfile?.firstName && userProfile?.lastName)
    ? `${userProfile.firstName} ${userProfile.lastName}`
    : userProfile?.login;
  const userAvatarFallback = !isLoading && (userProfile?.firstName ? userProfile.firstName.charAt(0) : userProfile?.login?.charAt(0).toUpperCase());

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    // Force a full page reload to clear all state and go to login page
    window.location.href = '/';
  };
  
  const handleProfileClick = () => {
      if (isMobile) setOpenMobile(false);
      router.push('/dashboard/profile');
  }

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const filteredMenuItems = menuItems.filter(
    (item) => !item.role || item.role === userRole
  );
  
  const usedScans = tests?.length ?? 0;
  const totalLimit = userProfile?.scanLimit ?? 0;
  const remainingScans = totalLimit > 0 ? Math.max(0, totalLimit - usedScans) : 0;
  const isLimitLow = userRole === 'teacher' && totalLimit > 0 && remainingScans <= totalLimit * 0.1; // 10% or less remaining


  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              RashExam
            </h2>
            <p className="text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
              Tahlilchisi
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {filteredMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                  tooltip={item.label}
                  onClick={handleMenuClick}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-3 p-2 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:justify-center"
              disabled={isLoading}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                    src={userProfile?.avatarUrl || ''}
                    alt="Foydalanuvchi rasmi"
                />
                <AvatarFallback>
                  {isLoading ? '' : userAvatarFallback}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                <span className="font-medium text-sidebar-foreground">
                  {isLoading ? 'Yuklanmoqda...' : userDisplayName}
                </span>
                <span className="text-xs text-sidebar-foreground/70">
                  {isLoading ? '...' : (userRole === 'admin' ? 'Administrator' : "O'qituvchi")}
                </span>
                {userRole === 'teacher' && !isLoading && (
                  <div className="flex items-center gap-1.5 text-xs text-sidebar-foreground/70 mt-1">
                     Skanerlash limiti: {remainingScans}
                     {isLimitLow && <AlertCircle className="h-3 w-3 text-destructive" />}
                  </div>
                )}
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuLabel>Mening Hisobim</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onSelect={handleProfileClick}>
               <Settings className="mr-2 h-4 w-4" />
               <span>Profil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Chiqish</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
