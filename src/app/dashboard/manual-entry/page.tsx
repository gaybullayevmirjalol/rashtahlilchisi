'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { collection, query, where, doc, serverTimestamp, getDocs, setDoc } from 'firebase/firestore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { Test, Student } from '@/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PenSquare, FileWarning, Save, Loader2, CheckCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const answerSchema = z.object({ value: z.string().nullable() });

const manualEntryFormSchema = z.object({
  answers: z.array(answerSchema),
});

type ManualEntryFormData = z.infer<typeof manualEntryFormSchema>;

export default function ManualEntryPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [submittedStudentIds, setSubmittedStudentIds] = useState<string[]>([]);
  
  // Fetch active tests
  const activeTestsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/tests`), where('status', '==', 'Boshlandi'));
  }, [user, firestore]);
  const { data: activeTests, isLoading: isLoadingTests } = useCollection<Test>(activeTestsQuery);
  const selectedTest = useMemo(() => activeTests?.find(t => t.id === activeTestId), [activeTests, activeTestId]);

  // Fetch all students
  const studentsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/students`));
  }, [user, firestore]);
  const { data: allStudents, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);

  // Fetch existing results for the selected test to filter out submitted students
   useEffect(() => {
    if (!selectedTest || !firestore) {
      setSubmittedStudentIds([]);
      return;
    }
    const fetchResults = async () => {
      if (!user) return;
      const resultsRef = collection(firestore, `users/${user.uid}/tests/${selectedTest.id}/testResults`);
      const snapshot = await getDocs(resultsRef);
      const ids = snapshot.docs.map(doc => doc.id);
      setSubmittedStudentIds(ids);
    };
    fetchResults();
  }, [selectedTest, user, firestore]);

  const availableStudents = useMemo(() => {
    return allStudents?.filter(s => !submittedStudentIds.includes(s.id)) || [];
  }, [allStudents, submittedStudentIds]);


  const form = useForm<ManualEntryFormData>({
    resolver: zodResolver(manualEntryFormSchema),
    defaultValues: {
      answers: [],
    },
  });

  const { isSubmitting } = form.formState;

  // Reset form when test or student changes
  useEffect(() => {
    const questionCount = selectedTest?.questions.length || 0;
    form.reset({
      answers: Array.from({ length: questionCount }, () => ({ value: null })),
    });
  }, [selectedTest, studentId, form]);

  const onSubmit = async (data: ManualEntryFormData) => {
    if (!user || !selectedTest || !studentId || !selectedTest.questions || selectedTest.questions.length === 0 || !firestore) {
        toast({ variant: 'destructive', title: 'Ma\'lumotlar to\'liq emas', description: 'Iltimos, test, o\'quvchini tanlang va testda savollar mavjudligiga ishonch hosil qiling.'});
        return;
    }
    
    const studentAnswersArray = data.answers.map(a => a.value);
    const answerKey = selectedTest.questions.map(q => q.correctAnswer);
    const questionCount = selectedTest.questions.length;

    try {
        toast({ title: "Saqlanmoqda...", description: "Dastlabki natija saqlanmoqda. Yakuniy tahlil test yakunlangach amalga oshiriladi." });
        
        let score = 0;
        studentAnswersArray.forEach((answer, index) => {
          if (answer && answer === answerKey[index]) {
            score++;
          }
        });
        
        // This is a simple percentage score, not the final Rasch-scaled score
        const initialScore = (score / questionCount) * 100;
        
        const resultDocRef = doc(firestore, `users/${user.uid}/tests/${selectedTest.id}/testResults`, studentId);

        await setDoc(resultDocRef, {
            id: studentId,
            studentId: studentId,
            testId: selectedTest.id,
            answers: studentAnswersArray,
            score: initialScore, 
            submittedAt: serverTimestamp(),
            // grade and analysis will be added when the test is finished
        }, { merge: true });
        
        const studentName = allStudents?.find(s => s.id === studentId)?.name || "Talaba";
        
        toast({ 
            title: 'Muvaffaqiyatli Saqlandi!', 
            description: `${studentName} uchun dastlabki natija saqlandi: ${initialScore.toFixed(1)}%.`,
            action: <div className="p-2 bg-green-500 text-white rounded-full"><CheckCircle size={20} /></div>,
        });

        setSubmittedStudentIds(prev => [...prev, studentId]);
        setStudentId(null);
        form.reset({
            answers: Array.from({ length: questionCount }, () => ({ value: null })),
        });

    } catch(e: any) {
        console.error("Manual entry submission error:", e);
        toast({
            variant: 'destructive',
            title: 'Saqlashda xatolik',
            description: e.message || "Natijani saqlashda kutilmagan xatolik yuz berdi."
        });
    }
  };
  
  const AnswerChoices = ['A', 'B', 'C', 'D', 'E'];

  if (!isLoadingTests && (!activeTests || activeTests.length === 0)) {
     return (
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileWarning /> Qo'lda kiritish uchun test mavjud emas</CardTitle>
          <CardDescription>
            Javob varaqlarini qo'lda kiritish uchun avval testni boshlashingiz kerak.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4 text-center">
           <p className="max-w-md text-muted-foreground">
             Iltimos, 'Testlar' bo'limidan testlardan birini "Boshlandi" holatiga o'tkazing.
           </p>
        </CardContent>
      </Card>
     );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><PenSquare/> Natijalarni Qo'lda Kiritish</CardTitle>
        <CardDescription>
          Aktiv testlar uchun o'quvchilarning javoblarini qo'lda kiriting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Aktiv Testni Tanlang</Label>
            {isLoadingTests ? <Skeleton className="h-10 w-full" /> : (
              <Select onValueChange={setActiveTestId} value={activeTestId || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Testni tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {activeTests?.map(test => (
                    <SelectItem key={test.id} value={test.id}>
                      {test.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
           <div className="space-y-2">
            <Label>O'quvchini Tanlang</Label>
            {isLoadingStudents ? <Skeleton className="h-10 w-full" /> : (
              <Select onValueChange={setStudentId} value={studentId || ''} disabled={!activeTestId}>
                <SelectTrigger>
                  <SelectValue placeholder="O'quvchini tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {availableStudents.length > 0 ? (
                    availableStudents.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-students" disabled>
                        Barcha o'quvchilar kiritilgan
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        
        {selectedTest && studentId && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Alert className='mb-4'>
                    <AlertTitle>Javoblarni kiritish</AlertTitle>
                    <AlertDescription>
                        {allStudents?.find(s => s.id === studentId)?.name} uchun javoblarni belgilang.
                    </AlertDescription>
                </Alert>
                <ScrollArea className="h-[450px] w-full rounded-md border">
                   <div className="space-y-4 p-4">
                    {selectedTest.questions.map((question, index) => (
                      <FormField
                        key={index}
                        control={form.control}
                        name={`answers.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-3">
                            <div className="mb-2 sm:mb-0">
                                <FormLabel className='font-semibold'>{question.id}-savol</FormLabel>
                            </div>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value ?? ''}
                                className="flex items-center space-x-2"
                              >
                                {AnswerChoices.map(choice => (
                                    <FormItem key={choice} className="flex items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem value={choice} />
                                      </FormControl>
                                      <FormLabel className="font-normal cursor-pointer p-1">{choice}</FormLabel>
                                    </FormItem>
                                ))}
                              </RadioGroup>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </ScrollArea>
                <div className='flex justify-end mt-6'>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                        Natijani Saqlash
                    </Button>
                </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
