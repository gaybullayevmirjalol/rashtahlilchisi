# Loyiha Tavsifi: "RashExam Tahlilchisi"

Ushbu hujjat "RashExam Tahlilchisi" deb nomlangan Next.js ilovasining to'liq tavsifini o'z ichiga oladi. Bu sizga loyihani qayta tiklash, tahlil qilish yoki sun'iy intellekt yordamchisi bilan ishlab chiqishni davom ettirish uchun asos bo'lib xizmat qiladi.

---

## **Loyiha Umumiy Ko'rinishi**

**"RashExam Tahlilchisi"** – bu oʻqituvchilar uchun moʻljallangan keng qamrovli veb-ilova. U oʻqituvchilarga qurilma kamerasi yordamida Optik Belgilarni Aniqlash (OMR) javob varaqalarini skanerlash orqali imtihonlarni yaratish, boshqarish va baholash imkonini beradi. Ilovaning butun interfeysi va matnlari **oʻzbek tilida** boʻlishi shart.

### **Asosiy Funksionallik**

1.  **Autentifikatsiya va Rollar:**
    *   Ilovada ikki turdagi foydalanuvchi roli mavjud: `admin` va `teacher`.
    *   Foydalanuvchilar asosiy sahifada (`/`) email va parol bilan tizimga kirishadi.
    *   Maxsus, havolasiz sahifa (`/create-admin`) orqali eng birinchi `admin` foydalanuvchisini yaratish mumkin. Bu bir martalik sozlash sahifasidir.
    *   Adminlar "Foydalanuvchilar" sahifasiga kirib, boshqa foydalanuvchilarni (o'qituvchilar va boshqa adminlarni) yaratishi va boshqarishi mumkin.
    *   Foydalanuvchilarni boshqarishda adminlar ularning `roli` va `scanLimit` (oʻqituvchi yaratishi va tahlil qilishi mumkin boʻlgan testlarning umumiy soni) qiymatlarini belgilay oladi.

2.  **Boshqaruv Paneli (`/dashboard`):**
    *   Tizimga kirgandan soʻng foydalanuvchi uchun asosiy markaz.
    *   `StatCard` komponentlarida asosiy statistik maʼlumotlarni koʻrsatadi:
        *   "Jami Talabalar"
        *   "Yakunlangan Testlar"
        *   "Oʻrtacha Ball" (barcha yakunlangan testlar boʻyicha).
        *   "Jami Natijalar" (skanerlangan umumiy natijalar soni).
    *   "Soʻnggi Natijalar" kartasi mavjud boʻlib, unda eng oxirgi *yakunlangan* testdagi eng yuqori natija koʻrsatgan 5 ta talaba aks etadi.

3.  **OMR Andozalarini Boshqarish (`/dashboard/templates`):**
    *   Oʻqituvchilar oʻzlarining maxsus OMR javob varaqalari andozalarini yaratishlari mumkin.
    *   Andoza `nom` va `savollarSoni` bilan aniqlanadi.
    *   Andoza yaratish/tahrirlash sahifasida foydalanuvchilar oʻz oʻquv markazlarining logotipini yuklashlari mumkin.
    *   Tizim chop etiladigan varaqaning jonli, A4 formatidagi koʻrinishini taqdim etadi, unda logotip va talaba/test maʼlumotlari uchun joylar koʻrsatiladi.
    *   Foydalanuvchilar yaratilgan andozani chop etish uchun koʻp sahifali PDF formatida yuklab olishlari mumkin. Har bir sahifada javob doirachalari, logotip, test nomi, talaba ismi va unikal **QR Kod** boʻlishi kerak.

4.  **Talabalar va Guruhlarni Boshqarish:**
    *   **Talabalar (`/dashboard/students`):** Oʻqituvchilar talabalarni yaratishi, tahrirlashi va oʻchirishi mumkin. Har bir talabaning `ismi` bor va ixtiyoriy ravishda guruhga tayinlanishi mumkin. Shuningdek, talabalar ro'yxatini CSV faylidan import qilishni qo'llab-quvvatlaydi (har bir qatorda bitta ism).
    *   **Guruhlar (`/dashboard/groups`):** Oʻqituvchilar guruhlarni (masalan, "10-A sinf") yaratishi, tahrirlashi va oʻchirishi mumkin. Bu sahifada guruhlar roʻyxati va har bir guruhdagi talabalar soni koʻrsatiladi.

5.  **Testlarni Boshqarish (`/dashboard/tests`):**
    *   Oʻqituvchilar yangi testni `nom` berish, `OMRAndoza`sini tanlash va barcha savollar uchun `javoblarKaliti`ni kiritish ('A', 'B', 'C', 'D') orqali yaratishlari mumkin. Buni qoʻlda yoki javoblarni oʻz ichiga olgan bir qatorli/ustunli CSV faylini import qilish orqali amalga oshirish mumkin.
    *   Testning `status`i boʻladi: `Yaratildi`, `Boshlandi`, `Yakunlandi`.
    *   OMR skanerlashni yoqish uchun test "Boshlandi" holatida boʻlishi kerak.
    *   Test "Yakunlandi" holatiga oʻtkazilganda, tizim barcha talabalar natijalari boʻyicha **Rasch tahlilini** amalga oshiradi. U har bir talabaning boshqalarga nisbatan natijasiga qarab masshtablangan ballni (75 ballik tizimda) va bahoni hisoblaydi.
        *   **Baholash shkalasi (masshtablangan ball foiziga asoslanib):** A+ (95-100), A (85-94), B+ (75-84), B (65-74), C+ (55-64), C (45-54).
    *   Oʻqituvchilar har bir test uchun batafsil natijalar va tahlillarni koʻrishlari mumkin.

6.  **OMR Varaqalarini Skanerlash (`/dashboard/scan`):**
    *   Bu asosiy funksiya boʻlib, faqat "Boshlandi" statusidagi aktiv test mavjud boʻlgandagina ishlaydi.
    *   Foydalanuvchining qurilma kamerasi javob varaqalarini skanerlash uchun ishlatiladi. Interfeys kameralar oʻrtasida almashish va chiroqni yoqib-oʻchirishni qoʻllab-quvvatlashi kerak.
    *   Har bir chop etiladigan OMR varagʻi `{ testId, studentId }` ni oʻz ichiga olgan unikal **QR Kod**ga ega.
    *   Skanerlash jarayoni quyidagilarni oʻz ichiga oladi:
        1.  QR kodni aniqlash va tahlil qilish orqali test va talabani identifikatsiya qilish.
        2.  **Olingan rasmni tahlil qilish uchun multimodal AI modelidan (`gemini-2.5-flash`) foydalanish.** Modelga rasm va `savollarSoni` yuboriladi va u talabaning tanlangan javoblari massivini (`['A', 'B', null, 'D', ...]` bu yerda `null` javob berilmagan savol) qaytaradi.
        3.  AI tomonidan skanerlangan javoblarni testning `javoblarKaliti` bilan solishtirib, dastlabki `ball`ni (foizda) hisoblash.
        4.  `TestNatijasi`ni (dastlabki ball, javoblar va h.k.) Firestore'ga saqlash.
        5.  Talabaning ismi va balli bilan bir zumda xabarnoma (toast notification) koʻrsatish.

7.  **Ma'lumotlarni Qoʻlda Kiritish (`/dashboard/manual-entry`):**
    *   Skanerlashga alternativa.
    *   Foydalanuvchi aktiv ("Boshlandi") testni va talabani tanlaydi.
    *   Har bir savol uchun radio tugmachalari (A, B, C, D) boʻlgan forma paydo boʻladi, bu oʻqituvchiga talabaning javoblarini qoʻlda kiritish imkonini beradi.

8.  **Test Natijalari va Tahlili (`/dashboard/tests/[testId]`):**
    *   Har bir yakunlangan test uchun oʻqituvchilar ikkita ichki oynadan iborat batafsil natijalar sahifasini koʻrishlari mumkin: "Natijalar Jadvali" va "Grafik Tahlillar".
    *   **Natijalar Jadvali:** Har bir talabani, uning har bir savolga bergan javobini (toʻgʻri/notoʻgʻri ikonlar bilan koʻrsatilgan) va yakuniy masshtablangan balli va bahosini koʻrsatadi.
    *   **Grafik Tahlillar:** `recharts` yordamida uchta tahliliy grafikni aks ettiradi:
        *   **Savollar Tahlili:** Har bir savol uchun toʻgʻri va notoʻgʻri javoblarni koʻrsatuvchi yigʻma ustunli diagramma.
        *   **Baholar Taqsimoti:** Baholarning (A+, A va h.k.) taqsimotini koʻrsatuvchi ustunli diagramma.
        *   **Qiyinchilik Tahlili:** Har bir savol uchun toʻgʻri javoblar foizini koʻrsatuvchi ustunli diagramma (qiyin savollarni aniqlash uchun).
    *   Bu sahifada natijalarni **PDF** va **CSV** formatlarida **Eksport** qilish imkoniyatlari boʻlishi kerak.
    *   **SI bilan Rasch Tahlili Qanday Ishlaydi?**
        *   "Testlar" sahifasidagi "Yakunlash va Tahlil" yoki "SI bilan Tahlil" tugmasi bosilganda tizim quyidagi amallarni bajaradi:
        *   **Maʼlumotlarni Tayyorlash:** Tizim testdagi barcha oʻquvchilarning javoblarini yigʻadi va ularni maxsus CSV (vergul bilan ajratilgan qiymatlar) formatiga oʻtkazadi. Bu formatda har bir qator bitta oʻquvchini, har bir ustun esa bitta savolni ifodalaydi. Toʻgʻri javob uchun '1', notoʻgʻri javob uchun '0' yoziladi.
        *   **SIga Soʻrov Yuborish:** Tayyor boʻlgan CSV maʼlumotlar matritsasi `rasch-analysis-flow.ts` nomli maxsus Genkit flow orqali sunʼiy intellekt modeliga (masalan, Gemini) yuboriladi. Soʻrovda SIga psixometriya boʻyicha ekspert sifatida ish koʻrishi va Rasch modelini qoʻllashi buyuriladi.
        *   **Natijalarni Qabul Qilish:** SI ushbu maʼlumotlarni tahlil qilib, ikkita asosiy parametrni hisoblab chiqadi va JSON formatida qaytaradi:
            1.  **Oʻquvchi Qobiliyati (Theta - θ):** Har bir oʻquvchining testdagi boshqa oʻquvchilarga nisbatan bilim darajasini ifodalovchi son qiymati.
            2.  **Savol Qiyinligi (Beta - β):** Har bir savolning boshqa savollarga nisbatan qiyinlik darajasini koʻrsatuvchi son qiymati.
        *   **Yakuniy Ballarni Hisoblash:** Ilova SI dan olingan xom `theta` qiymatlarini olib, ularni 75 ballik tizimga oʻtkazadi va yakuniy bahoni (`A+`, `A`, `B+` va h.k.) hisoblaydi. Bu natijalar oʻquvchining yakuniy bali sifatida saqlanadi.

9.  **Foydalanuvchi Profili va Sozlamalar:**
    *   **Profil (`/dashboard/profile`):** Foydalanuvchilar oʻz ismlari va parollarini yangilashlari mumkin. Oʻqituvchilar oʻzlarining `scanLimit` miqdorini va qanchasini ishlatganliklarini koʻrishlari mumkin.
    *   **Sozlamalar (`/dashboard/settings`):** Faqat `admin` uchun moʻljallangan sahifa. Bu yerda saytning umumiy logotipi yuklanadi, u kirish sahifasida va yon panelda paydo boʻladi.

### **Texnik Stack va Arxitektura**

*   **Freymvork:** Next.js (App Router bilan). Barcha komponentlar Mijoz Komponentlari (`'use client'`) boʻlishi kerak.
*   **Til:** TypeScript.
*   **UI Komponentlari:** `shadcn/ui`. Butun interfeys ushbu komponentlar (`Card`, `Button`, `Dialog`, `Table`, `Select`, `Avatar`, `Skeleton` va h.k.) yordamida qurilishi kerak.
*   **Stillashtirish:** Tailwind CSS. `src/app/globals.css` faylida belgilangan mavzu oʻzgaruvchilaridan foydalaning.
*   **Maʼlumotlar bazasi:** Firebase Firestore. Maʼlumotlar strukturasi xavfsizlik va samaradorlik uchun denormalizatsiya qilingan. Xavfsizlik qoidalari `firestore.rules` faylida foydalanuvchi maʼlumotlariga egalikni taʼminlash uchun belgilangan (foydalanuvchi faqat oʻzining testlar, talabalar kabi quyi toʻplamlariga kira oladi).
*   **Autentifikatsiya:** Firebase Authentication (Email/Parol).
*   **Formalar bilan ishlash:** `react-hook-form` va `zod` mustahkam validatsiya uchun.
*   **AI Funksionalligi:** `googleAI` plaginiga ega `genkit-ai/next`.
    *   **OMR Skanerlash:** `omr-analysis-flow.ts` nomli Genkit flow `gemini-2.5-flash` multimodal soʻrovidan foydalanib, rasmdan javoblarni oʻqiydi.
    *   **Rasch Tahlili:** `rasch-analysis-flow.ts` nomli Genkit flow talabalarning javob maʼlumotlarini CSV formatida oladi va Rasch tahlilini amalga oshirish uchun AI modelidan foydalanadi, natijada talaba qobiliyati (theta) va element qiyinligi (beta) parametrlarini qaytaradi.
*   **Mijoz Tomonidagi Kutubxonalar:**
    *   QR kodni skanerlash uchun `jsqr`.
    *   Javob varaqalari va natijalar hisobotlarini PDF formatida yaratish uchun `jspdf` va `html2canvas`.
    *   CSV import/eksportini boshqarish uchun `papaparse`.
    *   Maʼlumotlarni vizualizatsiya qilish uchun `recharts`.

### **Maʼlumotlar Modellari (Firestore)**

*   `/users/{userId}`: `UserProfile` { id, login, email, role, scanLimit, firstName, lastName, avatarUrl }
*   `/users/{userId}/tests/{testId}`: `Test` { id, name, userId, omrTemplateId, answerKey, questionCount, status, createdAt }
*   `/users/{userId}/students/{studentId}`: `Student` { id, name, groupId, userId, createdAt }
*   `/users/{userId}/groups/{groupId}`: `Group` { id, name, userId, createdAt }
*   `/users/{userId}/omrTemplates/{templateId}`: `OMRTemplate` { id, name, questionCount, logoUrl, userId, createdAt }
*   `/users/{userId}/tests/{testId}/testResults/{studentId}`: `TestResult` { id, testId, studentId, score, grade, answers, submittedAt, analysis?: RaschAnalysisOutput }
*   `/siteSettings/global`: `SiteSettings` { id: 'global', logoUrl }
