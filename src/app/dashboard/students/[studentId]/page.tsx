'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo } from 'react';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { doc, collection, query, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart2, Award, User as UserIcon } from 'lucide-react';
import type { Student, Test, TestResult } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React from 'react';


interface StudentTestResult extends TestResult {
    testName: string;
    testStatus: Test['status'];
    testQuestionCount: number;
}

export default function StudentProfilePage() {
  const { studentId } = useParams();
  const { user } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  // 1. Fetch student data
  const studentDocRef = useMemoFirebase(() => {
    if (!user || !studentId || !firestore) return null;
    return doc(firestore, `users/${user.uid}/students/${studentId as string}`);
  }, [user, studentId, firestore]);
  const { data: student, isLoading: isLoadingStudent } = useDoc<Student>(studentDocRef);

  // 2. Fetch all user's tests
  const testsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/tests`));
  }, [user, firestore]);
  const { data: allTests, isLoading: isLoadingTests } = useCollection<Test>(testsQuery);

  // 3. Fetch all results for the student
  const [studentResults, setStudentResults] = React.useState<StudentTestResult[]>([]);
  const [isLoadingResults, setIsLoadingResults] = React.useState(true);

  React.useEffect(() => {
    const fetchAllResults = async () => {
      if (!user || !allTests || allTests.length === 0 || !firestore) {
        setIsLoadingResults(false);
        return;
      }

      setIsLoadingResults(true);
      const results: StudentTestResult[] = [];
      for (const test of allTests) {
        if (test.status !== 'Yakunlandi') continue;
        const resultRef = doc(firestore, `users/${user.uid}/tests/${test.id}/testResults/${studentId as string}`);
        const resultSnap = await getDoc(resultRef);

        if (resultSnap.exists()) {
          const resultData = resultSnap.data() as TestResult;
          // Ensure we only process results that have been analyzed and have final scores
          if (resultData.finalScore !== undefined) {
             results.push({
                ...resultData,
                testId: test.id,
                testName: test.name,
                testStatus: test.status,
                testQuestionCount: test.questionCount,
              });
          }
        }
      }
      setStudentResults(results.sort((a,b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0)));
      setIsLoadingResults(false);
    };

    if (!isLoadingTests) {
      fetchAllResults();
    }
  }, [allTests, isLoadingTests, user, studentId, firestore]);
  
  const bestResult = useMemo(() => {
      if(studentResults.length === 0) return null;
      // Ensure finalScore is not null or undefined before comparing
      return studentResults.reduce((best, current) => 
          (current.finalScore !== undefined && best.finalScore !== undefined && current.finalScore > best.finalScore) ? current : best
      );
  }, [studentResults]);

  const isLoading = isLoadingStudent || isLoadingTests || isLoadingResults;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-24" />
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className='space-y-2'>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!student) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Talaba topilmadi</CardTitle>
                <CardDescription>
                Siz qidirayotgan talaba mavjud emas yoki o'chirilgan.
                </CardDescription>
            </CardHeader>
             <CardContent>
                <Button variant="outline">
                    <Link href="/dashboard/students">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Talabalar ro'yxatiga qaytish
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/dashboard/students">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Orqaga</span>
                </Link>
            </Button>
            <h1 className="text-xl font-bold tracking-tight">Talaba Profili</h1>
        </div>

        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                 <Avatar className="h-20 w-20">
                    <AvatarImage src={student.avatarUrl} />
                    <AvatarFallback>
                        <UserIcon className="h-10 w-10" />
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <CardTitle>{student.name}</CardTitle>
                    <CardDescription>ID: {student.id}</CardDescription>
                </div>
            </CardHeader>
        </Card>

        {bestResult && (
             <Card className="bg-gradient-to-r from-yellow-100 to-amber-200 dark:from-yellow-900/50 dark:to-amber-800/50 border-amber-300">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                        <Award /> Eng Yaxshi Natija
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <p className="text-muted-foreground">{bestResult.testName}</p>
                        <p className="text-3xl font-bold">{bestResult.finalScore?.toFixed(2) || 'N/A'} <span className="text-lg font-normal text-muted-foreground">/ {allTests?.find(t => t.id === bestResult.testId)?.totalMaxScore.toFixed(2)} ball</span></p>
                    </div>
                     <Button asChild>
                        <Link href={`/dashboard/tests/${bestResult.testId}`} className="flex items-center">
                            <BarChart2 className="mr-2 h-4 w-4" />
                            Test Tahlilini Ko'rish
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        )}

        <Card>
            <CardHeader>
                <CardTitle>Topshirilgan Testlar ({studentResults.length})</CardTitle>
                <CardDescription>Talabaning yakunlangan testlari bo'yicha natijalari.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Test Nomi</TableHead>
                            <TableHead>Sana</TableHead>
                            <TableHead className="text-right">Ball</TableHead>
                            <TableHead className="text-right">Foiz</TableHead>
                            <TableHead className="text-right">Daraja</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {studentResults.length > 0 ? (
                            studentResults.map(result => (
                                <TableRow key={result.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/tests/${result.testId}/results/${student.id}`)}>
                                    <TableCell className="font-medium">{result.testName}</TableCell>
                                    <TableCell>
                                        {result.submittedAt ? format(new Date(result.submittedAt.seconds * 1000), 'dd/MM/yyyy') : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-bold">{result.finalScore?.toFixed(2) || 'N/A'}</TableCell>
                                    <TableCell className="text-right">{result.percent?.toFixed(1) || 'N/A'}%</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="secondary">{result.grade || 'N/A'}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    Bu talaba uchun yakunlangan test natijalari mavjud emas.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
