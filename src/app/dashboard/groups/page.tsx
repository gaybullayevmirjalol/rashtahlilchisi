'use client';

import { useState, useMemo } from 'react';
import { MoreHorizontal, PlusCircle, Printer } from 'lucide-react';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { collection, query, doc, serverTimestamp, orderBy, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
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
import { GroupFormDialog, type GroupFormData } from '@/components/dashboard/group-form-dialog';
import { DeleteGroupAlert } from '@/components/dashboard/delete-group-alert';
import { PrintSheetsDialog } from '@/components/dashboard/print-sheets-dialog';
import type { Student, Group } from '@/types';


export default function GroupsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  const groupsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/groups`), orderBy('name'));
  }, [user, firestore]);
  
  const allStudentsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/students`));
  }, [user, firestore]);

  const { data: groups, isLoading, error } = useCollection<Group>(groupsQuery);
  const { data: allStudents, isLoading: isLoadingStudents } = useCollection<Student>(allStudentsQuery);


  const handleFormSubmit = async (data: GroupFormData) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Xatolik', description: 'Foydalanuvchi topilmadi.' });
      return;
    }
    
    if (selectedGroup) {
      const groupDocRef = doc(firestore, `users/${user.uid}/groups/${selectedGroup.id}`);
      await updateDoc(groupDocRef, { name: data.name });
      toast({ title: 'Muvaffaqiyatli!', description: `Guruh nomi "${data.name}" ga o'zgartirildi.` });
    } else {
      const groupsCollectionRef = collection(firestore, `users/${user.uid}/groups`);
      await addDoc(groupsCollectionRef, {
        name: data.name,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Muvaffaqiyatli!', description: `"${data.name}" nomli yangi guruh qo'shildi.` });
    }
    closeFormDialog();
  };

  const openFormDialog = (group: Group | null = null) => {
    setSelectedGroup(group);
    setIsFormDialogOpen(true);
  };

  const closeFormDialog = () => {
    setSelectedGroup(null);
    setIsFormDialogOpen(false);
  };

  const openDeleteDialog = (group: Group) => {
    setSelectedGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteGroup = async () => {
    if (!user || !selectedGroup || !firestore) return;

    const groupDocRef = doc(firestore, `users/${user.uid}/groups/${selectedGroup.id}`);
    await deleteDoc(groupDocRef);

    toast({ title: 'Muvaffaqiyatli!', description: "Guruh o'chirildi." });
    setIsDeleteDialogOpen(false);
    setSelectedGroup(null);
  };
  
  const openPrintDialog = (group: Group) => {
      const studentsInGroup = allStudents?.filter(s => s.groupId === group.id) || [];
      if (studentsInGroup.length === 0) {
        toast({variant: 'destructive', title: 'Guruhda talabalar yo\'q', description: 'Varaqa chop etish uchun avval guruhga talaba qo\'shing.'});
        return;
      }
      setSelectedGroup(group);
      setIsPrintDialogOpen(true);
  };

  return (
    <>
      <GroupFormDialog
        isOpen={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        onSubmit={handleFormSubmit}
        group={selectedGroup}
        onClose={closeFormDialog}
      />
      <DeleteGroupAlert
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteGroup}
      />
       <PrintSheetsDialog
        isOpen={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        group={selectedGroup}
       />
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Guruhlar</CardTitle>
            <CardDescription>
              Talabalar guruhlarini boshqaring va ular uchun test varaqalarini chop eting.
            </CardDescription>
          </div>
          <Button onClick={() => openFormDialog()} className="w-full md:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Guruh Qo'shish
          </Button>
        </CardHeader>
        <CardContent>
          {(isLoading || isLoadingStudents) && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {!(isLoading || isLoadingStudents) && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guruh Nomi</TableHead>
                  <TableHead>Talabalar soni</TableHead>
                  <TableHead>
                    <span className="sr-only">Amallar</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups && groups.length > 0 ? (
                  groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                       <TableCell>
                        {allStudents?.filter(s => s.groupId === group.id).length || 0}
                      </TableCell>
                      <TableCell className="text-right">
                         <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                            onClick={() => openPrintDialog(group)}
                            title="Test varaqalarini chop etish"
                          >
                            <Printer className="h-4 w-4" />
                            <span className="sr-only">Chop etish</span>
                          </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Menyuni ochish</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Amallar</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openFormDialog(group)}>
                              Tahrirlash
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => openDeleteDialog(group)}
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
                      Hali guruhlar mavjud emas.
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
