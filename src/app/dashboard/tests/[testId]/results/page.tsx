'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { doc, collection, getDocs, query } from 'firebase/firestore';
import type { Test, Student, TestResult, Question } from '@/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Logo } from '@/components/logo';

interface EnrichedResult extends TestResult {
    studentName?: string;
}

interface SectionAnalysis {
    name: string;
    maxScore: number;
    userScore: number;
    percentage: number;
}

export default function TestCertificateRedirectPage() {
    const { testId, studentId: studentIdFromParam } = useParams();
    const router = useRouter();

    const studentId = Array.isArray(studentIdFromParam) ? studentIdFromParam[0] : studentIdFromParam;

    // This page immediately redirects to the main results page for the test.
    // The individual student certificate is now at /dashboard/tests/[testId]/results/[studentId]
    useMemo(() => {
        if (testId) {
            router.replace(`/dashboard/tests/${testId}`);
        } else {
            router.replace('/dashboard/tests');
        }
    }, [testId, router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <p>Yo'naltirilmoqda...</p>
        </div>
    );
}
