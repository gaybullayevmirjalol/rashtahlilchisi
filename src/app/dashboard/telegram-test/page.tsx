'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, BookOpen, Loader2, Send } from 'lucide-react';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase/hooks';
import { doc } from 'firebase/firestore';
import type { Test, Student } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';


export default function TelegramTestPage() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const firestore = useFirestore();

    const testId = searchParams.get('testId');
    const studentId = searchParams.get('studentId');
    const ownerId = searchParams.get('ownerId');

    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Data Fetching ---
    const testDocRef = useMemoFirebase(() => {
        if (!ownerId || !testId || !firestore) return null;
        return doc(firestore, `users/${ownerId}/tests/${testId}`);
    }, [ownerId, testId, firestore]);

    const studentDocRef = useMemoFirebase(() => {
        if (!ownerId || !studentId || !firestore) return null;
        return doc(firestore, `users/${ownerId}/students/${studentId}`);
    }, [ownerId, studentId, firestore]);

    const { data: test, isLoading: isLoadingTest } = useDoc<Test>(testDocRef);
    const { data: student, isLoading: isLoadingStudent } = useDoc<Student>(studentDocRef);


    useEffect(() => {
        // Initialize Telegram Web App SDK
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            tg.BackButton.show();
            tg.onEvent('backButtonClicked', () => tg.close());
        }

        return () => {
             if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.BackButton.hide();
             }
        }
    }, []);
    
    const handleAnswerChange = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        toast({ title: "Yuborilmoqda...", description: "Javoblaringiz saqlanmoqda." });
        
        try {
            const response = await fetch('/api/telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'submit_test',
                    ownerId,
                    testId,
                    studentId,
                    answers,
                }),
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Natijani saqlashda xatolik yuz berdi.");
            }

            toast({ title: "Muvaffaqiyatli!", description: "Javoblaringiz qabul qilindi. Natijalarni o'qituvchingizdan bilib olasiz." });
            
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.close();
            }

        } catch (error: any) {
            console.error("Submission error:", error);
            toast({
                variant: 'destructive',
                title: "Xatolik!",
                description: error.message || "Natijani yuborishda kutilmagan xatolik yuz berdi.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isLoading = isLoadingTest || isLoadingStudent;

    if (!testId || !studentId || !ownerId) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center justify-center gap-2">
                           <AlertCircle /> Xatolik!
                        </CardTitle>
                        <CardDescription>
                            Testni boshlash uchun kerakli ma'lumotlar (testId, studentId, ownerId) to'liq emas. Iltimos, bot orqali qaytadan urinib ko'ring.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const AnswerChoices = ['A', 'B', 'C', 'D', 'E'];
    const questionsBySection = test?.sections.map(section => ({
        sectionName: section,
        questions: test.questions.filter(q => q.section === section)
    })) || [];

    return (
        <div className="p-2 md:p-4 bg-secondary min-h-screen">
            <Card>
                 <CardHeader>
                    {isLoading ? (
                        <>
                           <Skeleton className="h-7 w-3/4" />
                           <Skeleton className="h-4 w-1/2 mt-1" />
                        </>
                    ) : (
                        <>
                           <CardTitle className="flex items-center gap-2 text-lg">
                                <BookOpen /> {test?.name || "Test Nomi"}
                            </CardTitle>
                            <CardDescription>
                                O'quvchi: <span className="font-semibold text-foreground">{student?.name || "Noma'lum"}</span>
                            </CardDescription>
                        </>
                    )}
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[calc(100vh-230px)]">
                        <div className="space-y-6 pr-4">
                            {isLoading && Array.from({length: 5}).map((_, i) => (
                                <Skeleton key={i} className="h-24 w-full" />
                            ))}

                            {!isLoading && questionsBySection.map(({ sectionName, questions }) => (
                                <div key={sectionName}>
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{sectionName}</h3>
                                    <div className="space-y-1">
                                        {questions.map((question) => (
                                            <RadioGroup
                                                key={question.id}
                                                onValueChange={(value) => handleAnswerChange(question.id, value)}
                                                value={answers[question.id] || ''}
                                                className="flex items-center justify-between p-2 rounded-md hover:bg-background"
                                            >
                                                <Label className="font-bold text-base w-12">{question.id}</Label>
                                                <div className="flex items-center gap-2">
                                                    {AnswerChoices.map(choice => (
                                                        <div key={choice}>
                                                            <RadioGroupItem value={choice} id={`${question.id}-${choice}`} className="peer sr-only" />
                                                            <Label 
                                                                htmlFor={`${question.id}-${choice}`}
                                                                className={cn(
                                                                    "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 text-sm font-bold",
                                                                    "border-muted bg-popover text-popover-foreground",
                                                                    "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground",
                                                                    "hover:bg-accent hover:text-accent-foreground"
                                                                )}
                                                            >
                                                            {choice}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </RadioGroup>
                                        ))}
                                    </div>
                                    <Separator className="my-4" />
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
                 <CardFooter>
                    <Button className="w-full" size="lg" onClick={handleSubmit} disabled={isSubmitting || isLoading}>
                         {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Send className="mr-2 h-5 w-5" />}
                        {isSubmitting ? "Yuborilmoqda..." : "Testni Yakunlash"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}
