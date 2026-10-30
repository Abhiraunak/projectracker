"use client";

import type { ReactNode } from "react";
import type { InstalmentStatus, ProofStatus, WorkStatus } from "@/lib/client/types";

export const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500";
export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20 disabled:opacity-60";
export const primaryButton = `inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50 ${focusRing}`;
export const secondaryButton = `inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50 ${focusRing}`;

/** ₹4,20,000 (full amount, Indian grouping) */
export const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

/** "5 Nov 2026" from a YYYY-MM-DD day, without the time zone moving it a day */
export function dayLabel(day: string | null, withYear = true) {
  if (!day) return "–";
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}

/** Today as YYYY-MM-DD in the person's own time zone (the default for "paid on") */
export function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const TONES = {
  green: "bg-green-100 text-green-800",
  blue: "bg-blue-100 text-blue-800",
  orange: "bg-orange-100 text-orange-900",
  red: "bg-red-100 text-red-800",
  grey: "bg-stone-100 text-stone-700",
  dark: "bg-stone-900 text-white",
} as const;
export type Tone = keyof typeof TONES;

export const Pill = ({ tone, children }: { tone: Tone; children: ReactNode }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>
);

export const INSTALMENT_TONE: Record<InstalmentStatus, Tone> = {
  Paid: "green",
  "Checking payment": "blue",
  "Part paid": "orange",
  Overdue: "red",
  Due: "orange",
  Upcoming: "grey",
};

export const PROOF_LOOK: Record<ProofStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Being checked", tone: "blue" },
  APPROVED: { label: "Received", tone: "green" },
  REJECTED: { label: "Not confirmed", tone: "red" },
};

export const WORK_TONE: Record<WorkStatus, Tone> = { Done: "green", Late: "red", "In progress": "blue", "Not started": "grey", Starting: "orange" };

/** A white card with a title row */
export function Card({ title, sub, right, children, className = "" }: { title: string; sub?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={`min-w-0 rounded-xl border border-stone-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {sub && <p className="text-xs text-stone-500">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => <p className="p-6 text-center text-sm text-stone-500">{children}</p>;

export function ProgressBar({ value, marker, color = "#1c1917" }: { value: number; marker?: number; color?: string }) {
  return (
    <div aria-hidden className="relative h-1.5 rounded-full bg-stone-100">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
      {marker !== undefined && <span className="absolute -top-1 h-3.5 w-0.5 rounded bg-stone-900" style={{ left: `calc(${Math.max(0, Math.min(100, marker))}% - 1px)` }} />}
    </div>
  );
}

export const ErrorBox = ({ children }: { children: ReactNode }) => (
  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
    {children}
  </p>
);
