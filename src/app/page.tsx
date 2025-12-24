'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { useUser, useAuth } from '@/firebase/hooks';
import { signInWithEmailAndPassword } from 'firebase/auth';


export default function LoginPage() {
  const [email, setEmail] = useState('teacher@example.com');
  const [password, setPassword] = useState('password');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser(); 
  const auth = useAuth();

  useEffect(() => {
    // If user is already logged in, redirect to the dashboard.
    // isUserLoading ensures we don't redirect before auth state is confirmed.
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [isUserLoading, user, router]);


  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!auth) {
        toast({
            variant: 'destructive',
            title: 'Xatolik',
            description: "Firebase hali tayyor emas. Biroz kuting va qayta urinib ko'ring.",
        });
        setIsSubmitting(false);
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        toast({
            title: 'Muvaffaqiyatli!',
            description: "Boshqaruv paneliga yo'naltirilmoqda...",
        });
        // The useEffect above will handle the redirection to /dashboard
    } catch (error: any) {
        console.error("Kirishda xatolik:", error);
        let description = "Kirishda kutilmagan xatolik yuz berdi.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            description = "Email yoki parol noto'g'ri.";
        } else if (error.code === 'auth/invalid-api-key' || error.code === 'auth/internal-error') {
            description = "Firebase bilan bog'lanishda xatolik. Keyinroq qayta urunib ko'ring.";
        }
        toast({
            variant: 'destructive',
            title: 'Kirishda xatolik',
            description,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  // While loading auth state or if user is logged in (and about to be redirected), show a loader.
  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Only show the login page if loading is done and there's no user.
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Logo className="h-16 w-16 mb-4" />
          <CardTitle>Tizimga kirish</CardTitle>
          <CardDescription>
            Hisobingizga kirish uchun ma'lumotlaringizni kiriting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parol</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kirish
            </Button>
          </form>
        </CardContent>
         <CardFooter className="flex-col items-center justify-center text-xs text-center">
           <p className='text-muted-foreground'>
               Kirishda muammo bo'lsa,{' '}
                <a href="https://t.me/gaybullayevmirjalol" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                    t.me/gaybullayevmirjalol
                </a>{' '}
                ga yozing.
           </p>
        </CardFooter>
      </Card>
    </div>
  );
}
