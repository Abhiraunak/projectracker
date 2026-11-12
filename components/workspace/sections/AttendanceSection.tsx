"use client";

import { lazy, Suspense, useRef, useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiBarChart2, FiCalendar, FiClipboard, FiFolder, FiGrid, FiTool } from "react-icons/fi";
import { AttendanceManager } from "@/components/labour/Attendancemanager";
import { RegistersPanel } from "@/components/labour/attendance/RegistersPanel";
import type { OpenSheet } from "@/lib/attendanceApi";
import { useWorkspaceSection } from "@/hooks/useWorkspacePlace";
import { todayLocal, weekStartOf } from "@/lib/projects/labourWeeks";
import { LabourSearch } from "./labour/LabourSearch";
import { WeekView } from "./labour/WeekView";
import { mono } from "./materials/mono";
import { SectionSkeleton } from "../ui";

// Everything after the week downloads only when someone opens it
const MonthView = lazy(() => import("./labour/MonthView").then((m) => ({ default: m.MonthView })));
const ContractWork = lazy(() => import("./labour/ContractWork").then((m) => ({ default: m.ContractWork })));
const RatesSection = lazy(() => import("./RatesSection")); // contractor vs in-house

type View = "week" | "sheet" | "saved" | "month" | "contract" | "rates";
const VIEWS: { key: View; label: string; Icon: IconType }[] = [
  { key: "week", label: "This week", Icon: FiCalendar },
  { key: "sheet", label: "Hourly sheet", Icon: FiClipboard },
  { key: "saved", label: "Saved attendance", Icon: FiFolder },
  { key: "month", label: "Monthly", Icon: FiGrid },
  { key: "contract", label: "Contract work", Icon: FiTool },
  { key: "rates", label: "Rate comparison", Icon: FiBarChart2 },
];

/**
 * The project's labour, in the order it is used:
 *  - This week: each contractor's pay week (Mon–Sun): earned, carried from last week, paid, left; pay and settle.
 *  - Hourly sheet: attendance by the hour (or by day, present/absent), the existing entry form and saved records.
 *  - Monthly: one contractor's labour sheet, or every contractor together.
 *  - Contract work: measured work × rate per sqft (or rft, nos…).
 *  - Rate comparison. (Payments are made from each contractor's card in This week.)
 * A search on top finds anything and opens its week. Panels once opened stay mounted, so a half-filled sheet stays.
 */
export default function AttendanceSection({ projectId }: { projectId: string }) {
  // An old ?s=rates link lands on Rate comparison
  const startOn: View = useWorkspaceSection() === "rates" ? "rates" : "week";
  const [view, setView] = useState<View>(startOn);
  // The sheet is always mounted (hidden until its tab), so Saved attendance can open a contractor's sheet in it
  const [opened, setOpened] = useState<Set<View>>(() => new Set<View>([startOn, "sheet"]));
  const openSheetIn = useRef<((sheet: OpenSheet) => void) | null>(null);
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
          <AttendanceManager projectId={projectId} showMonth={false} showRecords={false} openerRef={openSheetIn} />
        </div>
      )}
      {opened.has("saved") && (
        <div hidden={view !== "saved"}>
          <RegistersPanel
            projectId={projectId}
            onOpen={(sheet) => {
              show("sheet");
              openSheetIn.current?.(sheet);
            }}
          />
        </div>
      )}
      {panel("month", <MonthView projectId={projectId} />)}
      {panel("contract", <ContractWork projectId={projectId} />)}
      {panel("rates", <RatesSection projectId={projectId} />)}
    </div>
  );
}