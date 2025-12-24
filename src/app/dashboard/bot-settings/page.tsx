'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { Save, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import type { UserProfile, BotSettings, RequiredChannel } from '@/types';

const channelSchema = z.object({
  name: z.string().min(1, 'Kanal nomi boʻsh boʻlishi mumkin emas.'),
  link: z.string().url('Toʻgʻri havola kiriting (https://...)').or(z.string().startsWith('@', 'Kanal havolasi @ bilan boshlanishi kerak.')),
});

const botSettingsSchema = z.object({
  token: z.string().min(20, { message: 'Bot tokeni juda qisqa.' }),
  requiredChannels: z.array(channelSchema),
});

type BotSettingsFormData = z.infer<typeof botSettingsSchema>;


export default function BotSettingsPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const firestore = useFirestore();

    const userProfileDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileDocRef);

    const settingsDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, `botSettings/global`);
    }, [firestore]);
    const { data: botSettings, isLoading: isSettingsLoading } = useDoc<BotSettings>(settingsDocRef);


    const form = useForm<BotSettingsFormData>({
        resolver: zodResolver(botSettingsSchema),
        values: {
            token: botSettings?.token || '',
            requiredChannels: botSettings?.requiredChannels || [],
        },
    });
    
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'requiredChannels',
    });

    const { isSubmitting } = form.formState;

    const handleSave = async (data: BotSettingsFormData) => {
        if (!settingsDocRef || !firestore) {
            toast({
                variant: 'destructive',
                title: 'Saqlash uchun ma\'lumot yetarli emas',
            });
            return;
        }

        try {
            const docSnap = await getDoc(settingsDocRef);
            const settingsData = {
                id: 'global',
                ...data,
            };
            if (docSnap.exists()) {
                await updateDoc(settingsDocRef, settingsData);
            } else {
                await setDoc(settingsDocRef, settingsData);
            }
            
            toast({
                title: "Muvaffaqiyatli saqlandi!",
                description: "Bot sozlamalari muvaffaqiyatli yangilandi.",
            });
        } catch (error) {
           toast({
            variant: 'destructive',
            title: 'Saqlashda xatolik',
            description: 'Sozlamalarni saqlashda xatolik yuz berdi.',
          });
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2">
                  <Card>
                      <CardHeader>
                          <CardTitle>Telegram Bot Sozlamalari</CardTitle>
                          <CardDescription>
                              Bot tokenini va majburiy obuna kanallarini boshqaring.
                          </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                           <FormField
                              control={form.control}
                              name="token"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Telegram Bot Tokeni</FormLabel>
                                      <FormControl>
                                          <Input type="password" placeholder="Bot tokenini @BotFather dan oling" {...field} />
                                      </FormControl>
                                       <FormDescription>
                                          Token xavfsizlik uchun yashirilgan. Yangilash uchun yangi tokenni kiriting.
                                      </FormDescription>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                      </CardContent>
                  </Card>
              </div>
              <div className="lg:col-span-1 row-start-1 lg:row-auto">
                   <Card>
                      <CardHeader>
                          <CardTitle>Majburiy Obuna</CardTitle>
                          <CardDescription>
                              Botdan foydalanish uchun a'zo bo'lish kerak bo'lgan kanallar ro'yxati.
                          </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          {fields.map((field, index) => (
                              <div key={field.id} className="p-3 border rounded-md space-y-3 relative">
                                  <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="icon" 
                                      className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"
                                      onClick={() => remove(index)}>
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                                   <FormField
                                      control={form.control}
                                      name={`requiredChannels.${index}.name`}
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>Kanal Nomi</FormLabel>
                                              <FormControl><Input placeholder="Masalan, Matematika..." {...field} /></FormControl>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                                   <FormField
                                      control={form.control}
                                      name={`requiredChannels.${index}.link`}
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>Havola yoki Username</FormLabel>
                                              <FormControl><Input placeholder="@kanal_username yoki https://t.me/kanal" {...field} /></FormControl>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                              </div>
                          ))}
                           <Button 
                              type="button" 
                              variant="outline" 
                              className="w-full"
                              onClick={() => append({ name: '', link: '' })}>
                              <PlusCircle className="mr-2 h-4 w-4" /> Kanal Qo'shish
                          </Button>
                      </CardContent>
                      <CardFooter>
                           <Button type="submit" className="w-full" disabled={isSubmitting}>
                              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                              Barcha Sozlamalarni Saqlash
                          </Button>
                      </CardFooter>
                  </Card>
              </div>
          </div>
        </form>
      </Form>
    );
}
