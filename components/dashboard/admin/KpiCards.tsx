"use client";

import { memo } from "react";
import type { AdminOverview, Period } from "@/lib/dashboard/types";
import { ago, inrShort, pct } from "@/lib/dashboard/format";

const TICKS = 40;

/** A bar of 40 thin segments: `filled` of them coloured, an optional dark marker (a target) */
function TickBar({ filled, color, marker }: { filled: number; color: string; marker?: number }) {
  const on = Math.round((Math.max(0, Math.min(100, filled)) / 100) * TICKS);
  const mark = marker === undefined ? -1 : Math.min(TICKS - 1, Math.round((Math.max(0, Math.min(100, marker)) / 100) * TICKS));
  return (
    <div aria-hidden className="grid h-6 grid-cols-40 gap-0.5">
      {Array.from({ length: TICKS }, (_, i) => (
        <span key={i} className="rounded-xs" style={{ background: i === mark ? "#1c1917" : i < on ? color : "#efeee9" }} />
      ))}
    </div>
  );
}

interface CardProps {
  label: string;
  side: string;
  value: string;
  of?: string;
  bar: { filled: number; color: string; marker?: number };
  note: string;
  tag: string;
  tagTone?: "dark" | "warn" | "bad" | "good";
}

const TAG = { dark: "text-stone-900", warn: "text-orange-700", bad: "text-red-700", good: "text-green-700" } as const;

function KpiCard({ label, side, value, of, bar, note, tag, tagTone = "dark" }: CardProps) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex justify-between gap-2 text-xs text-stone-500">
        <span>{label}</span>
        <span className="text-right">{side}</span>
      </div>
      <p className="flex flex-wrap items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums tracking-tight">{value}</span>
        {of && <span className="text-sm text-stone-500">{of}</span>}
      </p>
      <TickBar {...bar} />
      <div className="flex justify-between gap-2 text-xs">
        <span className="text-stone-500">{note}</span>
        <span className={`shrink-0 font-semibold ${TAG[tagTone]}`}>{tag}</span>
      </div>
    </section>
  );
}

/** The four headline cards, each against a target */
export const KpiCards = memo(function KpiCards({ data }: { data: AdminOverview }) {
  const { budget, work, labour, approvals } = data.kpis;
  const used = budget.budget > 0 ? (budget.spent / budget.budget) * 100 : 0;
  const paidShare = labour.earned > 0 ? (labour.paid / labour.earned) * 100 : 100;
  const waiting = approvals.requests + approvals.people + approvals.lateDeliveries;
  const behind = work.done + 5 < work.time;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Budget used"
        side="Ongoing projects"
        value={inrShort(budget.spent)}
        of={budget.budget > 0 ? `of ${inrShort(budget.budget)}` : "no budgets set"}
        bar={{ filled: used, color: used > 100 ? "#b91c1c" : "#1c1917" }}
        note={budget.budget > 0 ? `${inrShort(Math.max(0, budget.budget - budget.spent))} left` : "Set project costs to track this"}
        tag={budget.budget > 0 ? pct(used) : "–"}
        tagTone={used > 100 ? "bad" : "dark"}
      />
      <KpiCard
        label="Work done"
        side={`Time used ${pct(work.time)}`}
        value={pct(work.done)}
        of="all projects"
        bar={{ filled: work.done, color: "#ea580c", marker: work.time }}
        note={work.late.length ? `Running late: ${work.late.slice(0, 2).join(", ")}${work.late.length > 2 ? "…" : ""}` : "Work is keeping up with time"}
        tag={behind ? "Behind" : "On track"}
        tagTone={behind ? "warn" : "good"}
      />
      <KpiCard
        label="Paid to contractors"
        side="Of work done"
        value={inrShort(labour.paid)}
        of={`of ${inrShort(labour.earned)}`}
        bar={{ filled: paidShare, color: "#57534e" }}
        note={labour.due > 0 ? `${inrShort(labour.due)} due for finished work` : "Payments are up to date"}
        tag={pct(Math.min(100, paidShare))}
      />
      <KpiCard
        label="Waiting for you"
        side={approvals.oldest ? `Oldest ${ago(approvals.oldest)}` : "Nothing old"}
        value={String(waiting)}
        of={waiting === 1 ? "item" : "items"}
        bar={{ filled: Math.min(100, (waiting / 20) * 100), color: "#ea580c" }}
        note={`${approvals.requests} requests · ${approvals.people} sign-ins · ${approvals.lateDeliveries} late`}
        tag={waiting ? "Review" : "Clear"}
        tagTone={waiting ? "warn" : "good"}
      />
    </div>
  );
});

const PERIOD_WORD: Record<Period, string> = { week: "week", month: "30 days", quarter: "90 days" };

/** Five smaller figures for the chosen period */
export const MetricStrip = memo(function MetricStrip({ data }: { data: AdminOverview }) {
  const s = data.strip;
  const word = PERIOD_WORD[data.period];
  const cells = [
    {
      label: "Material received",
      value: inrShort(s.materialSpend.current),
      delta: s.materialSpend.change === null ? "" : `${s.materialSpend.change >= 0 ? "↑" : "↓"} ${Math.abs(s.materialSpend.change)}%`,
      tone: "text-stone-600",
      note: `this ${word}, vs the one before`,
    },
    {
      label: "Attendance entries",
      value: String(s.attendance.current),
      delta: s.attendance.change === 0 ? "" : `${s.attendance.change > 0 ? "↑" : "↓"} ${Math.abs(s.attendance.change)}`,
      tone: "text-stone-600",
      note: `this ${word}`,
    },
    { label: "Stock alerts", value: String(s.alerts.open), delta: s.alerts.late ? `${s.alerts.late} late` : "", tone: "text-red-700", note: "order more · low · late" },
    { label: "Drawings shared", value: String(s.drawings.shares), delta: "", tone: "text-stone-600", note: `with ${s.drawings.people} ${s.drawings.people === 1 ? "person" : "people"} this ${word}` },
    { label: "BOQ value", value: inrShort(s.boqs.value), delta: "", tone: "text-stone-600", note: `${s.boqs.final} final · ${s.boqs.draft} draft` },
  ];
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-stone-200 bg-white sm:grid-cols-3 lg:grid-cols-5">
      {cells.map((c) => (
        <div key={c.label} className="flex min-w-0 flex-col gap-1 border-b border-r border-stone-100 px-4 py-3">
          <span className="text-xs text-stone-500">{c.label}</span>
          <span className="flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-semibold tabular-nums">{c.value}</span>
            {c.delta && <span className={`text-xs font-semibold ${c.tone}`}>{c.delta}</span>}
          </span>
          <span className="text-xs text-stone-500">{c.note}</span>
        </div>
      ))}
    </div>
  );
});