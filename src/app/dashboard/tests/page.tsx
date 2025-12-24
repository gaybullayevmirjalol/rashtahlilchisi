'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal, PlusCircle, Play, StopCircle, Eye, Trash2, Pencil, BrainCircuit, Loader2, RefreshCw, FileSignature } from 'lucide-react';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { collection, query, doc, serverTimestamp, getDocs, writeBatch, orderBy, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteTestAlert } from '@/components/dashboard/delete-test-alert';
import { format } from 'date-fns';
import { DeleteConfirmationDialog } from '@/components/dashboard/delete-confirmation-dialog';
import type { Test } from '@/types';
import { AiAnalysisDialog } from '@/components/dashboard/ai-analysis-dialog';


export default function TestsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isClearResultsDialogOpen, setIsClearResultsDialogOpen] = useState(false);
  const [isAiAnalysisOpen, setIsAiAnalysisOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [isFinishingTest, setIsFinishingTest] = useState<string | null>(null);

  const testsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/tests`), orderBy('createdAt', 'desc'));
  }, [user, firestore]);

  const { data: tests, isLoading, error } = useCollection<Test>(testsQuery);


  const openDeleteDialog = (test: Test) => {
    setSelectedTest(test);
    setIsDeleteDialogOpen(true);
  };
  
  const openClearResultsDialog = (test: Test) => {
    setSelectedTest(test);
    setIsClearResultsDialogOpen(true);
  };
  
  const openAiAnalysisDialog = (test: Test) => {
    setSelectedTest(test);
    setIsAiAnalysisOpen(true);
  };


  const handleDeleteTest = async () => {
    if (!user || !selectedTest || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Xatolik',
        description: "Testni o'chirish uchun kerakli ma'lumotlar topilmadi.",
      });
      return;
    }

    const testDocRef = doc(firestore, `users/${user.uid}/tests/${selectedTest.id}`);
    deleteDoc(testDocRef);

    toast({
      title: 'Muvaffaqiyatli!',
      description: "Test o'chirildi.",
    });
    setIsDeleteDialogOpen(false);
    setSelectedTest(null);
  };
  
  const handleClearTestResults = async () => {
    if (!user || !selectedTest || !firestore) {
      toast({ variant: 'destructive', title: 'Xatolik', description: "Natijalarni tozalash uchun ma'lumotlar topilmadi." });
      return;
    }
    
    toast({ title: 'Tozalanmoqda...', description: `"${selectedTest.name}" testining natijalari o'chirilmoqda.`});

    const resultsColRef = collection(firestore, `users/${user.uid}/tests/${selectedTest.id}/testResults`);
    try {
        const resultsSnapshot = await getDocs(resultsColRef);
        if (resultsSnapshot.empty) {
            toast({ title: 'Natijalar mavjud emas', description: 'Bu testda o\'chirish uchun natijalar topilmadi.' });
            setIsClearResultsDialogOpen(false);
            return;
        }
        const batch = writeBatch(firestore);
        resultsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Also clear the analysis from the test document itself
        const testDocRef = doc(firestore, `users/${user.uid}/tests/${selectedTest.id}`);
        batch.update(testDocRef, { analysis: null });

        await batch.commit();

        toast({ title: 'Muvaffaqiyatli!', description: `Barcha natijalar va tahlil ma'lumotlari o'chirildi.` });

    } catch (e) {
        toast({ variant: 'destructive', title: 'Xatolik', description: 'Natijalarni o\'chirishda kutilmagan xatolik yuz berdi.' });
    } finally {
        setIsClearResultsDialogOpen(false);
        setSelectedTest(null);
    }
  }


  const handleUpdateTestStatus = async (test: Test, status: 'Boshlandi' | 'Yaratildi' | 'Yakunlandi') => {
     if (!user || !firestore) return;

     const testDocRef = doc(firestore, `users/${user.uid}/tests/${test.id}`);
     
     if (status === 'Boshlandi') {
        const anotherTestActive = tests?.some(t => t.status === 'Boshlandi' && t.id !== test.id);
        if (anotherTestActive) {
            toast({
                variant: 'destructive',
                title: 'Boshqa test aktiv holatda',
                description: 'Bir vaqtning o\'zida faqat bitta test "Boshlandi" holatida bo\'lishi mumkin.',
            });
            return;
        }
     }
     
     await updateDoc(testDocRef, { status });
     toast({
         title: 'Holat yangilandi!',
         description: `Test holati "${status}" ga o'zgartirildi.`,
     });
  }

  const getStatusVariant = (status: Test['status']) => {
    switch (status) {
      case 'Boshlandi':
        return 'default';
      case 'Yakunlandi':
        return 'secondary';
      case 'Yaratildi':
        return 'outline';
      default:
        return 'secondary';
    }
  }


  return (
    <>
      <DeleteTestAlert
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteTest}
      />
      <DeleteConfirmationDialog
        isOpen={isClearResultsDialogOpen}
        onOpenChange={setIsClearResultsDialogOpen}
        onConfirm={handleClearTestResults}
        title="Haqiqatan ham natijalarni tozalamoqchimisiz?"
        description="Bu amalni qaytarib bo'lmaydi. Bu testga tegishli barcha saqlangan natijalar va tahlil ma'lumotlari butunlay o'chirib yuboriladi."
        confirmText="Ha, tozalash"
      />
       {selectedTest && (
          <AiAnalysisDialog
            isOpen={isAiAnalysisOpen}
            onOpenChange={setIsAiAnalysisOpen}
            testId={selectedTest.id}
            test={selectedTest}
          />
        )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Testlar</CardTitle>
            <CardDescription>
              Barcha testlaringizni boshqaring, yarating va natijalarini ko'ring.
            </CardDescription>
          </div>
           <Button asChild>
            <Link href="/dashboard/tests/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Yangi Test Yaratish
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Nomi</TableHead>
                  <TableHead>Fan</TableHead>
                  <TableHead>Holati</TableHead>
                   <TableHead className="hidden md:table-cell">Yaratilgan</TableHead>
                  <TableHead>
                    <span className="sr-only">Amallar</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests && tests.length > 0 ? (
                  tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">
                        <div>{test.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{test.id}</div>
                      </TableCell>
                       <TableCell>
                        {test.subjectName || <span className="text-xs text-muted-foreground">Noma'lum</span>}
                       </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(test.status)}>
                          {isFinishingTest === test.id ? (
                            <div className='flex items-center gap-2'>
                                <Loader2 className="h-3 w-3 animate-spin"/>
                                <span>Tahlil...</span>
                            </div>
                          ) : (
                             test.status
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {test.createdAt ? format(new Date(test.createdAt.seconds * 1000), 'dd/MM/yyyy') : 'Noma\'lum'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                              disabled={isFinishingTest === test.id}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Menyuni ochish</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Amallar</DropdownMenuLabel>
                             <DropdownMenuItem asChild>
                                <Link href={`/dashboard/tests/${test.id}`} className="flex items-center w-full cursor-pointer">
                                    <Eye className="mr-2 h-4 w-4" />
                                    Batafsil Tahlil
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                             {test.status === 'Yaratildi' && !!test.questions && test.questions.length > 0 && (
                                <DropdownMenuItem onClick={() => handleUpdateTestStatus(test, 'Boshlandi')}>
                                    <Play className="mr-2 h-4 w-4" />
                                    Boshlash
                                </DropdownMenuItem>
                            )}
                             {test.status === 'Yaratildi' && (!test.questions || test.questions.length === 0) && (
                                <DropdownMenuItem disabled>
                                    <Play className="mr-2 h-4 w-4" />
                                    (Avval kalit kiriting)
                                </DropdownMenuItem>
                            )}
                             {test.status === 'Boshlandi' && (
                                <DropdownMenuItem onClick={() => handleUpdateTestStatus(test, 'Yakunlandi')}>
                                    <StopCircle className="mr-2 h-4 w-4" />
                                    Yakunlash
                                </DropdownMenuItem>
                            )}
                            {test.status === 'Yakunlandi' && (
                                 <DropdownMenuItem onClick={() => openAiAnalysisDialog(test)}>
                                    <BrainCircuit className="mr-2 h-4 w-4" />
                                    SI bilan Tahlil
                                </DropdownMenuItem>
                            )}
                             {test.status === 'Yakunlandi' && (
                                <DropdownMenuItem onClick={() => handleUpdateTestStatus(test, 'Boshlandi')}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Qayta ochish
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => openClearResultsDialog(test)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Natijalarni tozalash
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => openDeleteDialog(test)}
                              disabled={test.status === 'Boshlandi'}
                            >
                              O'chirish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Hali testlar mavjud emas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {error && (
            <div className="py-10 text-center text-destructive">
              <p>Testlarni yuklashda xatolik yuz berdi.</p>
              <p className="text-xs text-muted-foreground">{error.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
