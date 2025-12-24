'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Group } from '@/types';

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

const groupFormSchema = z.object({
  name: z.string().min(2, {
    message: "Guruh nomi kamida 2 belgidan iborat bo'lishi kerak.",
  }),
});

export type GroupFormData = z.infer<typeof groupFormSchema>;

interface GroupFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GroupFormData) => Promise<void>;
  onClose: () => void;
  group: Group | null;
}

export function GroupFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  onClose,
  group,
}: GroupFormDialogProps) {
  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: group?.name || '',
      });
    }
  }, [isOpen, group, form]);

  const { isSubmitting } = form.formState;

  const handleFormSubmit = async (data: GroupFormData) => {
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
          <DialogTitle>{group ? "Guruhni Tahrirlash" : "Yangi Guruh Qo'shish"}</DialogTitle>
          <DialogDescription>
            {group ? "Guruh nomini yangilang." : "Yangi guruh nomini kiriting."}
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
                  <FormLabel>Guruh Nomi</FormLabel>
                  <FormControl>
                    <Input placeholder="Masalan, 10-A sinf" {...field} />
                  </FormControl>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
