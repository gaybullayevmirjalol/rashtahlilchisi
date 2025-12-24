'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { PlusCircle, Users, ClipboardCheck, Percent, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/stat-card';
import type { Test, TestResult, Student } from '@/types';
import { RecentResultsCard } from '@/components/dashboard/recent-results-card';
import Link from 'next/link';


export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Queries for dashboard stats
  const studentsQuery = useMemoFirebase(() => 
    (user && firestore) ? query(collection(firestore, `users/${user.uid}/students`)) : null
  , [user, firestore]);

  const finishedTestsQuery = useMemoFirebase(() =>
    (user && firestore) ? query(collection(firestore, `users/${user.uid}/tests`), where('status', '==', 'Yakunlandi')) : null
  , [user, firestore]);
  
  const lastFinishedTestQuery = useMemoFirebase(() =>
    (user && firestore) ? query(collection(firestore, `users/${user.uid}/tests`), where('status', '==', 'Yakunlandi'), orderBy('createdAt', 'desc'), limit(1)) : null
  , [user, firestore]);

  const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);
  const { data: finishedTests, isLoading: isLoadingFinishedTests } = useCollection<Test>(finishedTestsQuery);
  
  const [avgScore, setAvgScore] = useState<string>('N/A');
  const [totalResults, setTotalResults] = useState<number>(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  
  const { data: lastFinishedTests, isLoading: isLoadingLastTest } = useCollection<Test>(lastFinishedTestQuery);
  const lastFinishedTest = lastFinishedTests?.[0];

  const lastTestResultsQuery = useMemoFirebase(() => {
    if (!user || !lastFinishedTest || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/tests/${lastFinishedTest.id}/testResults`));
  }, [user, lastFinishedTest, firestore]);

  const { data: lastTestResults, isLoading: isLoadingLastResults } = useCollection<TestResult>(lastTestResultsQuery);


  // Re-calculate aggregate stats when finishedTests data changes
  useEffect(() => {
    const calculateAggregates = async () => {
        if (!finishedTests || !user || !firestore) {
            if (!isLoadingFinishedTests) {
                setAvgScore('N/A');
                setTotalResults(0);
                setIsLoadingStats(false);
            }
            return;
        }

        setIsLoadingStats(true);
        let totalScoreSum = 0;
        let resultsCount = 0;
        
        for (const test of finishedTests) {
            const resultsColRef = collection(firestore, `users/${user.uid}/tests/${test.id}/testResults`);
            const resultsSnapshot = await getDocs(resultsColRef);
            resultsSnapshot.forEach(resultDoc => {
                const resultData = resultDoc.data() as TestResult;
                // Use the final, scaled score for calculations
                if (typeof resultData.finalScore === 'number') {
                    totalScoreSum += resultData.finalScore;
                    resultsCount++;
                }
            });
        }
        
        setTotalResults(resultsCount);

        if (resultsCount > 0) {
            const averageScore = totalScoreSum / resultsCount;
            // The score is already out of 75, so just format it.
            setAvgScore(`${averageScore.toFixed(2)}`);
        } else {
            setAvgScore('N/A');
        }

        setIsLoadingStats(false);
    };
    
    calculateAggregates();
  }, [finishedTests, user, isLoadingFinishedTests, firestore]);

  
  const isLoading = isLoadingStudents || isLoadingStats || isLoadingLastTest;
  
  const sortedStudentsWithResults = useMemo(() => {
      if (!students || !lastTestResults) return [];
      return students
          .map(student => {
              const result = lastTestResults.find(r => r.studentId === student.id);
              if (!result) return null;
              // Ensure we only show results that have been fully analyzed
              if (result.finalScore === undefined || result.grade === undefined) return null;
              return { student, result };
          })
          .filter((item): item is { student: Student; result: TestResult } => item !== null)
          .sort((a, b) => (b.result.finalScore || 0) - (a.result.finalScore || 0));
  }, [students, lastTestResults]);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Boshqaruv paneli</h1>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/tests/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Yangi Test
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Jami Talabalar" value={isLoadingStudents ? '...' : String(students?.length || 0)} icon={Users} />
          <StatCard title="Yakunlangan Testlar" value={isLoadingFinishedTests ? '...' : String(finishedTests?.length || 0)} icon={ClipboardCheck} />
          <StatCard title="O'rtacha Ball" value={isLoading ? '...' : avgScore} icon={Percent} color="text-green-500" />
          <StatCard title="Jami Natijalar" value={isLoading ? '...' : String(totalResults)} icon={BarChart} color="text-blue-500" />
        </div>

        <div className="grid gap-6">
           <RecentResultsCard
             test={lastFinishedTest}
             results={sortedStudentsWithResults}
             isLoading={isLoading || isLoadingLastResults}
           />
        </div>
      </div>
    </>
  );
}
