import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


// Grading function based on the provided scale
export const calculateGrade = (score: number, totalMaxScore: number): 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'F' => {
  const percentage = (score / totalMaxScore) * 100;

  if (percentage >= 93.33) return 'A+'; // 70/75
  if (percentage >= 86.67) return 'A';  // 65/75
  if (percentage >= 80) return 'B+';    // 60/75
  if (percentage >= 73.33) return 'B';  // 55/75
  if (percentage >= 66.67) return 'C+'; // 50/75
  if (percentage >= 61.33) return 'C';  // 46/75
  return 'F';
};
