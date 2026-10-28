"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAccess } from "@/hooks/useProjectAccess";

import { NoAccess } from "./NoAccess";
import { WelcomePage } from "./WelcomePage";
import { currentRoute, routeAllowed } from "../dashboard/Sidebar/Routes";

/**
 * Decides what a person may see, before any page renders:
 *  - still checking: a placeholder
 *  - no access at all (a new account): the welcome page, whatever address they opened
 *  - a page their permissions don't include: a "no access" message
 *  - otherwise: the page
 */
export function AccessGate({ children }: { children: React.ReactNode }) {
  const access = useAccess();
  const pathname = usePathname();

  if (access.isLoading) {
    return <div aria-busy="true" className="h-64 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />;
  }
  if (access.isError) {
    return (
      <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>Couldn&rsquo;t check your access.</p>
        <button type="button" onClick={access.refetch} className="mt-2 font-medium underline">
          Try again
        </button>
      </div>
    );
  }
  if (!access.hasAnyAccess) return <WelcomePage />;

  const route = currentRoute(pathname);
  if (route && !routeAllowed(route, access)) return <NoAccess />;

  return <>{children}</>;
}
