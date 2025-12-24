'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser, useDoc, useCollection, useAuth, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, collection, updateDoc } from 'firebase/firestore';
import { KeyRound, User, Save, AlertCircle } from 'lucide-react';
import type { UserProfile, Test } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

const profileFormSchema = z.object({
  firstName: z.string().min(2, { message: 'Ism kamida 2 belgidan iborat boʻlishi kerak.' }).optional().or(z.literal('')),
  lastName: z.string().min(2, { message: 'Familiya kamida 2 belgidan iborat boʻlishi kerak.' }).optional().or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, { message: "Joriy parol kamida 6 belgidan iborat bo'lishi kerak." }),
  newPassword: z.string().min(6, { message: "Yangi parol kamida 6 belgidan iborat bo'lishi kerak." }),
  confirmPassword: z.string().min(6, { message: "Parolni tasdiqlash kamida 6 belgidan iborat bo'lishi kerak." }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Yangi parollar bir-biriga mos kelmadi.",
  path: ["confirmPassword"],
});


type ProfileFormData = z.infer<typeof profileFormSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfileAndSettingsPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const auth = useAuth();
    const firestore = useFirestore();

    // Fetch user profile separately
    const userProfileDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileDocRef);

    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isSavingAvatar, setIsSavingAvatar] = useState(false);

    const testsQuery = useMemoFirebase(() => {
      if (!user || !firestore) return null;
      return collection(firestore, `users/${user.uid}/tests`);
    }, [user, firestore]);
    
    const { data: tests, isLoading: isLoadingTests } = useCollection<Test>(testsQuery);

    const profileForm = useForm<ProfileFormData>({
        resolver: zodResolver(profileFormSchema),
        values: {
            firstName: userProfile?.firstName || '',
            lastName: userProfile?.lastName || '',
        }
    });

    const passwordForm = useForm<PasswordFormData>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const { isSubmitting: isProfileSubmitting } = profileForm.formState;
    const { isSubmitting: isPasswordSubmitting } = passwordForm.formState;


    const onProfileSubmit = async (data: ProfileFormData) => {
        if (!userProfileDocRef || !firestore) return;
        try {
            await updateDoc(userProfileDocRef, {
                firstName: data.firstName,
                lastName: data.lastName,
            });
             toast({
                title: "Muvaffaqiyatli!",
                description: "Profilingiz ma'lumotlari yangilandi.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Xatolik",
                description: "Profilni yangilashda xatolik yuz berdi.",
            });
        }
    }
    
    const fileToDataUri = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
          try {
            const dataUri = await fileToDataUri(file);
            setAvatarPreview(dataUri);
          } catch (error) {
            toast({
              variant: 'destructive',
              title: 'Rasm yuklashda xatolik',
              description: 'Faylni o‘qib bo‘lmadi. Boshqa rasm tanlab ko‘ring.',
            });
          }
        }
    };
    
    const handleSaveAvatar = async () => {
        if (!userProfileDocRef || !avatarPreview || !firestore) return;
        setIsSavingAvatar(true);
        try {
            await updateDoc(userProfileDocRef, { avatarUrl: avatarPreview });
            toast({
                title: "Avatar saqlandi!",
                description: "Yangi profilingiz rasmi muvaffaqiyatli saqlandi.",
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Xatolik',
                description: "Avatar saqlashda xatolik yuz berdi.",
            });
        } finally {
            setIsSavingAvatar(false);
        }
    }

    const onPasswordSubmit = async (data: PasswordFormData) => {
        if (!user || !user.email || !auth) {
            toast({
                variant: "destructive",
                title: "Xatolik",
                description: "Foydalanuvchi topilmadi. Iltimos, qaytadan kiring.",
            });
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, data.newPassword);
            toast({
                title: "Muvaffaqiyatli!",
                description: "Parolingiz muvaffaqiyatli o'zgartirildi.",
            });
            passwordForm.reset();
        } catch (error: any) {
            let description = "Parolni o'zgartirishda kutilmagan xatolik yuz berdi.";
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                description = "Joriy parol noto'g'ri kiritildi.";
            }
            toast({
                variant: "destructive",
                title: "Xatolik",
                description,
            });
        }
    };
    
    const isLoading = isProfileLoading || isLoadingTests;
    
    const usedScans = tests?.length ?? 0;
    const totalLimit = userProfile?.scanLimit ?? 0;
    const remainingScans = Math.max(0, totalLimit - usedScans);
    const usedPercentage = totalLimit > 0 ? (usedScans / totalLimit) * 100 : 0;


    if (isLoading) {
        return (
            <div className='grid gap-6 md:grid-cols-3'>
                <div className='md:col-span-1 space-y-6'>
                    <Skeleton className='h-64 w-full' />
                </div>
                <div className='md:col-span-2 space-y-6'>
                    <Skeleton className='h-48 w-full' />
                    <Skeleton className='h-64 w-full' />
                </div>
            </div>
        )
    }

    return (
        <div className='grid gap-6 grid-cols-1 md:grid-cols-3'>
            <div className='space-y-6 md:col-span-1'>
                <Card>
                    <CardHeader>
                        <CardTitle>Profil Rasmi</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Avatar className="h-32 w-32">
                            <AvatarImage src={avatarPreview || userProfile?.avatarUrl || ''} alt="Profil rasmi" />
                            <AvatarFallback>
                                <User className='h-16 w-16' />
                            </AvatarFallback>
                        </Avatar>
                        <Input id="avatar-upload" type="file" accept="image/png, image/jpeg" onChange={handleAvatarChange}/>
                         <Button className="w-full" onClick={handleSaveAvatar} disabled={isSavingAvatar || !avatarPreview}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSavingAvatar ? 'Saqlanmoqda...' : 'Rasmni Saqlash'}
                        </Button>
                    </CardContent>
                </Card>
                {userProfile?.role === 'teacher' && (
                  <Card>
                    <CardHeader>
                        <CardTitle>Skanerlash Limiti</CardTitle>
                        <CardDescription>Joriy obuna bo'yicha ma'lumotlar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className='space-y-2'>
                          <div className="flex justify-between text-sm font-medium">
                            <span>Qoldiq: {remainingScans}</span>
                            <span className="text-muted-foreground">{usedScans} / {totalLimit}</span>
                          </div>
                          <Progress value={usedPercentage} />
                        </div>
                        <Alert>
                            <AlertCircle className="h-4 w-4"/>
                            <AlertTitle>Limitni oshirish kerakmi?</AlertTitle>
                            <AlertDescription>
                                Limitni oshirish yoki qo'shimcha ma'lumot olish uchun Telegram orqali <a href="https://t.me/gaybullayevmirjalol" target="_blank" rel="noopener noreferrer" className="font-semibold underline">@gaybullayevmirjalol</a> profiliga murojaat qiling.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                  </Card>  
                )}
            </div>
            <div className='md:col-span-2 space-y-6'>
                <Card>
                    <CardHeader>
                        <CardTitle>Shaxsiy Ma'lumotlar</CardTitle>
                        <CardDescription>
                            Ism va familiyangizni o'zgartirishingiz mumkin.
                        </CardDescription>
                    </CardHeader>
                    <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                            <CardContent className="space-y-4">
                                <div className='grid sm:grid-cols-2 gap-4'>
                                    <FormField
                                        control={profileForm.control}
                                        name="firstName"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ism</FormLabel>
                                            <FormControl>
                                            <Input placeholder="Ismingiz" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={profileForm.control}
                                        name="lastName"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Familiya</FormLabel>
                                            <FormControl>
                                            <Input placeholder="Familiyangiz" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </div>
                                <FormItem>
                                    <FormLabel>Login</FormLabel>
                                    <FormControl>
                                    <Input readOnly disabled value={userProfile?.login || ''} />
                                    </FormControl>
                                </FormItem>
                            </CardContent>
                             <CardFooter>
                                <Button type="submit" disabled={isProfileSubmitting}>
                                    <User className="mr-2 h-4 w-4" />
                                    {isProfileSubmitting ? "Saqlanmoqda..." : "Ma'lumotlarni Saqlash"}
                                </Button>
                            </CardFooter>
                        </form>
                    </Form>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Xavfsizlik Sozlamalari</CardTitle>
                        <CardDescription>
                            Hisobingiz parolini o'zgartirishingiz mumkin.
                        </CardDescription>
                    </CardHeader>
                    <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                        <CardContent className="space-y-4">
                        <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Joriy Parol</FormLabel>
                                <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={passwordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Yangi Parol</FormLabel>
                                <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={passwordForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Yangi Parolni Tasdiqlang</FormLabel>
                                <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        </CardContent>
                        <CardFooter>
                        <Button type="submit" disabled={isPasswordSubmitting}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            {isPasswordSubmitting ? "Yangilanmoqda..." : "Parolni Yangilash"}
                        </Button>
                        </CardFooter>
                    </form>
                    </Form>
                </Card>
            </div>
        </div>
    );
}
