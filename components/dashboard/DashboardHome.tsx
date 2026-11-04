"use client";

import type { ReactNode } from "react";
import { useAccess } from "@/hooks/useProjectAccess";
import { useDashboardKind } from "@/lib/dashboard/choice";
import { AdminDashboard } from "./admin/AdminDashboard";
import { SimpleDashboard } from "./simple/SimpleDashboard";

/**
 * The dashboard home page. Everyone starts on the simple dashboard (new project, new BOQ, the projects, and for
 * admins recent activity). "Switch to full dashboard" brings back what each person had before:
 *  - admins: the admin overview;
 *  - everyone else: `children`, the page's previous dashboard. Without children there is no switch for them.
 * The default is DEFAULT_DASHBOARD in lib/dashboard/choice.ts.
 *
 * In app/dashboard/page.tsx:  <DashboardHome><DashBoard /></DashboardHome>
 */
export function DashboardHome({ children }: { children?: ReactNode }) {
  const access = useAccess();
  const [kind, setKind] = useDashboardKind();
  if (access.isLoading) return <div aria-busy="true" className="h-64 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />;

  // What "full" means for this person; nothing to switch to = simple only
  const full = access.isAdmin ? <AdminDashboard /> : children;
  if (!full) return <SimpleDashboard />;

  if (kind === "simple") return <SimpleDashboard onSwitch={() => setKind("full")} />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={() => setKind("simple")} className="min-h-10 text-sm font-medium text-stone-600 underline underline-offset-4 hover:text-stone-900">
          Switch to simple dashboard
        </button>
      </div>
      {full}
    </div>
  );
}