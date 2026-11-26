"use client";

import { useState } from "react";
import { FiBarChart2, FiClipboard, FiTool } from "react-icons/fi";
import { AttendanceTab } from "./AttendanceTab";
import { CompareTab } from "./CompareTab";
import { SubcontractTab } from "./SubcontractTab";
import { mono } from "./shared";

type TabKey = "attendance" | "subcontract" | "compare";
const TABS: { key: TabKey; label: string; short: string; Icon: typeof FiClipboard }[] = [
  { key: "attendance", label: "Attendance", short: "Attendance", Icon: FiClipboard },
  { key: "subcontract", label: "Subcontract", short: "Subcontract", Icon: FiTool },
  { key: "compare", label: "Rate comparison", short: "Rates", Icon: FiBarChart2 },
];

/**
 * The Labour section, kept simple: three tabs.
 *  - Attendance: team heads and individuals, each with their days and payments (like materials and deliveries), and the
 *    Mark attendance sheet for a team or one person;
 *  - Subcontract: each subcontractor's works with "done till date", and payments for a work or as an advance;
 *  - Rate comparison: our own labour on a work against a contractor's rate.
 * Everything can be changed at any time; archive first, delete for good only from Archived.
 */
export default function LabourSection({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<TabKey>("attendance");

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Labour" className="grid grid-cols-3 gap-1 rounded-2xl bg-[#EFEFED] p-1">
        {TABS.map(({ key, label, short, Icon }) => {
          const on = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(key)}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-1.5 text-[13px] sm:gap-2 sm:px-3 sm:text-sm ${mono.motion} ${mono.ring} ${on ? "bg-white font-semibold text-[#111111] shadow-[0_1px_2px_rgba(17,17,17,0.08)]" : "text-[#555555] hover:bg-white/60"
                }`}
            >
              <Icon aria-hidden className="hidden shrink-0 sm:block" />
              <span className="truncate sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      {tab === "attendance" && <AttendanceTab projectId={projectId} />}
      {tab === "subcontract" && <SubcontractTab projectId={projectId} />}
      {tab === "compare" && <CompareTab projectId={projectId} />}
    </div>
  );
}