"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/auth-api";
import { forgetThisDevice } from "@/lib/push";

/**
 * Signing out, in one place (the user menu in the top bar, and the old sidebar footer):
 * this device stops getting notifications, the session ends, everything cached about the person is wiped, and the
 * sign-in page opens. An already-expired session (401) counts as signed out.
 */
export function useSignOut() {
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inFlight = useRef(false); // a ref updates at once; state doesn't, so a double click could slip through
    const router = useRouter();
    const queryClient = useQueryClient();

    const signOut = useCallback(async () => {
        if (inFlight.current) return;
        inFlight.current = true;
        setIsSigningOut(true);
        setError(null);

        // This device stops getting this person's notifications (done while still signed in, so the server accepts it)
        await forgetThisDevice();

        try {
            await authApi.logout();
        } catch (e) {
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
    }, [queryClient, router]);

    return { signOut, isSigningOut, error };
}