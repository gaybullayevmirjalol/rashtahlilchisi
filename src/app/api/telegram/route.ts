'use server';

import { Telegraf, Markup } from 'telegraf';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAdminApp } from '@/firebase/admin-config';

let bot: Telegraf;

// Helper to get the bot token and required channels from Firestore
async function getBotSettings(db: any) {
    const settingsRef = doc(db, 'botSettings', 'global');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
        console.error("!!! Bot settings not found in Firestore!");
        return null;
    }
    return settingsSnap.data();
}

// Helper to check user membership in required channels
async function checkMembership(ctx: any, requiredChannels: any[]) {
    const userId = ctx.from.id;
    const notSubscribedChannels = [];

    for (const channel of requiredChannels) {
        // Ensure we have a valid channel identifier (@username or chat_id)
        let channelId = channel.link;
        if (channel.link.includes('t.me/')) {
            const urlParts = channel.link.split('/');
            const username = urlParts[urlParts.length - 1];
            if (username) {
                channelId = `@${username}`;
            }
        }
        
        try {
            // The bot must be an administrator in the channel to check membership
            const chatMember = await ctx.telegram.getChatMember(channelId, userId);
            const status = chatMember.status;
            if (status === 'left' || status === 'kicked') {
                notSubscribedChannels.push(channel);
            }
        } catch (error: any) {
            console.warn(`Could not check membership for ${channelId}. Error: ${error.message}`);
            // If the bot can't check (e.g., not an admin), assume the user is not a member to be safe.
            notSubscribedChannels.push(channel);
        }
    }

    return notSubscribedChannels;
}


// Initialize bot instance with token from Firestore
async function initializeBot() {
    if (bot) return bot;
    
    const adminApp = getAdminApp();
    if (!adminApp) {
        throw new Error("Failed to initialize Firebase Admin App. Check server environment variables.");
    }

    const db = getFirestore(adminApp);
    const settings = await getBotSettings(db);

    if (!settings || !settings.token) {
        throw new Error("Telegram bot token is not configured in Firestore.");
    }

    bot = new Telegraf(settings.token);

    // --- Bot Command Handlers ---

    bot.start(async (ctx) => {
        return ctx.reply("Assalomu alaykum! RashExam Tahlilchisi botiga xush kelibsiz. Testni boshlash uchun o'qituvchingiz bergan maxsus ID raqamni yuboring.");
    });
    
    const handleSubscriptionAndTest = async (ctx: any, text: string) => {
        const db = getFirestore(getAdminApp()!);
        const settings = await getBotSettings(db);
        const requiredChannels = settings?.requiredChannels || [];

        if (requiredChannels.length > 0) {
            const notSubscribed = await checkMembership(ctx, requiredChannels);
            if (notSubscribed.length > 0) {
                const buttons = notSubscribed.map(channel => Markup.button.url(channel.name, channel.link.startsWith('@') ? `https://t.me/${channel.link.substring(1)}` : channel.link));
                const keyboard = Markup.inlineKeyboard(buttons, { columns: 1 });
                await ctx.reply("Botdan foydalanish uchun, iltimos, quyidagi kanallarga obuna bo'ling:", keyboard);
                await ctx.reply("Obuna bo'lgach, ID raqamni qayta yuboring.");
                return;
            }
        }
        
        // If subscription is confirmed, proceed with test logic
        const [testId, studentId, ownerId] = text.split(':');

        if (!testId || !studentId || !ownerId) {
            return ctx.reply("Siz yuborgan ID raqam noto'g'ri formatda. Iltimos, tekshirib qayta yuboring. Format: `testId:studentId:ownerId`");
        }
        
        const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL || process.env.APP_URL;
        if (!webAppUrl) {
             return ctx.reply("Serverda ilova manzili (web app URL) sozlanmagan. Administratorga murojaat qiling.");
        }
        const testUrl = `${webAppUrl}/dashboard/telegram-test?testId=${testId}&studentId=${studentId}&ownerId=${ownerId}`;
        
        const keyboard = Markup.inlineKeyboard([
            Markup.button.webApp("Testni Boshlash", testUrl)
        ]);

        return ctx.reply("Testni boshlash uchun quyidagi tugmani bosing:", keyboard);
    };

    bot.on('text', async (ctx) => {
        const text = ctx.message.text;
        await handleSubscriptionAndTest(ctx, text);
    });
    
    return bot;
}

// Main handler for Vercel/Next.js API routes
export async function POST(request: Request) {
    try {
        const bot = await initializeBot();
        if (!bot) {
            throw new Error("Bot could not be initialized.");
        }
        const body = await request.json();
        
        const adminApp = getAdminApp();
        if (!adminApp) {
             return new Response(JSON.stringify({ message: "Server-side Firebase not configured." }), { status: 500 });
        }
        const db = getFirestore(adminApp);
        
        // Handle incoming test submissions from the web app
        if (body.action === 'submit_test') {
            const { ownerId, testId, studentId, answers } = body;

            const testDocRef = doc(db, `users/${ownerId}/tests/${testId}`);
            const testSnap = await getDoc(testDocRef);

            if (!testSnap.exists()) {
                return new Response(JSON.stringify({ message: "Test topilmadi." }), { status: 404 });
            }

            const testData = testSnap.data();
            const answerKey = testData.questions.map((q:any) => q.correctAnswer);
            let score = 0;
            const studentAnswersArray = testData.questions.map((q:any) => answers[q.id] || null);

            studentAnswersArray.forEach((answer:string | null, index: number) => {
                if (answer && answer === answerKey[index]) {
                    score++;
                }
            });
            
            const initialScore = (score / answerKey.length) * 100;
            
            const resultDocRef = doc(db, `users/${ownerId}/tests/${testId}/testResults`, studentId);

            await setDoc(resultDocRef, {
                id: studentId,
                studentId: studentId,
                testId: testId,
                answers: studentAnswersArray,
                score: initialScore,
                submittedAt: serverTimestamp(),
            }, { merge: true });

            return new Response(JSON.stringify({ success: true, message: "Natija muvaffaqiyatli saqlandi." }), { status: 200 });
        }
        
        // Handle Telegram updates
        await bot.handleUpdate(body);
        return new Response('OK', { status: 200 });

    } catch (error: any) {
        console.error('Error handling request:', error);
        return new Response(error.message || 'Internal Server Error', { status: 500 });
    }
}

// GET method just to confirm the webhook is set up
export async function GET(request: Request) {
  try {
    // A simple health check
    const bot = await initializeBot();
    return new Response(bot ? 'Bot is initialized' : 'Bot initialization failed', { status: 200 });
  } catch (error: any) {
    return new Response(`Initialization error: ${error.message}`, { status: 500 });
  }
}
