"use client";

import { auth } from "@firebaseConfig";
import { db } from "@firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Creates a user document if it does not already exist
 */
export async function registerUser() {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("User not authenticated");
  }

  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      email: user.email,
      gems: 0,
      createdAt: serverTimestamp(),
    });
  }
}

export async function getGemCount(): Promise<number> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    throw new Error("User document does not exist");
  }

  return snapshot.data().gems ?? 0;
}

export async function addGems(amount: number) {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const userRef = doc(db, "users", user.uid);

  await updateDoc(userRef, {
    gems: increment(amount),
  });
}

export async function subtractGems(amount: number) {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    throw new Error("User document does not exist");
  }

  const currentGems = snapshot.data().gems ?? 0;

  if (currentGems < amount) {
    throw new Error("Not enough gems");
  }

  await updateDoc(userRef, {
    gems: increment(-amount),
  });
}

export async function deleteUser() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const userRef = doc(db, "users", user.uid);

  // Delete Firestore data
  await deleteDoc(userRef);

  // Delete Auth account
  await user.delete();
}
