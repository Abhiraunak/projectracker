"use client";

import { useState } from "react";
import { FiDownload, FiRefreshCw } from "react-icons/fi";
import { useAuth } from "@/hooks/useAuth";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import { describeError } from "@/lib/api";
import type { AdminOverview, Period } from "@/lib/dashboard/types";
import { KpiCards, MetricStrip } from "./KpiCards";
import { SpendChart } from "./SpendChart";
import { BudgetByProject, NeedsYou, ProjectsTable, RecentActivity } from "./AdminPanels";

const PERIODS: { id: Period; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
];

const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500";

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** The projects table and headline figures as a CSV file (opens in Excel) */
function exportCsv(data: AdminOverview) {
  const cell = (v: string | number | null) => {
    const text = v === null ? "" : String(v);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows: (string | number | null)[][] = [
    ["Admin overview", data.period, new Date(data.generatedAt).toLocaleString("en-IN")],
    [],
    ["Budget used (₹)", data.kpis.budget.spent, "of", data.kpis.budget.budget],
    ["Work done (%)", Math.round(data.kpis.work.done), "time used (%)", Math.round(data.kpis.work.time)],
    ["Paid to contractors (₹)", data.kpis.labour.paid, "work done worth", data.kpis.labour.earned],
    [],
    ["Project", "Status", "Work done %", "Time used %", "Spent ₹", "Budget ₹", "Budget used %", "Expected ₹", "Next work item"],
    ...data.projects.map((p) => [p.title, p.status, Math.round(p.done), Math.round(p.time), Math.round(p.spent), p.budget, p.used === null ? null : Math.round(p.used), Math.round(p.expected), p.next]),
  ];
  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n"); // BOM: Excel reads ₹ correctly
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `overview-${data.period}-${data.generatedAt.slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** The admin's home page: money, progress, what needs a decision, and what happened, across every project */
export function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("week");
  const overview = useAdminOverview(period);
  const { user } = useAuth();
  const data = overview.data;
  const name = user?.email?.split("@")[0];

  return (
    <div className="min-w-0 text-stone-900">
      {/* Fixed header, the same as the other pages */}
      <header className="sticky top-14 z-20 -mx-4 -mt-5 border-b border-stone-200 bg-white px-4 pt-3 sm:-mx-6 sm:-mt-6 sm:px-6 lg:-top-6 lg:-mx-8 lg:px-8 lg:pt-4">
        <div className="mx-auto mb-3 flex max-w-7xl flex-col gap-3 sm:mb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-0.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {greeting()}
              {name ? `, ${name}` : ""}
            </h1>
            <p className="text-sm text-stone-500">
              {data ? `Here's how your ${data.projects.length} ongoing ${data.projects.length === 1 ? "project is" : "projects are"} doing.` : "Loading your projects…"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Period" className="flex gap-0.5 rounded-lg border border-stone-200 bg-white p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={period === p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`min-h-9 rounded-md px-3 text-sm font-semibold transition-colors ${focusRing} ${period === p.id ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => overview.refetch()}
              aria-label="Refresh"
              className={`flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 ${focusRing}`}
            >
              <FiRefreshCw aria-hidden className={overview.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
            </button>
            <button
              type="button"
              onClick={() => data && exportCsv(data)}
              disabled={!data}
              className={`flex h-10 items-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50 ${focusRing}`}
            >
              <FiDownload aria-hidden /> Export
            </button>
          </div>
        </div>
      </header>

      <div className={`mx-auto max-w-7xl space-y-4 py-5 sm:py-6 ${overview.isPlaceholderData ? "opacity-60 transition-opacity" : ""}`} aria-busy={overview.isFetching}>
        {overview.isPending && (
          <div aria-busy="true" className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />
              ))}
            </div>
            <div className="h-72 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />
          </div>
        )}

        {overview.isError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{describeError(overview.error)}</p>
            <button type="button" onClick={() => overview.refetch()} className="mt-2 font-semibold underline">
              Try again
            </button>
          </div>
        )}

        {data && (
          <>
            <KpiCards data={data} />
            <MetricStrip data={data} />
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <SpendChart data={data} />
              </div>
              <BudgetByProject data={data} />
            </div>
            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <ProjectsTable data={data} />
              </div>
              <NeedsYou data={data} />
            </div>
            <RecentActivity data={data} />
            <p className="text-xs text-stone-500">
              Labour in the spending chart is attendance paid day by day; labour in the budget figures is the amount paid on each work item.
            </p>
          </>
        )}
      </div>
    </div>
  );
}