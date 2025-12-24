'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { collection, query, where } from 'firebase/firestore';
import type { Test, Group } from '@/types';


interface PrintSheetsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group | null;
}

export function PrintSheetsDialog({ isOpen, onOpenChange, group }: PrintSheetsDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [isPreparing, setIsPreparing] = useState(false);
  
  const activeTestsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/tests`), where('status', '==', 'Boshlandi'));
  }, [user, firestore]);

  const { data: activeTests, isLoading: isLoadingTests } = useCollection<Test>(activeTestsQuery);

  const handlePrint = async () => {
    if (!selectedTestId || !group) {
      toast({
        variant: 'destructive',
        title: 'Chop etish uchun ma\'lumotlar yetarli emas',
        description: 'Iltimos, testni tanlang.',
      });
      return;
    }

    setIsPreparing(true);
    toast({
        title: 'Chop etishga tayyorlanmoqda...',
        description: 'Chop etish sahifasi ochilmoqda, iltimos, kuting.',
    });

    const printUrl = `/dashboard/print?testId=${selectedTestId}&groupId=${group.id}`;
    
    // Open the print page in a new tab
    const printWindow = window.open(printUrl, '_blank');

    if (printWindow) {
      printWindow.focus();
    } else {
      toast({
        variant: 'destructive',
        title: 'Yangi oyna ochilmadi',
        description: 'Brauzeringiz yangi oynalarni bloklashi mumkin. Iltimos, ruxsat bering va qayta urinib ko\'ring.',
      });
    }

    setIsPreparing(false);
    onOpenChange(false);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>"{group?.name}" guruhi uchun javob varaqalarini chop etish</DialogTitle>
          <DialogDescription>
            Qaysi test uchun javob varaqalarini chop etmoqchisiz? Faqat boshlangan testlar ro'yxatda ko'rinadi.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
            <Label htmlFor='test-select'>Testni tanlang</Label>
            <Select onValueChange={setSelectedTestId} disabled={isLoadingTests || isPreparing}>
                <SelectTrigger id="test-select">
                    <SelectValue placeholder="Testni tanlang..." />
                </SelectTrigger>
                <SelectContent>
                    {activeTests && activeTests.length > 0 ? (
                        activeTests.map(test => (
                            <SelectItem key={test.id} value={test.id}>
                                {test.name}
                            </SelectItem>
                        ))
                    ) : (
                        <SelectItem value="no-test" disabled>
                            Aktiv testlar mavjud emas.
                        </SelectItem>
                    )}
                </SelectContent>
            </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPreparing}>
            Bekor qilish
          </Button>
          <Button onClick={handlePrint} disabled={!selectedTestId || isPreparing || isLoadingTests}>
            {isPreparing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Printer className="mr-2 h-4 w-4" />}
            {isPreparing ? 'Tayyorlanmoqda...' : 'Chop etish oynasini ochish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
