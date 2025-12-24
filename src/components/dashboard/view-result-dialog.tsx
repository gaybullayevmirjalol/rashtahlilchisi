'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Student, Test, TestResult } from '@/types';
import { FileText, Percent, CheckCircle, User } from 'lucide-react';
import Link from 'next/link';

interface ViewResultDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    test: Test;
    student: Student;
    result: TestResult;
  } | null;
}

export function ViewResultDialog({ isOpen, onOpenChange, data }: ViewResultDialogProps) {
  if (!data) return null;

  const { test, student, result } = data;
  const percentage = test.questionCount > 0 ? (result.score / 75) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test Natijasi Topildi</DialogTitle>
          <DialogDescription>
            {student.name}ning "{test.name}" testi uchun saqlangan natijasi.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="flex flex-col items-center justify-center p-6 bg-secondary rounded-lg">
                <p className="text-lg font-medium">{student.name}</p>
                <p className="text-sm text-muted-foreground">{test.name}</p>
                <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tight">{result.score.toFixed(2)}</span>
                    <span className="text-xl text-muted-foreground">/ 75</span>
                </div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
                 <div className='flex items-center gap-3 p-3 rounded-md border'>
                    <Percent className='h-6 w-6 text-primary'/>
                    <div>
                        <p className='text-xs text-muted-foreground'>Foiz</p>
                        <p className='font-semibold'>{percentage.toFixed(1)}%</p>
                    </div>
                 </div>
                 <div className='flex items-center gap-3 p-3 rounded-md border'>
                    <CheckCircle className='h-6 w-6 text-green-500'/>
                     <div>
                        <p className='text-xs text-muted-foreground'>Daraja</p>
                        <p className='font-semibold'>{result.grade || 'N/A'}</p>
                    </div>
                 </div>
            </div>
        </div>
        <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2">
           <Button variant="secondary">
              <Link href={`/dashboard/students/${student.id}`} className='flex items-center w-full justify-center'>
                <User className="mr-2 h-4 w-4" />
                O'quvchi Profilini Ko'rish
              </Link>
            </Button>
           <Button variant="outline">
              <Link href={`/dashboard/tests/${test.id}`} className='flex items-center w-full justify-center'>
                <FileText className="mr-2 h-4 w-4" />
                To'liq Tahlilni Ko'rish
              </Link>
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
