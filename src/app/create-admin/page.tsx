'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  useUser,
  useAuth,
  useFirestore,
} from '@/firebase/hooks';
import {
  doc,
  setDoc,
} from 'firebase/firestore';
import {
    createUserWithEmailAndPassword,
} from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/types';


export default function CreateAdminPage() {
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const handleCreateAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!auth || !firestore) {
        toast({
            variant: 'destructive',
            title: 'Xatolik',
            description: "Firebase hali tayyor emas. Biroz kuting va qayta urinib ko'ring.",
        });
        setIsSubmitting(false);
        return;
    }

    try {
      // 1. Create user in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newAdmin = userCredential.user;

      // 2. Create user profile in Firestore
      const userDocRef = doc(firestore, 'users', newAdmin.uid);
      const newUserProfile: UserProfile = {
        id: newAdmin.uid,
        login: login, // Store login as is, without converting to lowercase
        email: email,
        role: 'admin',
        scanLimit: 1000,
        firstName: 'Admin',
        lastName: 'User',
        avatarUrl: ''
      };
      await setDoc(userDocRef, newUserProfile, { merge: true });
      
      toast({
        title: 'Administrator yaratildi!',
        description: 'Endi kirish sahifasidan tizimga kirishingiz mumkin.',
      });
      router.push('/');

    } catch (error: any) {
      console.error("Admin creation error:", error);
      let description = "Administrator yaratishda kutilmagan xatolik yuz berdi.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Bu email manzili allaqachon ro'yxatdan o'tgan.";
      } else if (error.code === 'auth/weak-password') {
        description = "Parol juda oddiy. Kamida 6 ta belgidan iborat bo'lishi kerak.";
      } else if (error.code === 'auth/invalid-api-key') {
        description = "Firebase API kaliti noto'g'ri. Iltimos, administratorga murojaat qiling.";
      }
      toast({
        variant: 'destructive',
        title: 'Administrator yaratishda xatolik',
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || isUserLoading;

  if (isUserLoading) {
      return null; // or a loading spinner
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Maxsus Administrator Yaratish</CardTitle>
          <CardDescription>
            Bu sahifa faqat tizimning birinchi administratorini yaratish uchun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login">Admin uchun login</Label>
              <Input
                id="login"
                type="text"
                placeholder="Masalan, admin_user"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                disabled={isLoading}
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Admin Paroli</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Yaratilmoqda...' : 'Admin Yaratish'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
