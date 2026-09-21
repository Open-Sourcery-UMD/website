"use client";

import { db } from "@firebaseConfig";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { sendEmailVerification, User as FirebaseUser } from "firebase/auth";
import { User } from "@/types/users";

/**
 * Creates a new user profile in Firestore
 * @param uid User UID from Firebase Auth
 * @param userData Profile data. Passwords are never stored - Firebase Auth owns them.
 */
export async function createUserProfile(
  uid: string,
  userData: User
): Promise<void> {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, userData);
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw new Error("Failed to create user profile");
  }
}

/**
 * Retrieves a user profile from Firestore
 * @param uid User UID
 * @returns User object or null if not found
 */
export async function getUserProfile(uid: string): Promise<User | null> {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    // Older profiles may still carry a password hash until the cleanup
    // script has run; never let it into app state
    const data = userDoc.data() as User & { hashedPassword?: string };
    const { hashedPassword, ...userWithoutPassword } = data;
    return userWithoutPassword as User;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw new Error("Failed to fetch user profile");
  }
}

/**
 * Updates a user profile in Firestore
 * @param uid User UID
 * @param updatedData Partial user data to update
 */
export async function updateUserProfile(
  uid: string,
  updatedData: Partial<User>
): Promise<void> {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, updatedData);
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw new Error("Failed to update user profile");
  }
}

/**
 * Resends verification email to user with rate limiting (1 per 60 seconds)
 * @param firebaseUser Firebase user to send verification email to
 * @throws Error if rate limited or if verification email fails
 */
export async function resendVerificationEmail(firebaseUser: FirebaseUser): Promise<void> {
  try {
    // Check rate limiting - get last send time from Firestore
    const userRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      const lastSent = userData.lastVerificationEmailSent;
      
      if (lastSent) {
        const lastSentTime = new Date(lastSent).getTime();
        const currentTime = new Date().getTime();
        const secondsElapsed = (currentTime - lastSentTime) / 1000;
        
        if (secondsElapsed < 60) {
          const secondsRemaining = Math.ceil(60 - secondsElapsed);
          throw new Error(`Please wait ${secondsRemaining} seconds before requesting another verification email`);
        }
      }
    }
    
    // Send verification email
    await sendEmailVerification(firebaseUser);
    
    // Update last verification email sent timestamp
    await updateDoc(userRef, {
      lastVerificationEmailSent: new Date(),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Please wait")) {
      throw error;
    }
    console.error("Error resending verification email:", error);
    throw new Error("Failed to resend verification email. Please try again later.");
  }
}

