'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import type { UserProfile, SiteSettings } from '@/types';

export default function SettingsPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const firestore = useFirestore();

    // Fetch user profile to check for admin role
    const userProfileDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileDocRef);

    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const settingsDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, `siteSettings/global`);
    }, [firestore]);

    const { data: siteSettings, isLoading: isSettingsLoading } = useDoc<SiteSettings>(settingsDocRef);
    
    useEffect(() => {
        if (siteSettings?.logoUrl) {
            setLogoPreview(siteSettings.logoUrl);
        }
    }, [siteSettings]);
    

    const fileToDataUri = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
    };

    const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
          try {
            const dataUri = await fileToDataUri(file);
            setLogoPreview(dataUri);
          } catch (error) {
            toast({
              variant: 'destructive',
              title: 'Rasm yuklashda xatolik',
              description: 'Faylni o‘qib bo‘lmadi. Boshqa rasm tanlab ko‘ring.',
            });
          }
        }
    };
    
    const handleSave = async () => {
        if (!settingsDocRef || !logoPreview || !firestore) {
            toast({
                variant: 'destructive',
                title: 'Saqlash uchun ma\'lumot yetarli emas',
                description: 'Iltimos, avval logotip tanlang.',
            });
            return;
        }
        setIsSaving(true);
        try {
            const docSnap = await getDoc(settingsDocRef);
            if (docSnap.exists()) {
                // If document exists, update it
                await updateDoc(settingsDocRef, { logoUrl: logoPreview });
            } else {
                // If document does not exist, create it with setDoc
                await setDoc(settingsDocRef, { id: 'global', logoUrl: logoPreview });
            }
            
            toast({
                title: "Muvaffaqiyatli saqlandi!",
                description: "Sayt logotipi muvaffaqiyatli yangilandi.",
            });
        } catch (error) {
           toast({
            variant: 'destructive',
            title: 'Saqlashda xatolik',
            description: 'Logotipni saqlashda xatolik yuz berdi.',
          });
        } finally {
            setIsSaving(false);
        }
    };
    
    const isLoading = isProfileLoading || isSettingsLoading;
    
    if (isLoading) {
         return <Skeleton className='h-96 w-full' />
    }

    if (userProfile?.role !== 'admin') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Ruxsat yo'q</CardTitle>
                    <CardDescription>
                        Ushbu sahifani faqat "admin" rolidagi foydalanuvchilar ko'ra oladi.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>Umumiy Sozlamalar</CardTitle>
                <CardDescription>
                    Saytning umumiy sozlamalarini boshqaring.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Sayt Logotipi</Label>
                    <div className='flex items-center gap-4'>
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={logoPreview || ''} alt="Sayt logotipi" />
                            <AvatarFallback className="text-xs">Logo</AvatarFallback>
                        </Avatar>
                        <Input id="logo-upload" type="file" accept="image/png, image/jpeg" onChange={handleLogoChange} className='max-w-xs' />
                    </div>
                    <p className="text-xs text-muted-foreground">Tavsiya etiladigan o'lcham: 128x128 piksel.</p>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={isSaving || !logoPreview}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                </Button>
            </CardFooter>
        </Card>
    );
}
