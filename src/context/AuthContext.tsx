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
};

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  firestoreUser: null,
  setFirestoreUser: () => {},
  loading: true,
  error: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firestoreUser, setFirestoreUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      setLoading(true);
      setFirebaseUser(user);

      try {
        if (user) {
          const userProfile = await getUserProfile(user.uid);

          if (!isMounted) return;

          setFirestoreUser(userProfile);
          setError(null);
        } else {
          setFirestoreUser(null);
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

    return () => {
      isMounted = false;
      unsubscribe();
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
