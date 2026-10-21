"use client";

import { useRef, useState } from "react";
import { FiLogOut } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/auth-api";
import { forgetThisDevice } from "@/lib/push";
import { NotificationToggle } from "@/components/notifications/NotificationToggle";

/** The bottom of the sidebar: signing out */
export const SidebarFooter = () => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false); // a ref updates at once; state doesn't, so a double click could slip through
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsSigningOut(true);
    setError(null);

    // This device stops getting this person's notifications (done while still signed in, so the server accepts it)
    await forgetThisDevice();

    try {
      await authApi.logout();
    } catch (e) {
      // An already-expired session (401) means the person is signed out anyway, so carry on.
      // Anything else (network or server trouble) is a real failure.
      const status = (e as { status?: number })?.status;
      if (status !== 401) {
        console.error("Failed to sign out:", e);
        setError("Couldn't sign out. Try again.");
        setIsSigningOut(false);
        inFlight.current = false;
        return;
      }
    }

    // Stop requests still running, then wipe everything cached about this person (name, projects, attendance...)
    await queryClient.cancelQueries();
    queryClient.clear();

    router.replace("/signin");
    router.refresh(); // drops Next's client-side cache of the signed-in pages
  };

  return (
    <div className="mt-auto shrink-0 space-y-1 border-t border-stone-300 pt-3 pb-[env(safe-area-inset-bottom)]">
      <NotificationToggle />
      <button
        type="button"
        disabled={isSigningOut}
        onClick={handleSignOut}
        className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50 lg:py-1.5"
      >
        <FiLogOut aria-hidden className="shrink-0" />
        <span>{isSigningOut ? "Signing out…" : "Sign out"}</span>
      </button>

      {error && (
        <p role="alert" className="mt-2 px-2.5 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
};
