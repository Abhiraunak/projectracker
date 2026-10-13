"use client";

import { useRef, useState } from "react";
import { FiLogOut } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/auth-api";

export const SidebarFooter = () => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    if (inFlight.current) return; // ref updates immediately, state doesn't
    inFlight.current = true;
    setIsSigningOut(true);
    setError(null);

    try {
      await authApi.logout();
    } catch (e) {
      // If the session is already expired (401), the user is effectively signed out
      // anyway, so carry on. Anything else (network/server error) is a real failure.
      const status = (e as { status?: number })?.status;
      if (status !== 401) {
        console.error("Failed to sign out:", e);
        setError("Couldn't sign out. Try again.");
        setIsSigningOut(false);
        inFlight.current = false;
        return;
      }
    }

    // Stop in-flight requests, then wipe cached user data (name, projects, attendance...)
    await queryClient.cancelQueries();
    queryClient.clear();

    router.replace("/signin");
    router.refresh(); // drops Next's client-side router cache of protected pages
  };

  return (
    <div className="mt-auto border-t border-stone-300 p-2 text-xs transition-colors dark:border-stone-800">
      <button
        type="button"
        disabled={isSigningOut}
        onClick={handleSignOut}
        className="flex min-h-9 items-center gap-1.5 rounded bg-stone-200 px-2.5 py-1.5 font-medium text-stone-700 outline-none transition-colors hover:bg-red-600 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-red-600"
      >
        <FiLogOut className="size-3.5" aria-hidden />
        <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
      </button>

      {error && (
        <p role="alert" className="mt-2 px-1 font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};