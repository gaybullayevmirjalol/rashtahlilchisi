'use server';
/**
 * @fileOverview This file contains all Genkit flows for the application.
 * It is marked as a 'use server' entry point, and only async functions are exported.
 */

import { genkit, ModelArgument } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';
import type { OmrAnalysisInput, OmrAnalysisOutput } from '@/types/ai';
import Papa from 'papaparse';
import { calculateGrade } from '@/lib/utils';
import { README_CONTENT } from '@/lib/readme-content';


// Initialize Genkit within this server-only file
const ai = genkit({
  plugins: [googleAI()],
});

const STABLE_MODEL_NAME = 'gemini-2.5-flash';

//================================================================
// OMR Analysis Flow
//================================================================

const omrAnalysisPrompt = ai.definePrompt({
    name: 'omrAnalysisPrompt',
    model: googleAI.model(STABLE_MODEL_NAME),
    input: { schema: z.object({
      photoDataUri: z.string(),
      questionCount: z.number(),
    }) },
    output: { schema: z.object({
      answers: z.array(z.string().nullable())
    }) },
    prompt: `You are an expert Optical Mark Recognition (OMR) system. Your task is to analyze the provided image of an answer sheet and determine the selected answer for each question.

The sheet contains {{{questionCount}}} questions. For each question, identify which bubble (A, B, C, or D) is filled in.

- The output must be a single JSON object that strictly adheres to the provided schema.
- The 'answers' array must contain exactly {{{questionCount}}} elements.
- For each question, if a single bubble is clearly filled, return the corresponding letter (e.g., "A", "B", "C", "D").
- If no bubble is filled for a question, or if multiple bubbles are filled, or if the selection is otherwise ambiguous, you **must** return \`null\` for that question's answer.

Analyze the following image:
{{media url=photoDataUri}}`,
});

const omrAnalysisFlow = ai.defineFlow(
    {
        name: 'omrAnalysisFlow',
        inputSchema: z.object({
          photoDataUri: z.string(),
          questionCount: z.number(),
        }),
        outputSchema: z.object({
          answers: z.array(z.string().nullable())
        }),
    },
    async (input) => {
        const { output } = await omrAnalysisPrompt(input);
        if (!output) {
            throw new Error("AI model did not return a valid OMR analysis.");
        }
        if (output.answers.length !== input.questionCount) {
             throw new Error(`AI returned ${output.answers.length} answers, but ${input.questionCount} were expected.`);
        }
        return output;
    }
);

/**
 * A server action to perform OMR sheet analysis using a multimodal AI model.
 * Takes an image of an OMR sheet and returns the scanned answers.
 */
export async function analyzeOmrSheet(input: OmrAnalysisInput): Promise<OmrAnalysisOutput> {
  return await omrAnalysisFlow(input);
}


//================================================================
// Rasch Analysis Flow
//================================================================

const RaschInputSchema = z.object({
  csvData: z.string(),
  totalMaxScore: z.number(),
});

const RaschStudentResultSchema = z.object({
  studentId: z.string(),
  rawScore: z.number(),
  totalQuestions: z.number(),
  theta: z.number(),
  finalScore: z.number(),
  percent: z.number(),
  grade: z.string(),
  answerCorrectness: z.array(z.boolean()),
});

const RaschOutputSchema = z.object({
  studentResults: z.array(RaschStudentResultSchema),
  summary: z.string(),
  itemDifficulty: z.array(z.object({
    item: z.string(),
    beta: z.number(),
  })),
});

export type RaschAnalysisInput = z.infer<typeof RaschInputSchema>;
export type RaschAnalysisOutput = z.infer<typeof RaschOutputSchema>;

const calculateRaschStats = (csvData: string, totalMaxScore: number) => {
    const parsed = Papa.parse<Record<string, string>>(csvData, { header: true, skipEmptyLines: true });
    const studentResponses = parsed.data;

    if (studentResponses.length === 0) {
        throw new Error("CSV data is empty or invalid.");
    }
    
    const itemColumns = Object.keys(studentResponses[0]).filter(key => key.startsWith('Item_'));
    const totalQuestions = itemColumns.length;

    if (totalQuestions === 0) {
        throw new Error("No 'Item_' columns found in CSV data.");
    }

    const studentResults = studentResponses.map(row => {
        const studentId = row.StudentID;
        let rawScore = 0;
        const answerCorrectness: boolean[] = [];

        itemColumns.forEach((colKey) => {
            const isCorrect = row[colKey] === '1';
            if (isCorrect) {
                rawScore++;
            }
            answerCorrectness.push(isCorrect);
        });
        
        let p = rawScore / totalQuestions;
        let theta;

        if (p === 1) {
            theta = 4.5;
        } else if (p === 0) {
            theta = -4.5;
        } else {
             // Standard logit formula with a small adjustment for stability near 0 and 1
            theta = Math.log(p / (1 - p));
        }
        
        const percent = p * 100;
        const finalScore = p * totalMaxScore;
        const grade = calculateGrade(finalScore, totalMaxScore);

        return {
            studentId,
            rawScore,
            totalQuestions,
            theta,
            finalScore,
            percent,
            grade,
            answerCorrectness,
        };
    });

    const itemDifficulty = itemColumns.map((itemKey, index) => {
        let correctCount = studentResponses.reduce((acc, row) => acc + (row[itemKey] === '1' ? 1 : 0), 0);
        let n = studentResponses.length;
        
        let p_item;
        // Continuity correction for beta calculation
        if (correctCount === 0) {
           p_item = 0.5 / n;
        } else if (correctCount === n) {
           p_item = (n - 0.5) / n;
        } else {
           p_item = correctCount / n;
        }
        
        const beta = Math.log((1 - p_item) / p_item);

        return {
            item: `Savol_${index + 1}`,
            beta: isFinite(beta) ? beta : 0,
        };
    });

    return { studentResults, itemDifficulty };
};


const summaryPrompt = ai.definePrompt({
    name: 'raschSummaryPrompt',
    model: googleAI.model(STABLE_MODEL_NAME),
    input: { schema: z.object({
        analysisJSON: z.string(),
    }) },
    output: { schema: z.object({ summary: z.string() }) },
    prompt: `You are an expert psychometrician. Based on the following JSON data from a Rasch analysis, provide a brief, insightful summary in Uzbek.

Your summary should touch upon:
1.  The overall performance of the students (distribution of grades, average score).
2.  The range of student abilities (theta), explaining what high and low theta means.
3.  Point out any particularly difficult (high beta) or easy (low beta) items (questions) and suggest what this might imply.

Do not repeat the raw data. Provide a concise, narrative summary in paragraph form.

Here is the analysis data:
\`\`\`json
{{{analysisJSON}}}
\`\`\`
`,
});


const performRaschAnalysisFlow = ai.defineFlow(
    {
        name: 'performRaschAnalysisFlow',
        inputSchema: RaschInputSchema,
        outputSchema: RaschOutputSchema,
    },
    async (input) => {
        const { studentResults, itemDifficulty } = calculateRaschStats(input.csvData, input.totalMaxScore);

        const summaryInput = {
            studentAbilities: studentResults.map(r => ({ studentId: r.studentId, theta: r.theta, grade: r.grade })),
            itemDifficulties: itemDifficulty,
            overallStats: {
                averageScore: studentResults.reduce((acc, r) => acc + r.finalScore, 0) / studentResults.length,
                totalStudents: studentResults.length,
            }
        };

        const { output: summaryOutput } = await summaryPrompt({
            analysisJSON: JSON.stringify(summaryInput, null, 2),
        });

        if (!summaryOutput) {
            throw new Error("AI model failed to generate a summary.");
        }

        return {
            studentResults,
            summary: summaryOutput.summary,
            itemDifficulty: itemDifficulty,
        };
    }
);

export async function performRaschAnalysis(input: RaschAnalysisInput): Promise<RaschAnalysisOutput> {
    return await performRaschAnalysisFlow(input);
}


//================================================================
// Assistant Flow
//================================================================

const AssistantInputSchema = z.object({
  query: z.string(),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })),
});

const AssistantOutputSchema = z.object({
  response: z.string(),
});

export type AssistantInput = z.infer<typeof AssistantInputSchema>;
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

const assistantPrompt = ai.definePrompt({
    name: 'assistantPrompt',
    model: googleAI.model(STABLE_MODEL_NAME),
    input: { schema: AssistantInputSchema },
    output: { schema: AssistantOutputSchema },
    system: `Siz "RashExam Tahlilchisi" ilovasining yordamchisi (assistent)siz. Sizning vazifangiz foydalanuvchilarning ilovadan foydalanish bo'yicha bergan savollariga o'zbek tilida, aniq, qisqa va tushunarli javob berish.

Ilovada quyidagi asosiy funksiyalar mavjudligini unutmang:
- **Test Yaratish:** Milliy Sertifikat standartlariga mos yangi testlar yaratish, fan nomi, bo'limlari va savollar kalitlarini kiritish.
- **Talabalarni Boshqarish:** Talabalarni qo'shish, guruhlarga bo'lish, CSV orqali import qilish.
- **Skanerlash:** Qurilma kamerasi orqali QR kodli javob varaqalarini skanerlash.
- **Tahlil:** Test yakunlangach, o'quvchilarning natijalari asosida Rasch tahlilini amalga oshirish va har bir o'quvchiga adolatli ball qo'yish.
- **Natijalarni Ko'rish:** Batafsil jadvallar, grafiklar va sertifikat ko'rinishidagi natijalar sahifalari.

Foydalanuvchining savollariga javob berishda mana bu hujjatga tayaning:
---
${README_CONTENT}
---

Qoidalaringiz:
- Har doim o'zbek tilida javob bering.
- Javoblaringizni iloji boricha qisqa va lo'nda tuting.
- Foydalanuvchiga qadam-ba-qadam yo'riqnomalar bering. Masalan: "Buning uchun 'Testlar' sahifasiga o'ting, so'ngra 'Yangi Test Yaratish' tugmasini bosing."
- Kod yoki texnik terminlarni ishlatishdan qoching, agar juda zarur bo'lmasa.
- Har doim xushmuomala bo'ling.`,
    prompt: `{{#each history}}
<role>{{role}}</role>
<content>{{content}}</content>
{{/each}}
<role>user</role>
<content>{{{query}}}</content>`
});


const askAssistantFlow = ai.defineFlow(
    {
        name: 'askAssistantFlow',
        inputSchema: AssistantInputSchema,
        outputSchema: AssistantOutputSchema,
    },
    async (input) => {
        const { output } = await assistantPrompt(input);
        if (!output) {
            throw new Error("AI assistant did not return a valid response.");
        }
        return output;
    }
);

export async function askAssistant(input: AssistantInput): Promise<AssistantOutput> {
    return await askAssistantFlow(input);
}

    