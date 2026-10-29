"use client";

import type { ReactNode } from "react";
import { useAccess } from "@/hooks/useProjectAccess";
import { AdminDashboard } from "./AdminDashboard";

/**
 * The dashboard home page: admins get the admin dashboard, everyone else what the page showed before.
 * In app/dashboard/page.tsx, wrap the page's current content:  <AdminOr>{current content}</AdminOr>
 */
export function AdminOr({ children }: { children: ReactNode }) {
  const access = useAccess();
  if (access.isLoading) return <div aria-busy="true" className="h-64 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />;
  return access.isAdmin ? <AdminDashboard /> : <>{children}</>;
}