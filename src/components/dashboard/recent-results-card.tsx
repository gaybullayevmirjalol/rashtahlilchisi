'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import type { Test, TestResult, Student } from '@/types';
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface RecentResultsCardProps {
    test: Test | undefined;
    results: { student: Student; result: TestResult }[];
    isLoading: boolean;
}

const avatarPlaceholders = [
    "https://img.icons8.com/color/96/cat-profile.png",
    "https://img.icons8.com/color/96/dog-profile.png",
    "https://img.icons8.com/color/96/panda-profile.png",
    "https://img.icons8.com/color/96/bear-profile.png",
    "https://img.icons8.com/color/96/fox-profile.png",
    "https://img.icons8.com/color/96/lion-profile.png",
    "https://img.icons8.com/color/96/koala-profile.png"
];

const getAvatarUrl = (studentId: string) => {
    // Simple hash function to get a consistent avatar for each student
    const hash = studentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return avatarPlaceholders[hash % avatarPlaceholders.length];
};

const getGradeVariant = (grade?: string): BadgeProps['variant'] => {
    if (!grade || grade === 'N/A' || grade === 'F') return 'destructive';
    if (grade.startsWith('A')) return 'default';
    if (grade.startsWith('B')) return 'secondary';
    if (grade.startsWith('C')) return 'outline';
    return 'outline';
};

export function RecentResultsCard({ test, results, isLoading }: RecentResultsCardProps) {

    const topResults = useMemo(() => results.slice(0, 5), [results]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!test || results.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>So'nggi Natijalar</CardTitle>
                    <CardDescription>Yakunlangan testlar bo'yicha natijalar.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-48 text-center">
                    <Info className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Hozircha yakunlangan test natijalari mavjud emas.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                    <CardTitle>So'nggi Natijalar: "{test.name}"</CardTitle>
                    <CardDescription>Eng yuqori 5 ta natija ko'rsatilgan.</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild className="w-full md:w-auto">
                    <Link href={`/dashboard/tests/${test.id}`} className="flex items-center">
                        Barcha Natijalar <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px] hidden sm:table-cell">T/R</TableHead>
                                <TableHead>F.I.SH</TableHead>
                                <TableHead className="text-right">Ball (75 dan)</TableHead>
                                <TableHead className="text-right hidden sm:table-cell">Foiz</TableHead>
                                <TableHead className="text-right">Daraja</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topResults.map(({ student, result }, index) => {
                                return (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium text-muted-foreground hidden sm:table-cell">{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={getAvatarUrl(student.id)} alt={student.name} />
                                                    <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{student.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">{result.finalScore?.toFixed(2) ?? 'N/A'}</TableCell>
                                        <TableCell className="text-right text-muted-foreground hidden sm:table-cell">{result.percent?.toFixed(1) ?? 'N/A'}%</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={getGradeVariant(result.grade)} className={cn({
                                                "bg-green-600 hover:bg-green-600/80 text-primary-foreground border-transparent": result.grade === "A+",
                                                "bg-green-500 hover:bg-green-500/80 text-primary-foreground border-transparent": result.grade === "A",
                                                "bg-blue-500 hover:bg-blue-500/80 text-primary-foreground border-transparent": result.grade === "B+" || result.grade === "B",
                                                "bg-yellow-500 hover:bg-yellow-500/80 text-primary-foreground border-transparent": result.grade === "C+" || result.grade === "C",
                                            })}>
                                                {result.grade || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
