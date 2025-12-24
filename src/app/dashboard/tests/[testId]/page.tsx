'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useState, useRef } from 'react';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MoreVertical, FileDown, Printer, Download, BarChart2, Sparkles, FileSignature } from 'lucide-react';
import type { Student, Test, TestResult } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GradeDistributionChart, GradeDistributionData } from '@/components/dashboard/test-analysis/grade-distribution-chart';
import { ItemDifficultyChart, DifficultyData } from '@/components/dashboard/test-analysis/item-difficulty-chart';
import { AbilityVsScoreChart, AbilityVsScoreData } from '@/components/dashboard/test-analysis/ability-vs-score-chart';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { PrintableResults } from '@/components/dashboard/test-analysis/printable-results';
import { AiAnalysisDialog } from '@/components/dashboard/ai-analysis-dialog';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { StudentAnswersDialog } from '@/components/dashboard/test-analysis/student-answers-dialog';


export default function TestResultPage() {
  const { testId } = useParams();
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();
  const router = useRouter();

  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isAiAnalysisOpen, setIsAiAnalysisOpen] = useState(false);
  const [isStudentAnswersOpen, setStudentAnswersOpen] = useState(false);
  const [selectedStudentAnswers, setSelectedStudentAnswers] = useState<{ student: Student, result: TestResult } | null>(null);

  const testDocRef = useMemoFirebase(() => {
    if (!user || !testId || !firestore) return null;
    return doc(firestore, `users/${user.uid}/tests/${testId as string}`);
  }, [user, testId, firestore]);

  const { data: test, isLoading: isLoadingTest } = useDoc<Test>(testDocRef);

  const studentsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/students`), orderBy('name'));
  }, [user, firestore]);

  const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);
  
  const resultsQuery = useMemoFirebase(() => {
    if (!user || !testId || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/tests/${testId as string}/testResults`),
      orderBy('submittedAt', 'desc')
    );
  }, [user, testId, firestore]);

  const { data: results, isLoading: isLoadingResults } = useCollection<TestResult>(resultsQuery);

  const isLoading = isLoadingTest || isLoadingStudents || isLoadingResults;
  
  const questionNumbers = Array.from({ length: test?.questions.length || 0 }, (_, i) => i + 1);

  const sortedStudentsWithResults = useMemo(() => {
      if (!students || !results) return [];
      const studentsWithResults = students
          .map(student => {
              const result = results.find(r => r.studentId === student.id);
              if (!result) return null;
              return { student, result };
          })
          .filter((item): item is { student: Student; result: TestResult } => item !== null)
          
      return studentsWithResults.sort((a, b) => (b.result.finalScore || 0) - (a.result.finalScore || 0));
  }, [students, results]);


  const chartData = useMemo(() => {
    if (!sortedStudentsWithResults.length || !test?.analysis) {
      return {
        gradeData: [],
        difficultyData: [],
        abilityVsScoreData: [],
      };
    }

    const gradeCounts = sortedStudentsWithResults.reduce((acc, { result }) => {
      const grade = result.grade || 'N/A';
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const gradeOrder = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'F', 'N/A'];
    const gradeData: GradeDistributionData[] = gradeOrder
      .filter(grade => gradeCounts[grade] > 0)
      .map(grade => ({
        name: grade,
        "O'quvchilar soni": gradeCounts[grade],
      }));

    const difficultyData: DifficultyData[] = test.analysis.itemDifficulty
        .sort((a, b) => b.beta - a.beta)
        .map(item => ({
            name: item.item.replace('_', ' '),
            qiyinlik: parseFloat(item.beta.toFixed(3)),
        })) || [];
        
    const abilityVsScoreData: AbilityVsScoreData[] = sortedStudentsWithResults.map(({ student, result }) => ({
        name: student.name,
        qobiliyat: result.theta ? parseFloat(result.theta.toFixed(3)) : 0,
        ball: result.finalScore ? parseFloat(result.finalScore.toFixed(2)) : 0,
    }));

    return { gradeData, difficultyData, abilityVsScoreData };
  }, [sortedStudentsWithResults, test]);

  const getGradeVariant = (grade?: string): BadgeProps['variant'] => {
    if (!grade || grade === 'N/A' || grade === 'F') return 'destructive';
    if (grade.startsWith('A')) return 'default';
    if (grade.startsWith('B')) return 'secondary';
    if (grade.startsWith('C')) return 'outline';
    return 'outline';
  };
  
  const handleStudentClick = (studentId: string) => {
    router.push(`/dashboard/tests/${testId}/results/${studentId}`);
  };
  
    const getCsvDataForRasch = (): string => {
        if (!test || !results || results.length === 0) return '';
        
        const questionCount = test.answerKey?.length || 0;
        const headers = ['StudentID', ...Array.from({ length: questionCount }, (_, i) => `Item_${i + 1}`)];
        
        const data = results.map(res => {
            const row: Record<string, string | number> = { StudentID: res.studentId };
            test.answerKey?.forEach((correctAnswer, index) => {
                const studentAnswer = res.answers[index];
                row[`Item_${index + 1}`] = studentAnswer === correctAnswer ? 1 : 0;
            });
            return row;
        });

        return Papa.unparse({
            fields: headers,
            data: data,
        });
    };


  const getCsvData = (): string => {
        if (!test || !sortedStudentsWithResults.length) return '';

        let headers: string[];
        let data: (Record<string, string | number>)[];
        
        headers = ['T/R', 'F.I.SH', 'Ball', 'Foiz', 'Daraja'];
        data = sortedStudentsWithResults.map(({ student, result }, index) => ({
            'T/R': index + 1,
            'F.I.SH': student.name,
            'Ball': result.finalScore?.toFixed(2) || 'N/A',
            'Foiz': result.percent?.toFixed(1) + '%' || 'N/A',
            'Daraja': result.grade || 'N/A',
        }));
        
        return Papa.unparse({
            fields: headers,
            data: data,
        });
    };
  
  const handleExport = async (format: 'pdf' | 'csv' | 'print') => {
    if (!test || !results || !students) {
        toast({ variant: 'destructive', title: 'Ma\'lumotlar yetarli emas' });
        return;
    }
    
    setIsPrinting(true);
    toast({ title: 'Eksport boshlandi...', description: 'Hujjat tayyorlanmoqda, iltimos kuting.' });

    const fileName = `${test.name}-natijalar`;

    if (format === 'csv') {
        const csv = getCsvData();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${fileName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsPrinting(false);
        toast({ title: 'Muvaffaqiyatli!', description: 'Natijalar CSV formatida yuklab olindi.' });
        return;
    }

    if (format === 'pdf' || format === 'print') {
        const input = printRef.current;
        if (!input) {
            setIsPrinting(false);
            toast({ variant: 'destructive', title: 'Xatolik', description: 'Chop etish uchun element topilmadi.' });
            return;
        }

        try {
            const canvas = await html2canvas(input, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            if (format === 'pdf') {
                pdf.save(`${fileName}.pdf`);
                 toast({ title: 'Muvaffaqiyatli!', description: 'Natijalar PDF formatida yuklab olindi.' });
            } else if (format === 'print') {
                pdf.autoPrint();
                window.open(pdf.output('bloburl'), '_blank');
                 toast({ title: 'Chop etishga yuborildi', description: 'Chop etish oynasi ochildi.' });
            }

        } catch (error) {
            console.error("PDF/Print error: ", error);
            toast({ variant: 'destructive', title: 'Xatolik', description: 'Hujjatni yaratishda xatolik yuz berdi.' });
        } finally {
            setIsPrinting(false);
        }
    }
  };


  if (isLoading) {
    return (
      <div className='flex flex-col gap-4'>
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
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

  if (!test) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Test topilmadi</CardTitle>
          <CardDescription>
            Siz qidirayotgan test mavjud emas yoki o'chirilgan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">
            <Link href="/dashboard/tests" className='flex items-center w-full justify-center'>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Testlar ro'yxatiga qaytish
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }


  return (
      <>
        {
            <AiAnalysisDialog 
                isOpen={isAiAnalysisOpen}
                onOpenChange={setIsAiAnalysisOpen}
                analysisData={test.analysis || null}
                testId={test.id}
            />
        }
        <StudentAnswersDialog
            isOpen={isStudentAnswersOpen}
            onOpenChange={setStudentAnswersOpen}
            data={selectedStudentAnswers}
            test={test}
        />
        <div className='flex flex-col gap-4'>
            <div className='absolute left-[-9999px] top-0'>
                <div ref={printRef}>
                <PrintableResults 
                    test={test}
                    chartData={chartData}
                    sortedStudentsWithResults={sortedStudentsWithResults}
                />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className='flex items-center gap-4'>
                <Button variant="outline" size="icon" className='flex-shrink-0'>
                    <Link href="/dashboard/tests" className='flex items-center w-full justify-center'>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Orqaga</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">{test.name}</h1>
                    <p className="text-sm text-muted-foreground">Test bo'yicha umumiy tahlil</p>
                </div>
            </div>
            <div className='flex items-center gap-2 flex-wrap'>
                <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={isPrinting}>
                    <Download className='mr-2 h-4 w-4' /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={isPrinting}>
                    <FileDown className='mr-2 h-4 w-4' /> CSV
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setIsAiAnalysisOpen(true)}>
                    <Sparkles className='mr-2 h-4 w-4' /> SI Xulosasi
                </Button>
                <Button variant="default" size="sm" onClick={() => handleExport('print')} disabled={isPrinting}>
                    <Printer className='mr-2 h-4 w-4' /> Chop etish
                </Button>
            </div>
            </div>

            <Tabs defaultValue="results-table">
                <TabsList className='mb-4 grid w-full grid-cols-2 md:w-[400px]'>
                    <TabsTrigger value="results-table">Natijalar Jadvali</TabsTrigger>
                    <TabsTrigger value="charts">Grafik Tahlillar</TabsTrigger>
                </TabsList>
                <TabsContent value="results-table">
                    <Card>
                        <CardHeader>
                            <CardTitle>Umumiy Natijalar</CardTitle>
                            <CardDescription>
                            Ushbu test bo'yicha o'quvchilarning yakuniy natijalari. Sertifikatni ko'rish uchun ism ustiga bosing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>F.I.SH</TableHead>
                                        <TableHead className='text-center'>To'g'ri Javoblar</TableHead>
                                        <TableHead className='text-center'>Yakuniy Ball</TableHead>
                                        <TableHead className='text-center'>Foiz</TableHead>
                                        <TableHead className='text-center'>Rash Qobiliyati (θ)</TableHead>
                                        <TableHead className='text-center'>Daraja</TableHead>
                                        <TableHead className="text-right">Amallar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(results && results.length > 0 && sortedStudentsWithResults.length > 0) ? (
                                    sortedStudentsWithResults.map(({student, result}) => {
                                        return (
                                        <TableRow key={student.id} onClick={() => handleStudentClick(student.id)} className="cursor-pointer">
                                            <TableCell className="font-medium">{student.name}</TableCell>
                                            <TableCell className='text-center font-mono'>{result.rawScore ?? 'N/A'}/{result.totalQuestions}</TableCell>
                                            <TableCell className='text-center font-bold'>{result.finalScore?.toFixed(2) ?? 'N/A'}</TableCell>
                                            <TableCell className='text-center font-mono text-muted-foreground'>{result.percent?.toFixed(1) ?? 'N/A'}%</TableCell>
                                            <TableCell className='text-center font-mono'>{result.theta?.toFixed(3) ?? 'N/A'}</TableCell>
                                            <TableCell className='text-center'>
                                                 <Badge variant={getGradeVariant(result.grade)} className={cn({
                                                     "bg-green-600 hover:bg-green-600/90 text-primary-foreground": result.grade === 'A+',
                                                     "bg-green-500 hover:bg-green-500/90 text-primary-foreground": result.grade === 'A',
                                                     "bg-blue-500 hover:bg-blue-500/90 text-primary-foreground": result.grade === 'B+' || result.grade === 'B',
                                                     "bg-yellow-500 hover:bg-yellow-500/90 text-primary-foreground": result.grade === 'C+' || result.grade === 'C',
                                                 })}>
                                                    {result.grade || 'N/A'}
                                                 </Badge>
                                            </TableCell>
                                             <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedStudentAnswers({ student, result });
                                                    setStudentAnswersOpen(true);
                                                }}>
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )})
                                    ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        Hozircha natijalar mavjud emas.
                                        </TableCell>
                                    </TableRow>
                                    )}
                                </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        </Card>
                </TabsContent>
                <TabsContent value="charts">
                    <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
                        <GradeDistributionChart data={chartData.gradeData} />
                        <ItemDifficultyChart data={chartData.difficultyData} />
                        <div className="lg:col-span-2">
                           <AbilityVsScoreChart data={chartData.abilityVsScoreData} />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
      </>
  );
}
