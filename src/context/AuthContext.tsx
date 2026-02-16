"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@firebaseConfig";
import { getUserProfile } from "@lib/userService";
import { User } from "@/types/users";

type AuthContextType = {
  firebaseUser: FirebaseUser | null;
  firestoreUser: User | null;
  loading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  firestoreUser: null,
  loading: true,
  error: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firestoreUser, setFirestoreUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      try {
        if (user && !initializedRef.current) {
          initializedRef.current = true;
        }

        // Fetch Firestore user profile if Firebase user exists
        if (user) {
          const userProfile = await getUserProfile(user.uid);
          setFirestoreUser(userProfile);
          setError(null);
        } else {
          setFirestoreUser(null);
        }
      } catch (err) {
        console.error("Auth error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, firestoreUser, loading, error }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
