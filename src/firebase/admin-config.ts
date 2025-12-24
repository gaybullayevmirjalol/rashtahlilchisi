import * as admin from 'firebase-admin';

export function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  // AGAR BUILD VAQTIDA KALIT BO'LMASA, XATO BERMA
  if (!serviceAccount) {
    console.warn("Warning: FIREBASE_SERVICE_ACCOUNT_JSON is missing. Skipping init during build.");
    return null; 
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    return null;
  }
}