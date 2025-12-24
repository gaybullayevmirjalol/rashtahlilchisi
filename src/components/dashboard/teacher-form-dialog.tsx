'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect } from 'react';
import type { UserProfile } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '../ui/scroll-area';

const teacherFormSchema = z.object({
  login: z.string().min(3, { message: "Login kamida 3 belgidan iborat bo'lishi kerak." }),
  email: z.string().email({ message: "To'g'ri email manzil kiriting." }),
  password: z.string().min(6, { message: "Parol kamida 6 belgidan iborat bo'lishi kerak." }).optional().or(z.literal('')),
  firstName: z.string().min(2, { message: "Ism kamida 2 belgidan iborat bo'lishi kerak." }),
  lastName: z.string().min(2, { message: "Familiya kamida 2 belgidan iborat bo'lishi kerak." }),
  role: z.enum(['admin', 'teacher'], { required_error: "Rolni tanlang." }),
  scanLimit: z.coerce.number().min(0, { message: "Limit 0 dan kam bo'lmasligi kerak." }),
});

export type TeacherFormData = z.infer<typeof teacherFormSchema>;

interface TeacherFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TeacherFormData) => Promise<void>;
  user: UserProfile | null;
}

export function TeacherFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  user,
}: TeacherFormDialogProps) {
  const isEditMode = !!user;

  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherFormSchema),
  });

  useEffect(() => {
    if (isOpen) {
        form.reset({
            login: user?.login || '',
            email: user?.email || '',
            password: '', // Always clear password field on open
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            role: user?.role || 'teacher',
            scanLimit: user?.scanLimit || 100,
        });
    }
  }, [isOpen, user, form]);

  const { isSubmitting } = form.formState;

  const handleFormSubmit = async (data: TeacherFormData) => {
    if (!isEditMode && !data.password) {
        form.setError('password', { type: 'manual', message: "Yangi foydalanuvchi uchun parol majburiy." });
        return;
    }
    await onSubmit(data);
    // Let the parent component handle closing the dialog on success
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        form.reset();
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md grid-rows-[auto_minmax(0,1fr)_auto] p-0 max-h-[90vh]">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{isEditMode ? "Foydalanuvchini Tahrirlash" : "Yangi Foydalanuvchi Qo'shish"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? `"${user.login}" ma'lumotlarini o'zgartiring.` : "Yangi administrator yoki o'qituvchi ma'lumotlarini kiriting."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="grid gap-4"
          >
            <ScrollArea className="h-full overflow-y-auto">
                 <div className="space-y-4 px-6">
                    <div className='grid grid-cols-2 gap-4'>
                        <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Ism</FormLabel>
                            <FormControl>
                                <Input placeholder="Alisher" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Familiya</FormLabel>
                            <FormControl>
                                <Input placeholder="Valiyev" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                    <FormField
                    control={form.control}
                    name="login"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Login</FormLabel>
                        <FormControl>
                            <Input placeholder="Masalan, alisher.v" {...field} disabled={isEditMode} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="user@example.com" {...field} disabled={isEditMode} />
                        </FormControl>
                        <FormDescription>
                            Bu email tizimga kirish uchun ishlatiladi.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Parol</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder={isEditMode ? "O'zgartirish uchun yangi parol kiriting" : "••••••••"} {...field} />
                        </FormControl>
                        <FormDescription>
                            {isEditMode ? "Agar parolni o'zgartirishni xohlamasangiz, bu maydonni bo'sh qoldiring." : "Foydalanuvchi uchun vaqtinchalik parol yarating."}
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Rol</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Rolni tanlang..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="teacher">O'qituvchi</SelectItem>
                                <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                            </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="scanLimit"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Skanerlash Limiti</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                            O'qituvchi skanerlashi mumkin bo'lgan testlar soni.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 </div>
            </ScrollArea>
            <DialogFooter className="px-6 pb-6 pt-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (isEditMode ? 'Yangilanmoqda...' : 'Qo\'shilmoqda...') : (isEditMode ? 'Yangilash' : 'Qo\'shish')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
