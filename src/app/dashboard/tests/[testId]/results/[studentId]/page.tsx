'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { doc } from 'firebase/firestore';
import type { Test, Student, TestResult } from '@/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, XCircle, Printer } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function TestCertificatePage() {
    const { testId, studentId: studentIdFromParam } = useParams();
    const { user } = useUser();
    const router = useRouter();
    const firestore = useFirestore();

    const studentId = Array.isArray(studentIdFromParam) ? studentIdFromParam[0] : studentIdFromParam;

    const testDocRef = useMemoFirebase(() => {
        if (!user || !testId) return null;
        return doc(firestore, `users/${user.uid}/tests/${testId as string}`);
    }, [user, testId, firestore]);
    
    const studentDocRef = useMemoFirebase(() => {
        if (!user || !studentId) return null;
        return doc(firestore, `users/${user.uid}/students/${studentId}`);
    }, [user, studentId, firestore]);

    const resultDocRef = useMemoFirebase(() => {
        if (!user || !testId || !studentId) return null;
        return doc(firestore, `users/${user.uid}/tests/${testId as string}/testResults/${studentId}`);
    }, [user, testId, studentId, firestore]);

    const { data: test, isLoading: isLoadingTest } = useDoc<Test>(testDocRef);
    const { data: student, isLoading: isLoadingStudent } = useDoc<Student>(studentDocRef);
    const { data: result, isLoading: isLoadingResult } = useDoc<TestResult>(resultDocRef);

    const isLoading = isLoadingTest || isLoadingStudent || isLoadingResult;

    const { sectionAnalyses, totalMaxScore, totalUserScore } = useMemo(() => {
        if (!test || !result || !test.questions) return { sectionAnalyses: [], totalMaxScore: 0, totalUserScore: 0 };
        
        let totalMax = test.totalMaxScore || 0;
        let totalUser = result.finalScore || 0;

        const analyses = test.sections.map(sectionName => {
            const questionsInSection = test.questions.filter(q => q.section === sectionName);
            const sectionTotalQuestions = questionsInSection.length;
            
            let userCorrectInSection = 0;
            questionsInSection.forEach(q => {
                const questionIndex = test.questions.findIndex(tq => tq.id === q.id);
                if (questionIndex !== -1 && result.answerCorrectness?.[questionIndex]) {
                    userCorrectInSection++;
                }
            });
            
            const percentage = sectionTotalQuestions > 0 ? (userCorrectInSection / sectionTotalQuestions) * 100 : 0;
            
            return {
                name: sectionName,
                totalQuestions: sectionTotalQuestions,
                correctAnswers: userCorrectInSection,
                percentage: percentage
            };
        });

        return { sectionAnalyses: analyses, totalMaxScore: totalMax, totalUserScore: totalUser };

    }, [test, result]);
    
    const overallPercentage = test?.totalMaxScore ? ( (result?.finalScore || 0) / test.totalMaxScore ) * 100 : 0;
    
    const getGrade = (percentage: number) => {
        if (percentage >= 93.33) return { grade: 'A+', color: 'bg-green-600' };
        if (percentage >= 86.67) return { grade: 'A', color: 'bg-green-500' };
        if (percentage >= 80) return { grade: 'B+', color: 'bg-blue-500' };
        if (percentage >= 73.33) return { grade: 'B', color: 'bg-blue-400' };
        if (percentage >= 66.67) return { grade: 'C+', color: 'bg-yellow-500' };
        if (percentage >= 61.33) return { grade: 'C', color: 'bg-yellow-400' };
        return { grade: 'F', color: 'bg-destructive' };
    }
    
    const { grade, color } = getGrade(overallPercentage);

    if (isLoading) {
        return (
            <div className="p-4 md:p-8 space-y-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!test || !student || !result) {
        return (
             <div className="p-4 md:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Ma'lumotlar topilmadi</CardTitle>
                        <CardDescription>Test, talaba yoki natija topilmadi. URL manzilini tekshiring.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Orqaga
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8 print:bg-white print:p-0">
             <div className="max-w-4xl mx-auto mb-4 print:hidden">
                <div className="flex justify-between items-center">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Orqaga
                    </Button>
                     <Button onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Chop etish
                    </Button>
                </div>
            </div>
            <div id="certificate" className="max-w-4xl mx-auto bg-white dark:bg-background rounded-lg shadow-2xl p-8 print:shadow-none print:rounded-none">
                <header className="flex justify-between items-start border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{test.subjectName} fani bo'yicha natija</h1>
                        <p className="text-muted-foreground">{test.name}</p>
                    </div>
                    <Logo className="h-20 w-20" />
                </header>

                <section className="grid md:grid-cols-3 gap-6 my-8">
                    <div className="md:col-span-2">
                        <h2 className="text-lg font-semibold">{student.name}</h2>
                        <p className="text-sm text-muted-foreground">Talaba</p>
                    </div>
                    <div className="flex md:flex-col md:items-end gap-4 md:gap-0">
                         <div className="text-left md:text-right">
                            <p className="text-sm text-muted-foreground">Umumiy Ball</p>
                            <p className="text-3xl font-bold">{result.finalScore?.toFixed(2) || 'N/A'} / {test.totalMaxScore.toFixed(2)}</p>
                        </div>
                         <div className="text-left md:text-right md:mt-2">
                            <p className="text-sm text-muted-foreground">Daraja</p>
                            <Badge className={`text-lg px-4 py-1 text-white ${color}`}>{result.grade || grade}</Badge>
                        </div>
                    </div>
                </section>
                
                <section>
                    <Card>
                        <CardHeader>
                            <CardTitle>Fan bo'limlari bo'yicha tahlil</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bo'lim</TableHead>
                                        <TableHead className="text-right">Jami Savollar</TableHead>
                                        <TableHead className="text-right">To'g'ri Javoblar</TableHead>
                                        <TableHead className="w-[200px] text-right">O'zlashtirish</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sectionAnalyses.map(section => (
                                        <TableRow key={section.name}>
                                            <TableCell className="font-medium">{section.name}</TableCell>
                                            <TableCell className="text-right">{section.totalQuestions}</TableCell>
                                            <TableCell className="text-right font-bold">{section.correctAnswers}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-sm font-mono">{section.percentage.toFixed(1)}%</span>
                                                    <Progress value={section.percentage} className="w-24 h-2" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </section>

                <section className="mt-8 page-break-before">
                     <Card>
                        <CardHeader>
                            <CardTitle>Batafsil tahlil</CardTitle>
                            <CardDescription>Har bir savolga berilgan javoblar tahlili.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {test.questions.map((q, index) => {
                                    const isCorrect = result.answerCorrectness?.[index];
                                    return (
                                        <div key={q.id} className={`flex items-center gap-2 p-2 rounded-md border ${isCorrect ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                                            {isCorrect ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                                            <div className="flex flex-col">
                                                 <span className="text-xs text-muted-foreground">{q.section}</span>
                                                 <span className="font-bold text-sm">Savol {q.id}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </section>
                <footer className="mt-8 text-center text-xs text-gray-400 print:block hidden">
                    RashExam Tahlilchisi &mdash; {new Date().getFullYear()}
                </footer>
            </div>
             <style jsx global>{`
                @media print {
                    body {
                        background-color: #fff;
                    }
                    .page-break-before {
                        page-break-before: always;
                    }
                }
            `}</style>
        </div>
    );
}
