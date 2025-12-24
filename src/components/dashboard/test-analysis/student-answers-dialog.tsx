'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Student, Test, TestResult } from '@/types';

interface StudentAnswersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: { student: Student; result: TestResult } | null;
  test: Test | null;
}

export function StudentAnswersDialog({ isOpen, onOpenChange, data, test }: StudentAnswersDialogProps) {
  if (!data || !test) return null;

  const { student, result } = data;
  const questionCount = test.questionCount;
  const studentAnswers = result.answers;
  const answerKey = test.answerKey;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{student.name}ning Javoblari</DialogTitle>
          <DialogDescription>
            "{test.name}" testi bo'yicha berilgan javoblar tahlili.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pr-6">
            {Array.from({ length: questionCount }).map((_, index) => {
              const questionNumber = index + 1;
              const studentAnswer = studentAnswers[index];
              const correctAnswer = answerKey?.[index];
              const isCorrect = result.answerCorrectness ? result.answerCorrectness[index] : studentAnswer === correctAnswer;

              return (
                <div
                  key={index}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-lg border-2",
                    isCorrect ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-bold text-muted-foreground">{questionNumber}</span>
                     {isCorrect ? (
                        <Check className="h-5 w-5 text-green-500" />
                     ) : (
                        <X className="h-5 w-5 text-destructive" />
                     )}
                  </div>
                  <div className="mt-2 text-center">
                     <p className="text-xs text-muted-foreground">Sizning javob:</p>
                     <p className="text-lg font-bold">{studentAnswer || "Bo'sh"}</p>
                  </div>
                   {!isCorrect && (
                      <div className="mt-1 text-center border-t pt-1 w-full">
                        <p className="text-xs text-muted-foreground">To'g'ri javob:</p>
                        <p className="text-md font-bold text-green-600">{correctAnswer}</p>
                      </div>
                   )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
