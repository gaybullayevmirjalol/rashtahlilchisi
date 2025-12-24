import { z } from 'zod';

// This file is simplified as the primary Rasch types are now co-located with the flow.

const OmrAnalysisInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of an OMR answer sheet, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  questionCount: z.number().describe('The total number of questions to look for on the sheet.'),
});
export type OmrAnalysisInput = z.infer<typeof OmrAnalysisInputSchema>;


const OmrAnalysisOutputSchema = z.object({
  answers: z.array(z.string().nullable()).describe("An array of the student's selected answers (e.g., 'A', 'B', 'C', 'D'). If a question is unanswered or the answer is ambiguous, the value should be null.")
});
export type OmrAnalysisOutput = z.infer<typeof OmrAnalysisOutputSchema>;
