"use client";

import { lazy, Suspense, useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiBarChart2, FiCalendar, FiClipboard, FiCreditCard, FiGrid, FiPaperclip, FiTool } from "react-icons/fi";
import { AttendanceManager } from "@/components/labour/Attendancemanager";
import { useLabourSummary } from "@/hooks/useLabour";
import { useWorkspaceSection } from "@/hooks/useWorkspacePlace";
import { todayLocal, weekStartOf } from "@/lib/projects/labourWeeks";
import { CostDonut } from "./labour/CostDonut";
import { LabourSearch } from "./labour/LabourSearch";
import { WeekView } from "./labour/WeekView";
import { mono } from "./materials/mono";
import { SectionError, SectionSkeleton } from "../ui";


// Everything after the week downloads only when someone opens it
const MonthView = lazy(() => import("./labour/MonthView").then((m) => ({ default: m.MonthView })));
const ContractWork = lazy(() => import("./labour/ContractWork").then((m) => ({ default: m.ContractWork })));
const PaymentsPanel = lazy(() => import("./labour/PaymentsPanel").then((m) => ({ default: m.PaymentsPanel })));
const ExpensesSection = lazy(() => import("./ExpensesSection"));
const RatesSection = lazy(() => import("./RatesSection")); // contractor vs in-house

type View = "week" | "sheet" | "month" | "contract" | "payments" | "expenses" | "rates";
const VIEWS: { key: View; label: string; Icon: IconType }[] = [
  { key: "week", label: "This week", Icon: FiCalendar },
  { key: "sheet", label: "Hourly sheet", Icon: FiClipboard },
  { key: "month", label: "Monthly", Icon: FiGrid },
  { key: "contract", label: "Contract work", Icon: FiTool },
  { key: "payments", label: "Payments", Icon: FiCreditCard },
  { key: "expenses", label: "Expenses", Icon: FiPaperclip },
  { key: "rates", label: "Rate comparison", Icon: FiBarChart2 },
];

/**
 * The project's labour, in the order it is used:
 *  - This week: each contractor's pay week (Mon–Sun): earned, carried from last week, paid, left; pay and settle.
 *  - Hourly sheet: attendance by the hour (or by day, present/absent), the existing entry form and saved records.
 *  - Monthly: one contractor's labour sheet, or every contractor together.
 *  - Contract work: measured work × rate per sqft (or rft, nos…).
 *  - Payments (with the cost donut), Expenses, Rate comparison.
 * A search on top finds anything and opens its week. Panels once opened stay mounted, so a half-filled sheet stays.
 */
export default function AttendanceSection({ projectId }: { projectId: string }) {
  // An old ?s=rates link lands on Rate comparison
  const startOn: View = useWorkspaceSection() === "rates" ? "rates" : "week";
  const [view, setView] = useState<View>(startOn);
  const [opened, setOpened] = useState<Set<View>>(() => new Set<View>([startOn]));
  const [weekStart, setWeekStart] = useState(() => weekStartOf(todayLocal()));
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const show = (v: View) => {
    setView(v);
    setOpened((s) => (s.has(v) ? s : new Set(s).add(v)));
  };
  const panel = (v: View, node: ReactNode) =>
    opened.has(v) && (
      <div hidden={view !== v}>
        <Suspense fallback={<SectionSkeleton />}>{node}</Suspense>
      </div>
    );

  return (
    <div className="space-y-5">
      <LabourSearch
        projectId={projectId}
        onPick={(start, key) => {
          setWeekStart(start);
          setFocusKey(key);
          show("week");
        }}
      />

      {/* one row that scrolls sideways on a phone */}
      <nav aria-label="Labour" className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex min-w-full gap-1 rounded-2xl bg-[#EFEFED] p-1">
          {VIEWS.map(({ key, label, Icon }) => {
            const on = view === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => show(key)}
                className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-sm font-medium sm:flex-1 sm:justify-center ${mono.motion} ${mono.ring} ${on ? "bg-white text-[#111111] shadow-[0_1px_2px_rgba(17,17,17,0.08)]" : "text-[#666666] hover:text-[#111111]"
                  }`}
              >
                <Icon aria-hidden className="shrink-0" />
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      {opened.has("week") && (
        <div hidden={view !== "week"}>
          <WeekView
            projectId={projectId}
            start={weekStart}
            onStart={(s) => {
              setWeekStart(s);
              setFocusKey(null);
            }}
            focusKey={focusKey}
            onMarkAttendance={() => show("sheet")}
          />
        </div>
      )}
      {opened.has("sheet") && (
        <div hidden={view !== "sheet"}>
          <AttendanceManager projectId={projectId} showMonth={false} />
        </div>
      )}
      {panel("month", <MonthView projectId={projectId} />)}
      {panel("contract", <ContractWork projectId={projectId} />)}
      {panel(
        "payments",
        <div className="space-y-5">
          <LabourCost projectId={projectId} />
          <PaymentsPanel projectId={projectId} />
        </div>
      )}
      {panel("expenses", <ExpensesSection projectId={projectId} sections={["labour"]} />)}
      {panel("rates", <RatesSection projectId={projectId} />)}
    </div>
  );
}

/** The cost donut: labour by trade (attendance and contract work), plus General expenses */
function LabourCost({ projectId }: { projectId: string }) {
  const summary = useLabourSummary(projectId);
  return (
    <section aria-label="Labour cost" className={`${mono.card} p-4 sm:p-6`}>
      <h2 className="mb-4 text-[15px] font-semibold text-[#111111]">Labour cost</h2>
      {summary.isError ? (
        <SectionError error={summary.error} onRetry={() => void summary.refetch()} />
      ) : summary.data ? (
        <CostDonut summary={summary.data} />
      ) : (
        <div aria-busy="true" className="h-52 animate-pulse rounded-2xl bg-[#F7F7F5] motion-reduce:animate-none" />
      )}
    </section>
  );
}