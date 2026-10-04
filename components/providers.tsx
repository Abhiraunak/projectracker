"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError, setSessionExpiredHandler } from "@/lib/api";

// Set NEXT_PUBLIC_LOGIN_PATH if your login page isn't at /login
const LOGIN_PATH = process.env.NEXT_PUBLIC_LOGIN_PATH ?? "/login";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Don't retry 4xx (not signed in, not found); retry network/5xx twice
            retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
          },
        },
      })
  );

  // The session could not be renewed (signed out elsewhere, 90-day limit, token reuse...): clear cached data and go to login
  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (window.location.pathname.startsWith(LOGIN_PATH)) return;
      client.clear(); // never leave the previous user's data in memory
      router.replace(`${LOGIN_PATH}?expired=1`);
    });
    return () => setSessionExpiredHandler(null);
  }, [client, router]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}