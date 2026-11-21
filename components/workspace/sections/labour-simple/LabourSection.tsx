"use client";

import { useState } from "react";
import { FiBarChart2, FiClipboard, FiCreditCard, FiTool } from "react-icons/fi";
import { AttendanceTab } from "./AttendanceTab";
import { CompareTab } from "./CompareTab";
import { PaymentsTab } from "./PaymentsTab";
import { SubcontractTab } from "./SubcontractTab";
import { mono } from "./shared";

type TabKey = "attendance" | "subcontract" | "payments" | "compare";
const TABS: { key: TabKey; label: string; Icon: typeof FiClipboard }[] = [
  { key: "attendance", label: "Attendance", Icon: FiClipboard },
  { key: "subcontract", label: "Subcontract", Icon: FiTool },
  { key: "payments", label: "Payments", Icon: FiCreditCard },
  { key: "compare", label: "Rate comparison", Icon: FiBarChart2 },
];

/**
 * The Labour section, kept simple: four tabs.
 *  - Attendance: pick the work, the day and the contractor, then hours, OT and rates for each worker (saved as you type);
 *  - Subcontract: work given on contract (quantity × rate) for any number of subcontractors, with what is left to pay;
 *  - Payments: one person between two dates: earned, paid, still to pay, every payment (add, change, delete);
 *  - Rate comparison: our own labour on a work against subcontractors' quotes.
 * Everything can be changed at any time.
 */
export default function LabourSection({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<TabKey>("attendance");
  const [payFor, setPayFor] = useState<string | null>(null); // "Pay" elsewhere opens Payments on that person
  const pay = (name: string) => {
    setPayFor(name);
    setTab("payments");
  };

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Labour" className="grid grid-cols-2 gap-1 rounded-2xl bg-[#EFEFED] p-1 sm:grid-cols-4">
        {TABS.map(({ key, label, Icon }) => {
          const on = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(key)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm ${mono.motion} ${mono.ring} ${
                on ? "bg-white font-semibold text-[#111111] shadow-[0_1px_2px_rgba(17,17,17,0.08)]" : "text-[#555555] hover:bg-white/60"
              }`}
            >
              <Icon aria-hidden /> {label}
            </button>
          );
        })}
      </div>

      {tab === "attendance" && <AttendanceTab projectId={projectId} />}
      {tab === "subcontract" && <SubcontractTab projectId={projectId} onPay={pay} />}
      {tab === "payments" && <PaymentsTab projectId={projectId} initialPerson={payFor} />}
      {tab === "compare" && <CompareTab projectId={projectId} onPay={pay} />}
    </div>
  );
}