'use client';
import { useState, useEffect } from 'react';
import { useCollection, useDoc, useUser, useAuth, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase/hooks';
import { collection, query, doc, updateDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TeacherFormDialog, type TeacherFormData } from '@/components/dashboard/teacher-form-dialog';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types';


export default function TeachersPage() {
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Fetch current user's profile to check for admin role
  const currentUserProfileDocRef = useMemoFirebase(() => {
    if (!currentUser || !firestore) return null;
    return doc(firestore, 'users', currentUser.uid);
  }, [currentUser, firestore]);
  const { data: currentUserProfile, isLoading: isCurrentUserProfileLoading } = useDoc<UserProfile>(currentUserProfileDocRef);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
      if (currentUserProfile) {
          setIsAdmin(currentUserProfile.role === 'admin');
      }
  }, [currentUserProfile]);

  const usersQuery = useMemoFirebase(() => {
    // Only admins can query the entire users collection
    if (isAdmin && firestore) {
        return query(collection(firestore, 'users'));
    }
    return null;
  }, [isAdmin, firestore]);

  const { data: users, isLoading: areUsersLoading, error } = useCollection<UserProfile>(usersQuery);
  
  const isLoading = isCurrentUserProfileLoading || (isAdmin && areUsersLoading);
  
  const openFormDialog = (user: UserProfile | null = null) => {
    setSelectedUser(user);
    setIsFormDialogOpen(true);
  };
  
  const handleFormSubmit = async (data: TeacherFormData) => {
    if (!auth || !firestore) {
        toast({ variant: 'destructive', title: 'Xatolik', description: 'Firebase xizmatlari tayyor emas.' });
        return;
    }

    // UPDATE USER
    if (selectedUser) {
        const userDocRef = doc(firestore, 'users', selectedUser.id);
        try {
            await updateDoc(userDocRef, {
                role: data.role,
                scanLimit: data.scanLimit,
                firstName: data.firstName,
                lastName: data.lastName,
            });

            if (data.password) {
                 console.warn(`Parolni yangilash kerak: ${selectedUser.login} uchun yangi parol: ${data.password}. Bu funksiya uchun backend kerak.`);
                 toast({
                    title: "Parol yangilanmadi",
                    description: "Mavjud foydalanuvchining parolini o'zgartirish uchun xavfsiz server operatsiyasi talab qilinadi.",
                    variant: "destructive"
                });
            }

            toast({
                title: 'Muvaffaqiyatli yangilandi!',
                description: `Foydalanuvchi "${data.login}" ma'lumotlari yangilandi.`,
            });
            setIsFormDialogOpen(false);
            setSelectedUser(null);
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Xatolik',
                description: "Foydalanuvchi ma'lumotlarini yangilashda xatolik yuz berdi.",
            });
        }
    } 
    // CREATE USER
    else {
        try {
            // Note: This creates a user in the CURRENT project's auth.
            // This is a temporary solution as multi-project auth is complex.
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password!);
            const newAuthUser = userCredential.user;

            const userDocRef = doc(firestore, 'users', newAuthUser.uid);
            const newUserProfileData: Omit<UserProfile, 'id'> & { id: string } = {
                id: newAuthUser.uid,
                login: data.login,
                email: data.email,
                role: data.role,
                scanLimit: data.scanLimit,
                firstName: data.firstName,
                lastName: data.lastName,
                avatarUrl: ''
            };
            
            await setDoc(userDocRef, newUserProfileData);

            toast({
                title: 'Muvaffaqiyatli!',
                description: `Foydalanuvchi "${data.login}" yaratildi.`,
            });
            setIsFormDialogOpen(false);
            
        } catch (error: any) {
            console.error("Foydalanuvchi yaratishda xatolik:", error);
            let description = "Foydalanuvchi yaratishda kutilmagan xatolik yuz berdi.";
            if (error.code === 'auth/email-already-in-use') {
                description = "Bu email manzili allaqachon ro'yxatdan o'tgan.";
            } else if (error.code === 'auth/weak-password') {
                description = "Parol juda oddiy. Kamida 6 ta belgidan iborat bo'lishi kerak.";
            } else if (error.code === 'auth/requires-recent-login') {
                description = "Bu amal uchun qayta tizimga kirish talab etiladi. Chiqib, qayta kiring.";
            }
            toast({
                variant: 'destructive',
                title: 'Xatolik',
                description: description,
            });
        }
    }
  };
  
  if (isLoading) {
     return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-10 w-44" />
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                </div>
            </CardContent>
        </Card>
     )
  }

  if (!isAdmin) {
    return (
         <Card>
            <CardHeader>
                <CardTitle>Ruxsat yo'q</CardTitle>
                <CardDescription>
                Bu sahifani faqat administratorlar ko'ra oladi.
                </CardDescription>
            </CardHeader>
         </Card>
    )
  }

  return (
    <>
    <TeacherFormDialog
        isOpen={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        onSubmit={handleFormSubmit}
        user={selectedUser}
    />
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <CardTitle>Foydalanuvchilar</CardTitle>
          <CardDescription>
            Administrator va o'qituvchilarni boshqarish, qo'shish va sozlash.
          </CardDescription>
        </div>
        <Button onClick={() => openFormDialog()} className="w-full md:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Foydalanuvchi Qo'shish
        </Button>
      </CardHeader>
      <CardContent>
          {!isLoading && !error && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Foydalanuvchi</TableHead>
                    <TableHead className="hidden sm:table-cell">Rol</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Limit</TableHead>
                    <TableHead>
                      <span className="sr-only">Amallar</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users && users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className='flex items-center gap-3'>
                              <p>{user.firstName} {user.lastName}</p>
                              <span className='text-xs text-muted-foreground hidden md:inline'>({user.login})</span>
                          </div>
                          <div className="sm:hidden text-xs text-muted-foreground">
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="mr-2">{user.role}</Badge>
                            Limit: {user.scanLimit || 0}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">{user.scanLimit || 0}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost" disabled={user.id === currentUser?.uid}>
                                <>
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Menyuni ochish</span>
                                </>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Amallar</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openFormDialog(user)}>
                                Tahrirlash
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled // Deleting users is a sensitive operation
                              >
                                O'chirish
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Hali foydalanuvchilar mavjud emas.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          {error && (
            <div className="py-10 text-center text-destructive">
              <p>Foydalanuvchilarni yuklashda xatolik yuz berdi.</p>
              <p className="text-xs text-muted-foreground">{error.message}</p>
            </div>
          )}
      </CardContent>
    </Card>
    </>
  );
}
