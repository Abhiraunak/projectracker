"use client";

import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { MonthSheet } from "@/components/labour/attendance/MonthSheet";
import { useLabourMonth } from "@/hooks/useLabourWeeks";
import { weekLabel } from "@/lib/projects/labourWeeks";
import { SectionError } from "../../ui";
import { mono } from "../materials/mono";
import { money } from "../materials/purchaseFormat";

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y!, m! - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthName = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

type Mode = "contractor" | "total";

/**
 * The month, two ways: by contractor (one team head's labour sheet: every labourer, every day, hours, OT and the
 * month's account) or total (every contractor together, earned by pay week, contract work and paid).
 */
export function MonthView({ projectId }: { projectId: string }) {
  const [mode, setMode] = useState<Mode>("contractor");
  return (
    <div className="space-y-4">
      <div role="group" aria-label="Month sheet" className="inline-grid w-full grid-cols-2 gap-1 rounded-xl bg-[#EFEFED] p-1 sm:w-auto">
        {(
          [
            ["contractor", "By contractor"],
            ["total", "Total"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={mode === key}
            onClick={() => setMode(key)}
            className={`min-h-10 rounded-lg px-4 text-sm font-medium ${mono.motion} ${mono.ring} ${mode === key ? "bg-white text-[#111111] shadow-[0_1px_2px_rgba(17,17,17,0.08)]" : "text-[#666666] hover:text-[#111111]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "contractor" ? <MonthSheet projectId={projectId} /> : <MonthTotals projectId={projectId} />}
    </div>
  );
}

function MonthTotals({ projectId }: { projectId: string }) {
  const [month, setMonth] = useState(thisMonth);
  const q = useLabourMonth(projectId, month);
  const data = q.data;

  return (
    <section aria-label="Every contractor this month" className={`${mono.card} overflow-hidden`}>
      <div className="flex flex-col gap-3 border-b border-[#EFEFED] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-[15px] font-semibold text-[#111111]">{monthName(month)}</h2>
          <p className="text-xs text-[#666666]">Every contractor: earned each pay week (attendance + contract work), and paid</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month" className={mono.icon}>
            <FiChevronLeft aria-hidden />
          </button>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" className={`${mono.field} mt-0 h-10 w-40`} />
          <button type="button" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month" className={mono.icon}>
            <FiChevronRight aria-hidden />
          </button>
        </div>
      </div>

      {q.isError ? (
        <div className="p-4">
          <SectionError error={q.error} onRetry={() => void q.refetch()} />
        </div>
      ) : !data ? (
        <div aria-busy="true" className="m-4 h-40 animate-pulse rounded-2xl bg-[#F7F7F5] motion-reduce:animate-none" />
      ) : data.lines.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-[#666666]">No labour in {monthName(month)}.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 sm:px-5">
            {(
              [
                ["Attendance", data.totals.attendance],
                ["Contract work", data.totals.contract],
                ["Earned", data.totals.earned],
                ["Paid", data.totals.paid],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className={mono.tile}>
                <dt className={mono.label}>{label}</dt>
                <dd className="text-lg font-semibold tabular-nums text-[#111111]">{money(v)}</dd>
              </div>
            ))}
          </dl>

          {/* phones: a card per contractor */}
          <ul className="divide-y divide-[#EFEFED] border-t border-[#EFEFED] md:hidden">
            {data.lines.map((l) => (
              <li key={l.key} className="px-4 py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-[15px] font-semibold text-[#111111]">
                    {l.contractorName} <span className="font-normal text-[#666666]">{l.trade}</span>
                  </p>
                  <p className="shrink-0 font-semibold tabular-nums text-[#111111]">{money(l.earned)}</p>
                </div>
                <p className="mt-1 text-sm tabular-nums text-[#666666]">
                  Attendance {money(l.attendance)}
                  {l.contract ? ` · Contract ${money(l.contract)}` : ""} · Paid {money(l.paid)}
                </p>
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs tabular-nums text-[#8C8C8C]">
                  {data.weeks.map((w, i) => (l.byWeek[i] ? <span key={w}>{weekLabel(w)}: {money(l.byWeek[i]!)}</span> : null))}
                </p>
              </li>
            ))}
          </ul>

          {/* wider screens: contractors × pay weeks */}
          <div className="relative hidden overflow-x-auto border-t border-[#EFEFED] md:block">
            <table className="w-full min-w-190 text-sm">
              <thead>
                <tr className="bg-[#F7F7F5]">
                  <th scope="col" className={`${mono.th} pl-5`}>
                    Contractor
                  </th>
                  {data.weeks.map((w) => (
                    <th key={w} scope="col" className={`${mono.th} text-right`}>
                      {weekLabel(w)}
                    </th>
                  ))}
                  <th scope="col" className={`${mono.th} text-right`}>
                    Contract
                  </th>
                  <th scope="col" className={`${mono.th} text-right`}>
                    Earned
                  </th>
                  <th scope="col" className={`${mono.th} pr-5 text-right`}>
                    Paid
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEFED]">
                {data.lines.map((l) => (
                  <tr key={l.key} className="hover:bg-[#FAFAF9]">
                    <th scope="row" className={`${mono.td} pl-5 text-left font-medium text-[#111111]`}>
                      {l.contractorName}
                      {l.trade && <span className="block text-xs font-normal text-[#8C8C8C]">{l.trade}</span>}
                    </th>
                    {l.byWeek.map((v, i) => (
                      <td key={i} className={`${mono.td} text-right tabular-nums ${v ? "text-[#333333]" : "text-[#B5B5B2]"}`}>
                        {v ? money(v) : "–"}
                      </td>
                    ))}
                    <td className={`${mono.td} text-right tabular-nums text-[#333333]`}>{l.contract ? money(l.contract) : "–"}</td>
                    <td className={`${mono.td} text-right font-semibold tabular-nums text-[#111111]`}>{money(l.earned)}</td>
                    <td className={`${mono.td} pr-5 text-right tabular-nums text-[#333333]`}>{money(l.paid)}</td>
                  </tr>
                ))}
                <tr className="bg-[#F7F7F5] font-semibold">
                  <th scope="row" className={`${mono.td} pl-5 text-left text-[#111111]`}>
                    Total
                  </th>
                  {data.totals.byWeek.map((v, i) => (
                    <td key={i} className={`${mono.td} text-right tabular-nums text-[#111111]`}>
                      {v ? money(v) : "–"}
                    </td>
                  ))}
                  <td className={`${mono.td} text-right tabular-nums text-[#111111]`}>{money(data.totals.contract)}</td>
                  <td className={`${mono.td} text-right tabular-nums text-[#111111]`}>{money(data.totals.earned)}</td>
                  <td className={`${mono.td} pr-5 text-right tabular-nums text-[#111111]`}>{money(data.totals.paid)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}