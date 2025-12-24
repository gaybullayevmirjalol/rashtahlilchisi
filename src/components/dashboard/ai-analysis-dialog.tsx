'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, BrainCircuit, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { performRaschAnalysis, RaschAnalysisOutput } from '@/ai/flows';
import { ScrollArea } from '../ui/scroll-area';
import type { Student, TestResult, Test } from '@/types';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase/hooks';
import { doc, updateDoc, writeBatch, getDocs, collection, query } from 'firebase/firestore';

interface AiAnalysisDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  test: Test | null;
}

export function AiAnalysisDialog({ isOpen, onOpenChange, test }: AiAnalysisDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RaschAnalysisOutput | null>(test?.analysis || null);
  const [error, setError] = useState<string | null>(null);

  // Fetch test results to generate CSV data internally
  const resultsQuery = useMemoFirebase(() => {
    if (!user || !firestore || !test?.id || !isOpen) return null;
    return query(collection(firestore, `users/${user.uid}/tests/${test.id}/testResults`));
  }, [user, firestore, test?.id, isOpen]);
  const { data: testResults, isLoading: isLoadingResults } = useCollection<TestResult>(resultsQuery);
  
  const studentsQuery = useMemoFirebase(() => {
    if (!user || !firestore || !isOpen) return null;
    return query(collection(firestore, `users/${user.uid}/students`));
  }, [user, firestore, isOpen]);
  const { data: students } = useCollection<Student>(studentsQuery);


  useEffect(() => {
    setResult(test?.analysis || null);
  }, [test]);
  
  const generateCsvData = (): string => {
    if (!testResults || testResults.length === 0 || !test?.questions) {
        return '';
    }
    
    const questions = test.questions;
    const answerKey = questions.map(q => q.correctAnswer);
    const questionCount = questions.length;
    const headers = ['StudentID', ...Array.from({ length: questionCount }, (_, i) => `Item_${i + 1}`)];
    
    const data = testResults.map(res => {
        const row: Record<string, string | number> = { StudentID: res.studentId };
        
        res.answers.forEach((studentAnswer, index) => {
           if (index < answerKey.length) {
                const isCorrect = studentAnswer === answerKey[index];
                row[`Item_${index + 1}`] = isCorrect ? 1 : 0;
           }
        });

        // Ensure all item columns are present even if answers array is shorter
        for(let i=res.answers.length; i < questionCount; i++){
            row[`Item_${i + 1}`] = 0;
        }

        return row;
    });

    return Papa.unparse({
        fields: headers,
        data: data,
    });
  }

  const handleStartAnalysis = async () => {
    const csvData = generateCsvData();
    
    if (!csvData || !test || !user || !firestore) {
      setError("Tahlil uchun ma'lumotlar to'liq emas (Natijalar yoki test topilmadi).");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    toast({ title: "SI Tahlili Boshlandi...", description: "Bu jarayon bir necha daqiqa vaqt olishi mumkin." });

    try {
      const analysisResult = await performRaschAnalysis({ csvData, totalMaxScore: test.totalMaxScore });
      setResult(analysisResult);

      const testDocRef = doc(firestore, `users/${user.uid}/tests`, test.id);
      const batch = writeBatch(firestore);

      // Update the main analysis object on the test document
      batch.update(testDocRef, { analysis: analysisResult });
      
      // Update each individual testResult document
      analysisResult.studentResults.forEach(res => {
        const resultDocRef = doc(firestore, `users/${user.uid}/tests/${test.id}/testResults`, res.studentId);
        batch.update(resultDocRef, {
            finalScore: res.finalScore,
            grade: res.grade,
            percent: res.percent,
            theta: res.theta,
            rawScore: res.rawScore,
            totalQuestions: res.totalQuestions,
            answerCorrectness: res.answerCorrectness,
        });
      });
      
      await batch.commit();

      toast({
        title: 'Tahlil yakunlandi!',
        description: "O'quvchi qobiliyatlari, savol qiyinchiliklari hisoblandi va barcha natijalar yangilandi."
      });
    } catch (e: any) {
      console.error("AI analysis error:", e);
      setError(e.message || "Tahlil paytida kutilmagan xatolik yuz berdi.");
      toast({
        variant: 'destructive',
        title: 'Tahlilda xatolik',
        description: e.message || "SI modelidan javob olib bo'lmadi.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    onOpenChange(false);
  }
  
  const getStudentName = (studentId: string) => {
    return students?.find(s => s.id === studentId)?.name || studentId;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit />
            SI Yordamida Rasch Modeli Tahlili
          </DialogTitle>
          <DialogDescription>
            Ushbu vosita o'quvchilarning qobiliyati (theta) va savollarning qiyinligini (beta) hisoblab, umumiy xulosa beradi.
          </DialogDescription>
        </DialogHeader>

        {(!result || !result.summary) && (
            <Alert variant="default" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Tahlil qanday ishlaydi?</AlertTitle>
                <AlertDescription>
                    "Tahlilni Boshlash" tugmasi bosilganda, o'quvchilarning javoblar matritsasi matematik hisoblanadi va natijalar SIga umumiy xulosa yozish uchun yuboriladi.
                </AlertDescription>
            </Alert>
        )}

        {result?.summary && (
             <Alert variant="default" className="mt-4 bg-primary/5 border-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary">SI Xulosasi</AlertTitle>
                <AlertDescription className="text-foreground">
                    {result.summary}
                </AlertDescription>
            </Alert>
        )}
        
        {isLoading && (
            <div className='flex flex-col items-center justify-center gap-4 py-12'>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className='text-lg font-medium text-muted-foreground'>Tahlil qilinmoqda, iltimos kuting...</p>
                <p className='text-sm text-muted-foreground/80'>Bu jarayon bir necha daqiqa vaqt olishi mumkin.</p>
            </div>
        )}

        {error && (
            <div className='text-center py-8 text-destructive'>
                <p className='font-semibold'>Xatolik yuz berdi</p>
                <p className='text-sm mt-1'>{error}</p>
            </div>
        )}

        {result && !isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                    <h3 className="font-semibold mb-2">O'quvchilar Qobiliyati (Theta)</h3>
                     <ScrollArea className="h-72 rounded-md border">
                        <table className='w-full text-sm'>
                            <thead className='sticky top-0 bg-secondary'>
                                <tr>
                                    <th className='p-2 text-left font-medium'>O'quvchi</th>
                                    <th className='p-2 text-right font-medium'>Qobiliyat (θ)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.studentResults && [...result.studentResults].sort((a,b) => b.theta - a.theta).map(s => (
                                    <tr key={s.studentId} className='border-b'>
                                        <td className='p-2 font-medium'>{getStudentName(s.studentId)}</td>
                                        <td className='p-2 text-right font-mono'>{s.theta.toFixed(3)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ScrollArea>
                </div>
                 <div>
                    <h3 className="font-semibold mb-2">Savollar Qiyinligi (Beta)</h3>
                     <ScrollArea className="h-72 rounded-md border">
                        <table className='w-full text-sm'>
                            <thead className='sticky top-0 bg-secondary'>
                                <tr>
                                    <th className='p-2 text-left font-medium'>Savol</th>
                                    <th className='p-2 text-right font-medium'>Qiyinlik (β)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.itemDifficulty && [...result.itemDifficulty].sort((a,b) => b.beta - a.beta).map(i => (
                                    <tr key={i.item} className='border-b'>
                                        <td className='p-2'>{i.item.replace('_', ' ')}</td>
                                        <td className='p-2 text-right font-mono'>{i.beta.toFixed(3)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ScrollArea>
                </div>
            </div>
        )}


        <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Yopish
            </Button>
            <Button onClick={handleStartAnalysis} disabled={isLoading || isLoadingResults}>
                {isLoading || isLoadingResults ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                {result ? 'Qayta Tahlil Qilish' : 'Tahlilni Boshlash'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    