'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase/hooks';
import { collection, query, where, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, FileText, TriangleAlert, Zap, Loader2, CheckCircle, AlertCircle, Maximize, Minimize } from 'lucide-react';
import { CameraReverseIcon } from '@/components/icons/camera-reverse-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import jsQR from 'jsqr';
import type { Student, Test, TestResult } from '@/types';
import { analyzeOmrSheet } from '@/ai/flows';
import { ViewResultDialog } from '@/components/dashboard/view-result-dialog';


export default function ScanPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const scanCardRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isFlashSupported, setIsFlashSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [existingResult, setExistingResult] = useState<{test: Test, student: Student, result: TestResult} | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);


  const activeTestQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/tests`),
      where('status', '==', 'Boshlandi')
    );
  }, [user, firestore]);

  const { data: activeTests, isLoading: isLoadingTests } = useCollection<Test>(activeTestQuery);
  const activeTest = activeTests?.[0];

  // Fullscreen handlers
  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      scanCardRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
     if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  }, []);
  

  useEffect(() => {
    const startStream = async (deviceId?: string) => {
        stopStream();
        try {
            const constraints: MediaStreamConstraints = {
                video: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                facingMode: deviceId ? undefined : { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                },
            };
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            streamRef.current = newStream;
            setHasCameraPermission(true);

            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
                videoRef.current.play();
            }
            
            // Check for flash support after a short delay
            setTimeout(() => {
                const videoTrack = newStream.getVideoTracks()[0];
                if (videoTrack && 'getCapabilities' in videoTrack) {
                    const capabilities = videoTrack.getCapabilities();
                    // @ts-ignore
                    if (capabilities.torch) {
                        setIsFlashSupported(true);
                    }
                } else {
                    setIsFlashSupported(false);
                }
            }, 500);

            setIsFlashOn(false);

        } catch (error) {
            console.error('Kameraga kirishda xatolik:', error);
            setHasCameraPermission(false);
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
                toast({
                    variant: 'destructive',
                    title: 'Kamera ruxsati rad etildi',
                    description: 'Ilovadan foydalanish uchun brauzer sozlamalarida kameraga ruxsat bering.',
                });
            }
        }
    };

    const initCamera = async () => {
        if (activeTest) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            setCameras(videoDevices);
            await startStream(videoDevices[activeCameraIndex]?.deviceId);
        } else {
            stopStream();
        }
    };

    initCamera();

    // Cleanup function
    return () => {
      stopStream();
    };
  }, [activeTest, activeCameraIndex, stopStream, toast]);


  const switchCamera = () => {
    if (cameras.length > 1) {
      setActiveCameraIndex(prevIndex => (prevIndex + 1) % cameras.length);
    }
  };

  const toggleFlash = async () => {
    if (!streamRef.current || !isFlashSupported) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    try {
      await videoTrack.applyConstraints({
        // @ts-ignore
        advanced: [{ torch: !isFlashOn }],
      });
      setIsFlashOn(!isFlashOn);
    } catch (error) {
      console.error('Chiroqni boshqarishda xatolik:', error);
      toast({
        variant: 'destructive',
        title: 'Chiroqni boshqarib bo‘lmadi',
        description: 'Qurilmangiz bu funksiyani qo‘llab-quvvatlamasligi mumkin.',
      });
    }
  };
  
 const handleScan = async () => {
    if (!videoRef.current || !canvasRef.current || !user || !firestore) return;

    setIsProcessing(true);
    toast({ title: 'QR kod qidirilmoqda...', description: 'Iltimos, varaqani barqaror ushlang.' });

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
        setIsProcessing(false);
        toast({ variant: 'destructive', title: "Xatolik", description: "Canvas kontekstini olib bo'lmadi." });
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (!code) {
        setIsProcessing(false);
        toast({ variant: 'destructive', title: 'QR Kod Topilmadi', description: "Iltimos, varaqani kamera qarshisida to'g'ri ushlang." });
        return;
    }

    let qrData: { testId: string, studentId: string };
    try {
        qrData = JSON.parse(code.data);
        if (!qrData.testId || !qrData.studentId) throw new Error("Invalid QR data format");
    } catch (e) {
        setIsProcessing(false);
        toast({ variant: 'destructive', title: 'QR Kod Xatosi', description: "QR kod ma'lumotlari noto'g'ri formatda." });
        return;
    }

    try {
        // Check if a result already exists
        const resultDocRef = doc(firestore, `users/${user.uid}/tests/${qrData.testId}/testResults`, qrData.studentId);
        const resultSnap = await getDoc(resultDocRef);

        if (resultSnap.exists()) {
            const testDocRef = doc(firestore, `users/${user.uid}/tests`, qrData.testId);
            const studentDocRef = doc(firestore, `users/${user.uid}/students`, qrData.studentId);
            const [testSnap, studentSnap] = await Promise.all([getDoc(testDocRef), getDoc(studentDocRef)]);

            if (testSnap.exists() && studentSnap.exists()) {
                setExistingResult({
                    test: { id: testSnap.id, ...testSnap.data() } as Test,
                    student: { id: studentSnap.id, ...studentSnap.data() } as Student,
                    result: { id: resultSnap.id, ...resultSnap.data() } as TestResult,
                });
                setIsResultDialogOpen(true);
                setIsProcessing(false);
                return;
            }
        }
        
        // --- If no result exists, proceed with scanning ---
        if (!activeTest || !activeTest.questions || activeTest.questions.length === 0) {
             setIsProcessing(false);
             toast({ variant: 'destructive', title: "Aktiv Test Yoki Savollar Topilmadi", description: "Yangi natija yaratish uchun 'Boshlangan' holatidagi va savollar kiritilgan test mavjud emas." });
             return;
        }

        if (qrData.testId !== activeTest.id) {
            setIsProcessing(false);
            toast({ variant: 'destructive', title: 'Test Muvofiq Emas', description: `Skanerlangan varaq boshqa testga tegishli. Faqat "${activeTest.name}" testini skanerlang.` });
            return;
        }
        
        const questionCount = activeTest.questions.length;
        const answerKey = activeTest.questions.map(q => q.correctAnswer);

        toast({ title: "Tahlil boshlandi...", description: "Javob varaqasi SI tomonidan tahlil qilinmoqda. Iltimos, kuting." });
        const { answers } = await analyzeOmrSheet({
            photoDataUri: canvas.toDataURL('image/jpeg', 0.9),
            questionCount,
        });

        toast({ title: "Saqlanmoqda...", description: "Dastlabki natija saqlanmoqda." });

        let score = 0;
        answers.forEach((answer, index) => {
          if (answer && answerKey[index] && answer === answerKey[index]) {
            score++;
          }
        });
        
        const initialScore = (score / questionCount) * 100;
        
        const newResultDocRef = doc(firestore, `users/${user.uid}/tests/${activeTest.id}/testResults`, qrData.studentId);

        await setDoc(newResultDocRef, {
            id: qrData.studentId,
            studentId: qrData.studentId,
            testId: activeTest.id,
            answers: answers,
            score: initialScore, // This is the raw percentage score for quick feedback
            submittedAt: serverTimestamp(),
        }, { merge: true });

        const studentSnap = await getDoc(doc(firestore, `users/${user.uid}/students`, qrData.studentId));
        const studentName = studentSnap.exists() ? (studentSnap.data() as Student).name : "Noma'lum talaba";
        
        toast({
            title: "Natija Saqlandi!",
            description: `${studentName} uchun dastlabki natija saqlandi: ${score}/${questionCount} (${initialScore.toFixed(1)}%). Yakuniy tahlil test tugagach amalga oshiriladi.`,
            action: <div className="p-2 bg-green-500 text-white rounded-full"><CheckCircle size={20} /></div>,
        });


    } catch (error: any) {
        console.error("Scanning or processing error:", error);
        toast({
            variant: 'destructive',
            title: "Skanerlashda Xatolik",
            description: error.message || "Javob varaqasini tahlil qilishda kutilmagan xatolik yuz berdi.",
            action: <div className="p-2 bg-red-500 text-white rounded-full"><AlertCircle size={20} /></div>,
        });
    } finally {
        setIsProcessing(false);
    }
  };


  if (isLoadingTests) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4 text-center">
          <Skeleton className="h-64 w-full max-w-lg rounded-lg" />
          <Skeleton className="h-10 w-40" />
        </CardContent>
      </Card>
    );
  }

  if (!activeTest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Skanerlashga ruxsat yo'q</CardTitle>
          <CardDescription>
            Javob varaqlarini skanerlash uchun avval testni boshlashingiz kerak.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4 text-center">
           <TriangleAlert className="h-16 w-16 text-destructive" />
           <p className="max-w-md text-muted-foreground">
             Skanerlash uchun aktiv test mavjud emas. Iltimos, 'Testlar' bo'limidan yangi test boshlang.
           </p>
           <Button asChild>
             <Link href="/dashboard/tests">
                <FileText className="mr-2 h-4 w-4" />
                Testlar bo'limiga o'tish
             </Link>
           </Button>
        </CardContent>
      </Card>
    );
  }


  return (
    <>
    <ViewResultDialog
        isOpen={isResultDialogOpen}
        onOpenChange={setIsResultDialogOpen}
        data={existingResult}
    />
    <Card ref={scanCardRef} className="fullscreen:fixed fullscreen:inset-0 fullscreen:z-50 fullscreen:h-screen fullscreen:w-screen fullscreen:rounded-none">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Javob Varaqlarini Skanerlash</CardTitle>
          <CardDescription>
            Aktiv test: <span className='font-bold text-primary'>"{activeTest.name}"</span>. Natijani ko'rish yoki yaratish uchun skanerlang.
          </CardDescription>
        </div>
        <Button onClick={toggleFullscreen} variant="outline" size="icon" className="flex-shrink-0">
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          <span className="sr-only">{isFullscreen ? "To'liq ekrandan chiqish" : "To'liq ekran"}</span>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4 text-center">
         <div className="relative w-full max-w-lg overflow-hidden rounded-lg border-2 border-dashed bg-muted/50 fullscreen:max-w-full fullscreen:flex-1 fullscreen:flex fullscreen:items-center fullscreen:justify-center">
            <video ref={videoRef} className="w-full aspect-[9/16] md:aspect-video rounded-md fullscreen:h-full fullscreen:w-auto fullscreen:object-contain" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            
            {hasCameraPermission === null && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                    <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                    <p className="mt-4 text-muted-foreground">Kamera ishga tushirilmoqda...</p>
                </div>
            )}

            {hasCameraPermission && (
              <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                 {isFlashSupported && (
                    <Button size="icon" variant="secondary" onClick={toggleFlash} className="rounded-full shadow-lg">
                        <Zap className={cn("h-5 w-5", isFlashOn && "fill-yellow-300 text-yellow-500")} />
                        <span className="sr-only">Chiroqni yoqish/o'chirish</span>
                    </Button>
                 )}
                 {cameras.length > 1 && (
                    <Button size="icon" variant="secondary" onClick={switchCamera} className="rounded-full shadow-lg">
                        <CameraReverseIcon className="h-5 w-5" />
                        <span className="sr-only">Kamerani almashtirish</span>
                    </Button>
                 )}
              </div>
            )}
         </div>
        
        {hasCameraPermission === false && (
             <Alert variant="destructive">
                <AlertTitle>Kameraga ruxsat kerak!</AlertTitle>
                <AlertDescription>
                    Bu funksiyadan foydalanish uchun kameraga ruxsat bering.
                </AlertDescription>
            </Alert>
        )}

        <Button size="lg" disabled={!hasCameraPermission || isProcessing} onClick={handleScan}>
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          {isProcessing ? 'Qayta ishlanmoqda...' : 'Skanerlash'}
        </Button>

        <p className="text-sm text-muted-foreground">
          Varaqani kamera qarshisida to'liq va yaxshi yorug'likda ushlang.
        </p>
      </CardContent>
    </Card>
    </>
  );
}
