/**
 * Server-only Firebase Admin access for API routes. Never import this from a
 * client component - it would pull firebase-admin into the browser bundle.
 */
import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Initialized lazily, so routes that never touch Firebase Admin (and
 * `next build`) don't require FIREBASE_SERVICE_ACCOUNT_KEY to be set.
 */
function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!base64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  }

  const serviceAccount = JSON.parse(
    Buffer.from(base64, "base64").toString("utf-8")
  );

  return initializeApp({ credential: cert(serviceAccount) });
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
