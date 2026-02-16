"use client";

import { db } from "@firebaseConfig";
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { sendEmailVerification, User as FirebaseUser } from "firebase/auth";
import bcryptjs from "bcryptjs";
import { User } from "@/types/users";

/**
 * Hashes a password using bcryptjs
 * @param password Plain text password
 * @returns Hashed password string
 */
async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
}

/**
 * Compares a plain password with a hashed password
 * @param password Plain text password
 * @param hashedPassword Hashed password from database
 * @returns true if passwords match, false otherwise
 */
async function comparePasswords(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcryptjs.compare(password, hashedPassword);
}

/**
 * Creates a new user profile in Firestore
 * @param uid User UID from Firebase Auth
 * @param userData User data including hashed password
 */
export async function createUserProfile(
  uid: string,
  userData: User & { hashedPassword: string }
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
 * Registers a user in Firestore (called during sign-up or first login)
 * Creates user document if it doesn't already exist
 * @param uid User UID from Firebase Auth
 * @param userData User data including hashed password
 */
export async function registerUser(
  uid: string,
  userData: User & { hashedPassword: string }
): Promise<void> {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);

    // Only create if user doesn't already exist
    if (!userDoc.exists()) {
      await setDoc(userRef, userData);
    }
  } catch (error) {
    console.error("Error registering user:", error);
    throw new Error("Failed to register user");
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

    // Return user data without the hashed password
    const data = userDoc.data() as User & { hashedPassword?: string };
    const { hashedPassword, ...userWithoutPassword } = data;
    return userWithoutPassword as User;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw new Error("Failed to fetch user profile");
  }
}

/**
 * Gets user with hashed password for authentication purposes
 * @param uid User UID
 * @returns User object with hashed password or null if not found
 */
async function getUserWithPassword(
  uid: string
): Promise<(User & { hashedPassword: string }) | null> {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    return userDoc.data() as User & { hashedPassword: string };
  } catch (error) {
    console.error("Error fetching user profile with password:", error);
    throw new Error("Failed to fetch user profile");
  }
}

/**
 * Validates user credentials (for future custom login implementation)
 * @param email User email
 * @param password Plain text password
 * @returns User object if credentials match, null otherwise
 */
export async function loginUser(
  email: string,
  password: string
): Promise<User | null> {
  try {
    // Query Firestore for user with matching email
    // Note: This is a placeholder implementation
    // For production, use Firebase's query functionality or authentication
    const userWithPassword = await getUserWithPassword(email);

    if (!userWithPassword) {
      return null;
    }

    // Compare passwords
    const isPasswordValid = await comparePasswords(
      password,
      userWithPassword.hashedPassword
    );

    if (!isPasswordValid) {
      return null;
    }

    // Return user without password
    const { hashedPassword, ...userWithoutPassword } = userWithPassword;
    return userWithoutPassword as User;
  } catch (error) {
    console.error("Error logging in user:", error);
    return null;
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
 * Deletes a user profile from Firestore
 * @param uid User UID
 */
export async function deleteUserProfile(uid: string): Promise<void> {
  try {
    const userRef = doc(db, "users", uid);
    await deleteDoc(userRef);
  } catch (error) {
    console.error("Error deleting user profile:", error);
    throw new Error("Failed to delete user profile");
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

/**
 * Exports password hashing and comparison for use in components
 */
export { hashPassword, comparePasswords };
