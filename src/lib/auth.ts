import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "@firebaseConfig";

const ALLOWED_DOMAINS = ["umd.edu", "terpmail.umd.edu"];

export async function signInWithGoogle(): Promise<User | null> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    hd: "umd.edu", // Hint Google to prefer UMD accounts
  });

  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  const email = user.email;
  if (!email) {
    await signOut(auth);
    throw new Error("No email associated with this account.");
  }

  const domain = email.split("@")[1];
  if (!ALLOWED_DOMAINS.includes(domain)) {
    await signOut(auth);
    throw new Error("Only @umd.edu or @terpmail.umd.edu emails are allowed.");
  }

  return user;
}

export async function logout() {
  await signOut(auth);
}
