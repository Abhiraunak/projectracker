"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiLogOut } from "react-icons/fi";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/lib/auth-api";
import { ApiError } from "@/lib/api";
import { clientApi } from "@/lib/client/api";
import { clientKeys } from "@/hooks/useClientPortal";
import { roleOf } from "@/lib/auth/home";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "";

/**
 * The client portal's frame: no staff menu, just the company name and signing out.
 * Only client accounts stay here; staff are sent to their dashboard, and anyone signed out to the sign-in page.
 */
export default function ClientLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isUserLoading } = useAuth();
  const role = roleOf(user);
  const [signingOut, setSigningOut] = useState(false);
  const inFlight = useRef(false);

  // If "who am I" doesn't say the role, ask the portal itself: it answers a client and refuses staff (403).
  // Same key as the portal page's own list, so this costs no extra request.
  const probe = useQuery({ queryKey: clientKeys.projects, queryFn: clientApi.projects, staleTime: 5 * 60_000, enabled: !!user && role === undefined });
  const isClient = role === "CLIENT" || (role === undefined && probe.isSuccess);
  const isStaff = (role !== undefined && role !== "CLIENT") || (probe.error instanceof ApiError && probe.error.status === 403);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) router.replace("/signin?next=/client");
    else if (isStaff) router.replace("/dashboard"); // only when sure: guessing here sent clients back and forth
  }, [isUserLoading, user, isStaff, router]);

  const signOut = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSigningOut(true);
    try {
      await authApi.logout();
    } catch {
      /* an expired session is signed out anyway */
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    router.replace("/signin");
    router.refresh();
  };

  const ready = !isUserLoading && isClient;

  return (
    <div className="min-h-dvh bg-[#f4f1ec] text-stone-950">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-sm font-bold text-white">
              {(COMPANY || "C").charAt(0)}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">{COMPANY || "Client portal"}</p>
              {COMPANY && <p className="text-xs text-stone-500">Client portal</p>}
            </div>
          </div>
          {ready && (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden truncate text-sm text-stone-600 sm:block">{user?.email}</span>
              <NotificationBell />
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-200 px-3 text-sm font-semibold hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"
              >
                <FiLogOut aria-hidden /> {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {ready ? (
          children
        ) : probe.isError && !isStaff ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>Couldn&rsquo;t open your portal. Check your connection.</p>
            <button type="button" onClick={() => void probe.refetch()} className="mt-2 min-h-11 font-medium underline sm:min-h-0">
              Try again
            </button>
          </div>
        ) : (
          <div aria-busy="true" className="h-64 animate-pulse rounded-xl bg-stone-200/60 motion-reduce:animate-none" />
        )}
      </main>
    </div>
  );
}
