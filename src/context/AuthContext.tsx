"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@firebaseConfig";
import { getUserProfile } from "@lib/userService";
import { User } from "@/types/users";

type AuthContextType = {
  firebaseUser: FirebaseUser | null;
  firestoreUser: User | null;
  setFirestoreUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  error: string | null;
  emailVerified: boolean;
};

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  firestoreUser: null,
  setFirestoreUser: () => {},
  loading: true,
  error: null,
  emailVerified: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firestoreUser, setFirestoreUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      setLoading(true);
      setFirebaseUser(user);
      setEmailVerified(user?.emailVerified ?? false);

      try {
        if (user) {
          const userProfile = await getUserProfile(user.uid);

          if (!isMounted) return;

          setFirestoreUser(userProfile);
          setError(null);
        } else {
          setFirestoreUser(null);
          setEmailVerified(false);
        }
      } catch (err) {
        console.error("Auth error:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    // Set up window focus listener to refresh email verification status
    const handleWindowFocus = async () => {
      const currentUser = auth.currentUser;
      if (currentUser && isMounted) {
        try {
          await currentUser.reload();
          setEmailVerified(currentUser.emailVerified);
          setFirebaseUser(currentUser);
        } catch (err) {
          console.error("Error refreshing user verification status:", err);
        }
      }
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        firestoreUser,
        setFirestoreUser,
        loading,
        error,
        emailVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
