
'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Student, Group } from '@/types';

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
import { Skeleton } from '@/components/ui/skeleton';

const studentFormSchema = z.object({
  name: z.string().min(3, {
    message: "Talaba ismi kamida 3 belgidan iborat bo'lishi kerak.",
  }),
  groupId: z.string().optional(),
});

export type StudentFormData = z.infer<typeof studentFormSchema>;

interface StudentFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: StudentFormData) => Promise<void>;
  onClose: () => void;
  student: Student | null;
  groups: Group[];
  isLoadingGroups: boolean;
}

export function StudentFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  onClose,
  student,
  groups,
  isLoadingGroups,
}: StudentFormDialogProps) {
  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: '',
      groupId: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: student?.name || '',
        groupId: student?.groupId || 'guruhsiz',
      });
    }
  }, [isOpen, student, form]);

  const { isSubmitting } = form.formState;

  const handleFormSubmit = async (data: StudentFormData) => {
    await onSubmit(data);
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      onClose();
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{student ? "Talabani Tahrirlash" : "Yangi Talaba Qo'shish"}</DialogTitle>
          <DialogDescription>
            {student ? "Talaba ma'lumotlarini yangilang." : "Yangi talaba ma'lumotlarini kiriting."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-4 pt-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Talabaning to'liq ismi</FormLabel>
                  <FormControl>
                    <Input placeholder="Masalan, Alisher Valiyev" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guruh</FormLabel>
                  {isLoadingGroups ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Guruhni tanlang..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="guruhsiz">Guruhsiz</SelectItem>
                        {groups?.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose(false)}
                disabled={isSubmitting}
              >
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoadingGroups}>
                {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
