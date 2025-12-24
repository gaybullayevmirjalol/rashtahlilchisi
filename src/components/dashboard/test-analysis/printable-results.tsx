'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GradeDistributionChart, GradeDistributionData } from './grade-distribution-chart';
import { ItemDifficultyChart, DifficultyData } from './item-difficulty-chart';
import { AbilityVsScoreChart, AbilityVsScoreData } from './ability-vs-score-chart';
import type { Test, TestResult, Student } from '@/types';

interface PrintableResultsProps {
  test: Test | null;
  chartData: {
    gradeData: GradeDistributionData[];
    difficultyData: DifficultyData[];
    abilityVsScoreData: AbilityVsScoreData[];
  };
  sortedStudentsWithResults: { student: Student, result: TestResult }[];
}

export function PrintableResults({ test, chartData, sortedStudentsWithResults }: PrintableResultsProps) {
  if (!test) {
    return null;
  }
  
  // A4 page is roughly 794px wide. We use this for chart dimensions.
  const chartWidth = 350;

  return (
    <div className="bg-white text-black p-8 font-sans w-[210mm]">
      {/* Page 1: Charts and Summary */}
      <div className="page-break-after">
        <header className="mb-8 text-center">
            <h1 className="text-2xl font-bold">{test.name}</h1>
            <p className="text-lg text-gray-600">Umumiy Tahlil va Natijalar</p>
        </header>
        
        <div className="grid grid-cols-1 gap-8">
            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle>Baholar Taqsimoti</CardTitle>
                </CardHeader>
                <CardContent>
                    <GradeDistributionChart data={chartData.gradeData} />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Savollar Qiyinligi</CardTitle>
                </CardHeader>
                <CardContent>
                    <ItemDifficultyChart data={chartData.difficultyData} />
                </CardContent>
            </Card>
        </div>
      </div>
      
      {/* Page 2: Ability vs Score */}
      <div className="page-break-after">
         <header className="mb-8 text-center">
            <h1 className="text-2xl font-bold">{test.name}</h1>
            <p className="text-lg text-gray-600">Qobiliyat va Ball Bog'liqligi</p>
        </header>
        <Card>
            <CardContent className="pt-6">
                <AbilityVsScoreChart data={chartData.abilityVsScoreData} />
            </CardContent>
        </Card>
      </div>


      {/* Page 3: Results Table */}
      <div>
        <header className="mb-8 text-center">
            <h1 className="text-2xl font-bold">{test.name} - Natijalar Jadvali</h1>
        </header>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className='text-black font-bold'>F.I.SH</TableHead>
                    <TableHead className='text-center text-black font-bold'>To'g'ri Javoblar</TableHead>
                    <TableHead className='text-center text-black font-bold'>Yakuniy Ball</TableHead>
                    <TableHead className='text-center text-black font-bold'>Qobiliyat (θ)</TableHead>
                    <TableHead className='text-center text-black font-bold'>Daraja</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedStudentsWithResults.map(({ student, result }) => {
                    return (
                        <TableRow key={student.id}>
                            <TableCell className="font-medium text-black">{student.name}</TableCell>
                            <TableCell className="text-center text-black">{result.rawScore ?? 0}/{result.totalQuestions ?? test.questionCount}</TableCell>
                            <TableCell className="text-center text-black font-bold">{result.finalScore?.toFixed(2) ?? 'N/A'}</TableCell>
                            <TableCell className="text-center text-black">{result.theta?.toFixed(3) ?? 'N/A'}</TableCell>
                            <TableCell className="text-center text-black font-medium">{result.grade || 'N/A'}</TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
      </div>

      <style jsx global>{`
        @media print {
            .page-break-after {
                page-break-after: always;
            }
        }
        .page-break-after {
            page-break-after: always;
        }
      `}</style>
    </div>
  );
}
