'use client';
import { useState } from 'react';
import { useForm, useFieldArray, Controller, useFormContext } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore } from '@/firebase/hooks';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, PlusCircle, Trash2, ChevronRight, ChevronLeft, Save, Image as ImageIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Question, QuestionType } from '@/types';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// --- Zod Schema Definition ---
const questionSchema = z.object({
  id: z.string(),
  type: z.enum(['single_choice', 'multi_choice', 'handwritten', 'match', 'cluster']),
  correctAnswer: z.string(), // cluster type may have an empty string
  section: z.string().min(1, "Bo'lim tanlanishi shart"),
}).refine(data => {
    // If type is not cluster, correctAnswer must not be empty.
    if (data.type !== 'cluster') {
        return data.correctAnswer.length > 0;
    }
    return true;
}, {
    message: "Javob kiritilishi shart",
    path: ['correctAnswer'],
});


const testSchema = z.object({
  name: z.string().min(3, "Test nomi kamida 3 belgidan iborat bo'lishi kerak"),
  subjectName: z.string().min(3, "Fan nomi kamida 3 belgidan iborat bo'lishi kerak"),
  totalMaxScore: z.coerce.number().min(1, "Maksimal ball 0 dan katta bo'lishi kerak"),
  logoUrl: z.string().optional(),
  sections: z.array(z.string().min(1, "Bo'lim nomi bo'sh bo'lmasligi kerak")).min(1, "Kamida bitta bo'lim qo'shing"),
  questions: z.array(questionSchema).min(1, "Kamida bitta savol kiriting"),
});

type TestFormData = z.infer<typeof testSchema>;

const questionTypeOptions: { value: QuestionType, label: string }[] = [
    { value: 'single_choice', label: "Yopiq Test (1 ta javob)" },
    { value: 'multi_choice', label: "Yopiq Test (ko'p javob)" },
    { value: 'handwritten', label: "Qo'lda Yozish" },
    { value: 'match', label: "Moslikni Topish" },
    { value: 'cluster', label: "Klaster Savoli" },
];

const AnswerInput = ({ index }: { index: number }) => {
    const { control, watch } = useFormContext<TestFormData>();
    const questionType = watch(`questions.${index}.type`);

    switch (questionType) {
        case 'multi_choice':
            return <FormField control={control} name={`questions.${index}.correctAnswer`} render={({ field }) => (
                <FormItem><FormControl><Input placeholder="Javoblarni vergul bilan ajrating (masalan, A,C)" {...field} /></FormControl><FormMessage /></FormItem>
            )} />;
        case 'handwritten':
             return <FormField control={control} name={`questions.${index}.correctAnswer`} render={({ field }) => (
                <FormItem><FormControl><Textarea placeholder="To'g'ri javob matni..." {...field} className="h-10" /></FormControl><FormMessage /></FormItem>
            )} />;
        case 'match':
             return <FormField control={control} name={`questions.${index}.correctAnswer`} render={({ field }) => (
                <FormItem><FormControl><Input placeholder="Moslikni '1-A,2-C' formatida kiriting" {...field} /></FormControl><FormMessage /></FormItem>
            )} />;
        case 'cluster':
            return <div className="text-xs text-center text-muted-foreground p-2 h-10 flex items-center justify-center">Javob talab etilmaydi</div>;
        case 'single_choice':
        default:
            return <FormField control={control} name={`questions.${index}.correctAnswer`} render={({ field }) => (
                <FormItem><FormControl><Input placeholder="Javob..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />;
    }
}


export default function NewTestPage() {
    const [step, setStep] = useState(1);
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const form = useForm<TestFormData>({
        resolver: zodResolver(testSchema),
        defaultValues: {
            name: '',
            subjectName: '',
            totalMaxScore: 75,
            logoUrl: '',
            sections: ['Asosiy bo\'lim'],
            questions: [{ id: '1', type: 'single_choice', correctAnswer: '', section: 'Asosiy bo\'lim' }],
        },
    });

    const { fields, append, remove, insert } = useFieldArray({
        control: form.control,
        name: "questions",
    });
    
    const sections = form.watch('sections');

    const nextStep = async () => {
        let result = false;
        if (step === 1) {
            result = await form.trigger(['name', 'subjectName', 'sections', 'totalMaxScore', 'logoUrl']);
        } else if (step === 2) {
            result = await form.trigger(['questions']);
        }
        if (result) {
            setStep(s => s + 1);
        }
    };
    const prevStep = () => setStep(s => s - 1);
    
    const fileToDataUri = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
    };

    const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
          try {
            const dataUri = await fileToDataUri(file);
            setLogoPreview(dataUri);
            form.setValue('logoUrl', dataUri);
          } catch (error) {
            toast({
              variant: 'destructive',
              title: 'Rasm yuklashda xatolik',
              description: 'Faylni o‘qib bo‘lmadi. Boshqa rasm tanlab ko‘ring.',
            });
          }
        }
    };

    const addSection = () => {
        const newSections = [...form.getValues('sections'), `Yangi bo'lim ${form.getValues('sections').length + 1}`];
        form.setValue('sections', newSections);
    };
    
    const removeSection = (index: number) => {
        const newSections = form.getValues('sections').filter((_, i) => i !== index);
        form.setValue('sections', newSections);
    };

    const addSubQuestion = (index: number) => {
        const baseId = fields[index].id.replace(/[a-z]$/i, '');
        let nextChar = 'a';
        let lastSubQuestionIndex = index;

        for (let i = index + 1; i < fields.length; i++) {
            if (fields[i].id.startsWith(baseId)) {
                const lastChar = fields[i].id.slice(-1);
                nextChar = String.fromCharCode(lastChar.charCodeAt(0) + 1);
                lastSubQuestionIndex = i;
            } else {
                break;
            }
        }
        
        insert(lastSubQuestionIndex + 1, {
            id: `${baseId}${nextChar}`,
            type: 'handwritten',
            correctAnswer: '',
            section: fields[index].section,
        });
    };

    const onSubmit = async (data: TestFormData) => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'Xatolik', description: 'Tizimga kirilmagan yoki maʼlumotlar bazasi bilan aloqa yoʻq.' });
            return;
        }

        try {
            // @ts-ignore
            await addDoc(collection(firestore, `users/${user.uid}/tests`), {
                ...data,
                questionCount: data.questions.length, // Add questionCount
                answerKey: data.questions.map(q => q.correctAnswer), // Add answerKey
                userId: user.uid,
                status: 'Yaratildi',
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Muvaffaqiyatli!', description: `"${data.name}" nomli test yaratildi.` });
            router.push('/dashboard/tests');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Testni saqlashda xatolik', description: error.message });
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/tests')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-xl font-bold tracking-tight">Milliy Sertifikat Standartida Yangi Test Yaratish</h1>
            </div>

            {/* Steps Indicator */}
            <div className="flex items-center justify-center gap-4">
                <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>1</div>
                    <span className="hidden md:inline">Asosiy ma'lumotlar</span>
                </div>
                <div className={`flex-1 h-px ${step > 1 ? 'bg-primary' : 'bg-border'}`}></div>
                <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>2</div>
                    <span className="hidden md:inline">Kalitlarni kiritish</span>
                </div>
                 <div className={`flex-1 h-px ${step > 2 ? 'bg-primary' : 'bg-border'}`}></div>
                <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>3</div>
                    <span className="hidden md:inline">Yakunlash</span>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    {step === 1 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>1-Bosqich: Asosiy ma'lumotlar</CardTitle>
                                <CardDescription>Testning nomi, fani, bo'limlari va logotipini kiriting.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid md:grid-cols-3 gap-4">
                                     <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Test Nomi</FormLabel>
                                            <FormControl><Input placeholder="Masalan, Kimyo DTM 2024 Blok Test" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={form.control} name="subjectName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fan Nomi</FormLabel>
                                            <FormControl><Input placeholder="Kimyo" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={form.control} name="totalMaxScore" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Maksimal Ball</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Test Logotipi (ixtiyoriy)</Label>
                                  <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center border">
                                        {logoPreview ? (
                                            <Image src={logoPreview} alt="Logo Preview" width={96} height={96} className="object-contain rounded-md" />
                                        ) : (
                                            <ImageIcon className="w-10 h-10 text-muted-foreground" />
                                        )}
                                    </div>
                                    <Input id="logo-upload" type="file" accept="image/png, image/jpeg" onChange={handleLogoChange} className="max-w-xs"/>
                                  </div>
                                </div>

                                <div>
                                    <FormLabel>Fan Bo'limlari</FormLabel>
                                    <div className="space-y-2 mt-2">
                                        {sections.map((_, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <FormField control={form.control} name={`sections.${index}`} render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl><Input placeholder={`Bo'lim ${index + 1}`} {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeSection(index)} disabled={sections.length <= 1}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addSection}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Bo'lim qo'shish
                                    </Button>
                                </div>
                            </CardContent>
                             <CardFooter className="flex justify-end">
                                <Button type="button" onClick={nextStep}>
                                    Keyingi Bosqich <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    {step === 2 && (
                        <Card>
                             <CardHeader>
                                <CardTitle>2-Bosqich: Savollar va Javob Kalitlari</CardTitle>
                                <CardDescription>Har bir savolning turini, javobini va bo'limini kiriting.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px]">Raqam</TableHead>
                                            <TableHead className="min-w-[200px]">Turi</TableHead>
                                            <TableHead>Javob Kaliti</TableHead>
                                            <TableHead className="min-w-[200px]">Bo'lim</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell>
                                                     <FormField control={form.control} name={`questions.${index}.id`} render={({ field }) => (
                                                        <FormItem><FormControl><Input {...field} className="font-mono"/></FormControl><FormMessage /></FormItem>
                                                    )} />
                                                </TableCell>
                                                <TableCell>
                                                    <FormField control={form.control} name={`questions.${index}.type`} render={({ field }) => (
                                                        <FormItem>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    {questionTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                </TableCell>
                                                <TableCell>
                                                    <AnswerInput index={index} />
                                                </TableCell>
                                                <TableCell>
                                                    <FormField control={form.control} name={`questions.${index}.section`} render={({ field }) => (
                                                        <FormItem>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Bo'limni tanlang..." /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    {sections.map(sec => <SelectItem key={sec} value={sec}>{sec}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center gap-1">
                                                        {(form.watch(`questions.${index}.type`) === 'cluster' || form.watch(`questions.${index}.type`) === 'handwritten') && (
                                                            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => addSubQuestion(index)}><PlusCircle className="h-3 w-3"/></Button>
                                                        )}
                                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                                <Button type="button" variant="outline" className="mt-4" onClick={() => append({ id: `${fields.length + 1}`, type: 'single_choice', correctAnswer: '', section: sections[0] || '' })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Yangi savol qo'shish
                                </Button>
                            </CardContent>
                             <CardFooter className="flex justify-between">
                                <Button type="button" variant="outline" onClick={prevStep}>
                                    <ChevronLeft className="mr-2 h-4 w-4" /> Orqaga
                                </Button>
                                <Button type="button" onClick={nextStep}>
                                    Keyingi Bosqich <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                     {step === 3 && (
                        <Card>
                             <CardHeader>
                                <CardTitle>3-Bosqich: Yakuniy tasdiqlash</CardTitle>
                                <CardDescription>Kiritilgan ma'lumotlarni tekshiring va testni saqlang.</CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-4">
                                <div><span className="font-semibold">Test Nomi:</span> {form.getValues('name')}</div>
                                <div><span className="font-semibold">Fan:</span> {form.getValues('subjectName')}</div>
                                <div><span className="font-semibold">Umumiy Maksimal Ball:</span> {form.getValues('totalMaxScore')}</div>
                                <div><span className="font-semibold">Bo'limlar:</span> {sections.join(', ')}</div>
                                <div><span className="font-semibold">Jami savollar:</span> {fields.length}</div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button type="button" variant="outline" onClick={prevStep}>
                                    <ChevronLeft className="mr-2 h-4 w-4" /> Orqaga
                                </Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                     {form.formState.isSubmitting ? 'Saqlanmoqda...' : <><Save className="mr-2 h-4 w-4" /> Testni Saqlash</>}
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </form>
            </Form>
        </div>
    );
}
