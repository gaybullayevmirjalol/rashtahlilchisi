'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase/hooks';
import { doc, collection, query, where, getDoc, getDocs } from 'firebase/firestore';
import type { Student, Group, Test, SiteSettings } from '@/types';
import { PrintableOMRSheet, PrintableOMRSheetProps } from '@/components/dashboard/printable-omr-sheet';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PrintPage = () => {
    const searchParams = useSearchParams();
    const { user } = useUser();
    const firestore = useFirestore();

    const testId = searchParams.get('testId');
    const groupId = searchParams.get('groupId');
    
    const [sheetsData, setSheetsData] = useState<PrintableOMRSheetProps[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const generateSheetsData = async () => {
            setIsLoading(true);
            setError(null);

            if (!user || !firestore || !testId || !groupId) {
                 setError("URL manzildan kerakli ma'lumotlar (testId, groupId) topilmadi.");
                 setIsLoading(false);
                 return;
            }

            try {
                // 1. Fetch Test, Group, and SiteSettings data
                const testDocRef = doc(firestore, `users/${user.uid}/tests/${testId}`);
                const groupDocRef = doc(firestore, `users/${user.uid}/groups/${groupId}`);
                const settingsDocRef = doc(firestore, `siteSettings/global`);
                
                const [testSnap, groupSnap, settingsSnap] = await Promise.all([
                    getDoc(testDocRef),
                    getDoc(groupDocRef),
                    getDoc(settingsDocRef)
                ]);

                if (!testSnap.exists() || !groupSnap.exists()) {
                    setError("Chop etish uchun ma'lumotlar to'liq emas. (Test yoki guruh topilmadi)");
                    setIsLoading(false);
                    return;
                }
                
                const test = { id: testSnap.id, ...testSnap.data() } as Test;
                const group = { id: groupSnap.id, ...groupSnap.data() } as Group;
                const siteSettings = settingsSnap.exists() ? settingsSnap.data() as SiteSettings : null;

                // 2. Fetch Students in the group
                const studentsQuery = query(collection(firestore, `users/${user.uid}/students`), where('groupId', '==', groupId));
                const studentsSnap = await getDocs(studentsQuery);
                const students = studentsSnap.docs.map(d => ({id: d.id, ...d.data()}) as Student);
                
                if (students.length === 0) {
                     setError("Guruhda chop etish uchun talabalar mavjud emas.");
                     setIsLoading(false);
                     return;
                }

                // 3. Generate Sheet Props for each student
                const generatedData: PrintableOMRSheetProps[] = [];
                const date = format(new Date(), 'dd.MM.yyyy');

                for (const student of students) {
                    const qrData = JSON.stringify({ testId: test.id, studentId: student.id });
                    const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 100, margin: 1 });
                    
                    generatedData.push({
                        test,
                        student,
                        groupName: group?.name,
                        date,
                        qrCodeDataUrl,
                        logoUrl: test.logoUrl || siteSettings?.logoUrl, // Prioritize test logo, fallback to site logo
                    });
                }
                
                setSheetsData(generatedData);
            } catch (e: any) {
                console.error("Error generating sheet data:", e);
                setError(e.message || "Javob varaqalarini tayyorlashda kutilmagan xatolik yuz berdi.");
            } finally {
                setIsLoading(false);
            }
        };

        generateSheetsData();
    }, [user, firestore, testId, groupId]);
    
    // Trigger print dialog once data is ready
    useEffect(() => {
        if (!isLoading && sheetsData.length > 0 && !error) {
            // A short delay ensures all images (like QR codes) are fully rendered
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [isLoading, sheetsData, error]);
    
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800 print:hidden">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h1 className="mt-4 text-2xl font-bold">Javob Varaqalari Tayyorlanmoqda...</h1>
                <p className="mt-2 text-muted-foreground">Iltimos, kuting. Chop etish oynasi tez orada ochiladi.</p>
            </div>
        );
    }

    if (error) {
         return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-red-700 print:hidden">
                <AlertCircle className="h-12 w-12" />
                <h1 className="mt-4 text-2xl font-bold">Xatolik!</h1>
                <p className="mt-2 max-w-md text-center">{error}</p>
                <Button onClick={() => window.close()} className="mt-6">Oynani yopish</Button>
            </div>
        );
    }
    
    if (sheetsData.length === 0 && !isLoading) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen bg-yellow-50 text-yellow-700 print:hidden">
                <AlertCircle className="h-12 w-12" />
                <h1 className="mt-4 text-2xl font-bold">Ma'lumot topilmadi</h1>
                <p className="mt-2 max-w-md text-center">Chop etish uchun hech qanday ma'lumot tayyorlanmadi. Guruhda talabalar borligini tekshiring.</p>
                <Button onClick={() => window.close()} className="mt-6">Oynani yopish</Button>
            </div>
        );
    }

    return (
        <main className="bg-white">
            {sheetsData.map((sheetProps, index) => (
                <div key={sheetProps.student?.id || index} className="page-break" style={{ pageBreakAfter: 'always' }}>
                    <PrintableOMRSheet {...sheetProps} />
                </div>
            ))}
        </main>
    );
};

export default PrintPage;
