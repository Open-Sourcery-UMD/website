"use client";

import { signInWithGoogle } from "@lib/auth";
import { useAuth } from "@context/AuthContext";

export default function SignInButton() {
  const { user, loading } = useAuth();

  async function handleClick() {
    try {
      if (user) {
        return;
      } else {
        await signInWithGoogle();
      }
    } catch (err: any) {
      alert(err.message ?? "Authentication failed");
    }
  }

  if (loading) {
    return (
      <button
        disabled
        className="px-4 py-2 rounded bg-gray-400 text-white cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
    >
      {user ? user.email : "Sign In"}
    </button>
  );
}
