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
      // Hover lives on the wrapper so the pointer can travel from the icon to
      // the menu without passing through dead space
      <div
        className="relative flex items-center"
        onMouseEnter={() => setIsDropdownOpen(true)}
        onMouseLeave={() => setIsDropdownOpen(false)}
      >
        <button
          aria-label="Account options"
          aria-expanded={isDropdownOpen}
          className="flex items-center text-graphite-soft hover:text-graphite transition-colors"
        >
          <HiOutlineUser size={22} />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-full z-50 w-44 pt-3">
            <div className="surface rounded-xl py-2 animate-rise">
              <Link
                href="/sign-up"
                className="block px-4 py-2 text-sm text-graphite-soft hover:text-graphite hover:bg-azure/5 transition-colors"
              >
                Sign Up
              </Link>
              <Link
                href="/log-in"
                className="block px-4 py-2 text-sm text-graphite-soft hover:text-graphite hover:bg-azure/5 transition-colors"
              >
                Log In
              </Link>
            </div>
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
      className="flex items-center text-graphite-soft hover:text-graphite transition-colors"
    >
      <HiOutlineCog size={22} />
    </button>
  );
}
