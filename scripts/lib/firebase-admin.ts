import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!base64) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
}

const serviceAccount = JSON.parse(
  Buffer.from(base64, "base64").toString("utf-8")
);

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export const db = getFirestore();