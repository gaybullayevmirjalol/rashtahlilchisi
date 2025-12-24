'use client';

import { z } from 'zod';
import type { RaschAnalysisOutput as RaschOutputTypeFromFlow } from '@/ai/flows';


// This type is now imported from the flow itself to ensure they are always in sync.
export type RaschAnalysisOutput = RaschOutputTypeFromFlow;

export type QuestionType = 'single_choice' | 'multi_choice' | 'handwritten' | 'match' | 'cluster';

export interface Question {
    id: string;
    type: QuestionType;
    correctAnswer: string;
    section: string;
}


export interface UserProfile {
    id: string;
    login: string;
    email: string;
    role: 'admin' | 'teacher';
    scanLimit: number;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
}

export interface Test {
  id: string;
  name: string;
  userId: string;
  status: 'Yaratildi' | 'Boshlandi' | 'Yakunlandi';
  createdAt: { seconds: number, nanoseconds: number } | null;
  // New fields for National Certificate standard
  subjectName: string;
  sections: string[];
  questions: Question[];
  totalMaxScore: number;
  logoUrl?: string; // Logo specific to this test
  analysis?: RaschAnalysisOutput;
  // For simplicity, let's add answerKey back here for the telegram bot logic
  answerKey?: string[];
  questionCount: number;
}

export interface TestResult {
  id: string;
  studentId: string;
  testId: string;
  score: number; // raw score
  finalScore?: number; // scaled score 
  grade?: string;
  percent?: number;
  theta?: number;
  rawScore?: number;
  totalQuestions?: number;
  answers: (string | null)[];
  answerCorrectness?: boolean[];
  submittedAt: any; // Can be Firebase's Timestamp
}

export interface Student {
    id: string;
    name: string;
    userId: string;
    groupId?: string;
    avatarUrl?: string;
    createdAt?: { seconds: number, nanoseconds: number };
}

export interface Group {
    id: string;
    name: string;
    userId: string;
    createdAt?: { seconds: number, nanoseconds: number };
}

export interface SiteSettings {
    id: 'global';
    logoUrl?: string;
}

export interface RequiredChannel {
  name: string;
  link: string;
}

export interface BotSettings {
    id: 'global';
    token: string;
    requiredChannels: RequiredChannel[];
}
