'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, PlusCircle, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { collection, query, doc, serverTimestamp, orderBy, writeBatch, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';

import { useToast } from '@/hooks/use-toast';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentFormDialog, type StudentFormData } from '@/components/dashboard/student-form-dialog';
import { DeleteStudentAlert } from '@/components/dashboard/delete-student-alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Student, Group } from '@/types';
import { cn } from '@/lib/utils';


export default function StudentsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const studentsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/students`), orderBy('name'));
  }, [user, firestore]);

  const groupsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/groups`), orderBy('name'));
  }, [user, firestore]);

  const { data: students, isLoading: isLoadingStudents, error: studentsError } = useCollection<Student>(studentsQuery);
  const { data: groups, isLoading: isLoadingGroups, error: groupsError } = useCollection<Group>(groupsQuery);

  const getGroupName = (groupId?: string) => {
    if (!groupId || !groups) return null;
    return groups.find(g => g.id === groupId)?.name;
  };
  
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !firestore) {
        return;
    }

    Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: async (results) => {
            const newStudents = results.data
                .map((row: any) => row[0]?.trim())
                .filter(name => name && name.length > 0);

            if (newStudents.length === 0) {
                toast({
                    variant: 'destructive',
                    title: 'Faylda ma\'lumot topilmadi',
                    description: 'CSV faylning birinchi ustuni bo\'sh ko\'rinadi.',
                });
                return;
            }

            try {
                const batch = writeBatch(firestore);
                const studentsCollectionRef = collection(firestore, `users/${user.uid}/students`);

                newStudents.forEach(studentName => {
                    const newStudentRef = doc(studentsCollectionRef);
                    batch.set(newStudentRef, {
                        name: studentName,
                        userId: user.uid,
                        createdAt: serverTimestamp(),
                        groupId: null,
                    });
                });

                await batch.commit();
                toast({
                    title: 'Import Muvaffaqiyatli!',
                    description: `${newStudents.length} ta yangi talaba ro'yxatga qo'shildi.`,
                });
            } catch (error) {
                console.error("Error batch writing students: ", error);
                toast({
                    variant: 'destructive',
                    title: 'Importda xatolik',
                    description: 'Talabalarni bazaga yozishda xatolik yuz berdi.',
                });
            }
        },
        error: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Faylni o\'qishda xatolik',
                description: error.message,
            });
        },
    });
     event.target.value = '';
  };


  const handleFormSubmit = async (data: StudentFormData) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Xatolik', description: 'Foydalanuvchi topilmadi.' });
      return;
    }
    
    const studentData = {
        name: data.name,
        groupId: data.groupId === 'guruhsiz' ? null : data.groupId,
    };

    if (selectedStudent) {
      // Update existing student
      const studentDocRef = doc(firestore, `users/${user.uid}/students/${selectedStudent.id}`);
      await updateDoc(studentDocRef, studentData);
      toast({ title: 'Muvaffaqiyatli!', description: `"${data.name}" ma'lumotlari yangilandi.` });
    } else {
      // Create new student
      const studentsCollectionRef = collection(firestore, `users/${user.uid}/students`);
      await addDoc(studentsCollectionRef, {
        ...studentData,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Muvaffaqiyatli!', description: `"${data.name}" ro'yxatga qo'shildi.` });
    }
    closeFormDialog();
  };

  const openFormDialog = (student: Student | null = null) => {
    setSelectedStudent(student);
    setIsFormDialogOpen(true);
  };

  const closeFormDialog = () => {
    setSelectedStudent(null);
    setIsFormDialogOpen(false);
  };

  const openDeleteDialog = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!user || !selectedStudent || !firestore) return;

    const studentDocRef = doc(firestore, `users/${user.uid}/students/${selectedStudent.id}`);
    await deleteDoc(studentDocRef);

    toast({ title: 'Muvaffaqiyatli!', description: "Talaba o'chirildi." });
    setIsDeleteDialogOpen(false);
    setSelectedStudent(null);
  };

  const isLoading = isLoadingStudents || isLoadingGroups;
  const error = studentsError || groupsError;

  return (
    <>
      <StudentFormDialog
        isOpen={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        onSubmit={handleFormSubmit}
        student={selectedStudent}
        groups={groups || []}
        isLoadingGroups={isLoadingGroups}
        onClose={closeFormDialog}
      />
      <DeleteStudentAlert
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteStudent}
      />
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Talabalar</CardTitle>
            <CardDescription>
              Talabalar ro'yxatini boshqaring va ularning taraqqiyotini kuzating.
            </CardDescription>
          </div>
          <div className='flex items-center gap-2'>
             <Label className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
                <Upload className="mr-2 h-4 w-4" />
                Exceldan Import
                <Input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
             </Label>
             <Button onClick={() => openFormDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Talaba Qo'shish
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Talabaning Ismi</TableHead>
                  <TableHead>Guruh</TableHead>
                  <TableHead>
                    <span className="sr-only">Amallar</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students && students.length > 0 ? (
                  students.map((student) => (
                    <TableRow key={student.id} onClick={() => router.push(`/dashboard/students/${student.id}`)} className="cursor-pointer">
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        {student.groupId ? (
                            <Badge variant="secondary">{getGroupName(student.groupId)}</Badge>
                        ) : (
                            <span className="text-muted-foreground text-xs">Guruhlanmagan</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Menyuni ochish</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Amallar</DropdownMenuLabel>
                            <DropdownMenuItem onClick={(e) => {e.stopPropagation(); openFormDialog(student);}}>
                              Tahrirlash
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {e.stopPropagation(); openDeleteDialog(student);}}
                            >
                              O'chirish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      Hali talabalar mavjud emas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {error && (
            <div className="py-10 text-center text-destructive">
              <p>Ma'lumotlarni yuklashda xatolik yuz berdi.</p>
              <p className="text-xs text-muted-foreground">{error.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
