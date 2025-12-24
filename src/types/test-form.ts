import { z } from 'zod';

const answerSchema = z.object({
  value: z.string().trim().regex(/^[A-D]$/, { message: "A-D" }).min(1, { message: "To'ldiring" }),
});

export const testFormSchema = z.object({
  name: z.string().min(3, {
    message: "Test nomi kamida 3 belgidan iborat bo'lishi kerak.",
  }),
  omrTemplateId: z.string({
    required_error: 'Iltimos, OMR andozasini tanlang.',
  }),
  questionCount: z.number().min(1),
  answerKey: z.array(answerSchema).min(1, "Javoblar kaliti bo'sh bo'lishi mumkin emas."),
});

export type TestFormSchemaType = z.infer<typeof testFormSchema>;
export type TestFormData = Omit<TestFormSchemaType, 'answerKey'> & { answerKey?: string[] };
