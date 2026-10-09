"use client";

import React, { useState } from "react";
import { FiSun, FiMoon, FiLogOut } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
// import { authApi } from "@/lib/api";
// If using NextAuth, uncomment the import below:
// import { signOut } from "next-auth/react";

export const SidebarFooter = () => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  
  // Sign out: POST /auth/logout revokes the session on the server and clears the cookies
  const handleSignOut = async () => {
    if (isSigningOut) return; // ignore double taps
    setIsSigningOut(true);
    setError(null);

    try {
      // await authApi.logout();

      // Drop everything cached for this user (name, projects, attendance...) so the next
      // person to sign in on this browser can't see it
      queryClient.clear();

      router.replace("/signin");
    } catch (e) {
      console.error("Failed to sign out:", e);
      setError("Couldn't sign out. Try again.");
      setIsSigningOut(false);
    }
  };

  return (
    <div className="mt-auto border-t border-stone-300 dark:border-stone-800 p-2 text-xs transition-colors">
      <div className="flex items-center justify-between">
    
        <button
          type="button"
          disabled={isSigningOut}
          onClick={handleSignOut}
          className="flex min-h-9 items-center gap-1.5 px-2.5 py-1.5 font-medium text-stone-700 dark:text-stone-200 bg-stone-200 dark:bg-stone-800 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 transition-colors rounded disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <FiLogOut className="size-3.5" aria-hidden />
          <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 px-1 font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};