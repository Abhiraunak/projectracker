"use client";

import { lazy, Suspense, useState } from "react";
import type { IconType } from "react-icons";
import { FiBarChart2, FiClipboard, FiCreditCard, FiPaperclip } from "react-icons/fi";

import { useLabourSummary } from "@/hooks/useLabour";
import { useWorkspaceSection } from "@/hooks/useWorkspacePlace";
import { CostDonut } from "./labour/CostDonut";
import { SectionError, SectionSkeleton } from "../ui";
import { AttendanceManager } from "@/components/labour/Attendancemanager";

// Payments and Expenses download only when someone opens them; attendance is the usual first stop, so it ships here
const PaymentsPanel = lazy(() => import("./labour/PaymentsPanel").then((m) => ({ default: m.PaymentsPanel })));
const ExpensesSection = lazy(() => import("./ExpensesSection"));
const RatesSection = lazy(() => import("./RatesSection")); // contractor vs in-house, was its own tab

type View = "attendance" | "payments" | "expenses" | "rates";
const VIEWS: { key: View; label: string; hint: string; Icon: IconType }[] = [
  { key: "attendance", label: "Attendance", hint: "Daily labour entries", Icon: FiClipboard },
  { key: "payments", label: "Payments", hint: "Paid to contractors", Icon: FiCreditCard },
  { key: "expenses", label: "Expenses", hint: "Labour expenses", Icon: FiPaperclip },
  { key: "rates", label: "Rate comparison", hint: "Contractor vs in-house", Icon: FiBarChart2 },
];

/**
 * The project's labour page: the cost donut (by trade, plus General expenses) on top, then Attendance, Payments,
 * Expenses and Rate comparison (contractor vs in-house, which used to be its own tab). Attendance is the existing attendance module, unchanged. Panels once opened stay mounted, so switching
 * back keeps a half-filled sheet or form as it was.
 */
export default function AttendanceSection({ projectId }: { projectId: string }) {
  const summary = useLabourSummary(projectId);
  // An old ?s=rates link lands here: start on Rate comparison
  const startOn: View = useWorkspaceSection() === "rates" ? "rates" : "attendance";
  const [view, setView] = useState<View>(startOn);
  const [opened, setOpened] = useState<Set<View>>(() => new Set<View>(["attendance", startOn]));

  const show = (v: View) => {
    setView(v);
    setOpened((s) => (s.has(v) ? s : new Set(s).add(v)));
  };

  return (
    <div className="space-y-6">
      <section aria-label="Labour cost" className="rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-stone-900">Labour cost</h2>
        {summary.isError ? (
          <SectionError error={summary.error} onRetry={() => void summary.refetch()} />
        ) : summary.data ? (
          <CostDonut summary={summary.data} />
        ) : (
          <div aria-busy="true" className="h-52 animate-pulse rounded-lg bg-stone-100 motion-reduce:animate-none" />
        )}
      </section>

      <div role="group" aria-label="Labour" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {VIEWS.map(({ key, label, hint, Icon }) => {
          const on = view === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => show(key)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 sm:flex-row sm:justify-start sm:gap-3 sm:px-4 sm:text-left ${on ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:text-stone-900"
                }`}
            >
              <Icon aria-hidden className="shrink-0 text-lg" />
              <span className="min-w-0">
                <span className="block">{label}</span>
                <span className={`hidden truncate text-xs font-normal sm:block ${on ? "text-stone-300" : "text-stone-500"}`}>{hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div hidden={view !== "attendance"}>
        <AttendanceManager projectId={projectId} />
      </div>
      {opened.has("payments") && (
        <div hidden={view !== "payments"}>
          <Suspense fallback={<SectionSkeleton />}>
            <PaymentsPanel projectId={projectId} />
          </Suspense>
        </div>
      )}
      {opened.has("expenses") && (
        <div hidden={view !== "expenses"}>
          <Suspense fallback={<SectionSkeleton />}>
            <ExpensesSection projectId={projectId} sections={["labour"]} />
          </Suspense>
        </div>
      )}
      {opened.has("rates") && (
        <div hidden={view !== "rates"}>
          <Suspense fallback={<SectionSkeleton />}>
            <RatesSection projectId={projectId} />
          </Suspense>
        </div>
      )}
    </div>
  );
}