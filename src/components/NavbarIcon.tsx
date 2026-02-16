"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiOutlineUser, HiOutlineCog } from "react-icons/hi";
import { useAuth } from "@context/AuthContext";

export default function NavbarIcon() {
  const router = useRouter();
  const { firebaseUser, loading } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (loading) {
    return <div className="w-6 h-6" />;
  }

  if (!firebaseUser) {
    // Not signed in - show user icon with dropdown for Sign Up and Log In
    return (
      <div className="relative group">
        <button
          onMouseEnter={() => setIsDropdownOpen(true)}
          onMouseLeave={() => setIsDropdownOpen(false)}
          aria-label="Account options"
          className="mt-1.5 hover:text-ycs-pink transition-colors"
        >
          <HiOutlineUser size={24} className="text-white" />
        </button>

        {isDropdownOpen && (
          <div
            onMouseEnter={() => setIsDropdownOpen(true)}
            onMouseLeave={() => setIsDropdownOpen(false)}
            className="absolute right-0 mt-[-.5rem] w-40 bg-white rounded-lg shadow-lg z-50 py-2"
          >
            <Link
              href="/sign-up"
              className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors"
            >
              Sign Up
            </Link>
            <Link
              href="/log-in"
              className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors border-t border-gray-200"
            >
              Log In
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Signed in - show settings icon
  return (
    <button
      onClick={() => router.push("/settings")}
      aria-label="Settings"
      className="mt-1.5 hover:text-ycs-pink transition-colors"
    >
      <HiOutlineCog size={24} className="text-white" />
    </button>
  );
}
