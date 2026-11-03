"use client";

import { memo, useState } from "react";
import { rupees, rupeesShort } from "@/lib/projects/hub";
import type { LabourSummary } from "@/lib/projects/labour";

/** Trade colours in order of size; General expenditure is always grey so it reads apart from the trades */
const COLORS = ["#7c3aed", "#4f46e5", "#0284c7", "#059669", "#d97706", "#e11d48", "#0d9488", "#c026d3"];
const GENERAL = "#a8a29e";
const NOT_SET = "#78716c";

interface Slice {
  key: string;
  label: string;
  note?: string;
  value: number;
  color: string;
}

const R = 70;
const STROKE = 18;
const C = 2 * Math.PI * R;
const GAP = 6; // space between slices, along the ring

/**
 * Labour cost as a donut: one slice per trade (from attendance) plus General expenditure, with the total in the
 * middle and the amounts beside it. Pointing at a row picks out its slice. Paid and still-to-pay sit underneath.
 */
export const CostDonut = memo(function CostDonut({ summary }: { summary: LabourSummary }) {
  const [active, setActive] = useState<string | null>(null);

  const slices: Slice[] = summary.trades.map((t, i) => ({
    key: `t:${t.trade}`,
    label: t.trade || "Trade not set",
    note: t.contractors > 0 ? `${t.contractors} ${t.contractors === 1 ? "contractor" : "contractors"}` : undefined,
    value: t.cost,
    color: t.trade ? (COLORS[i % COLORS.length] ?? GENERAL) : NOT_SET,
  }));
  if (summary.generalExpenses > 0) slices.push({ key: "general", label: "General expenses", value: summary.generalExpenses, color: GENERAL });

  const total = slices.reduce((s, x) => s + x.value, 0);
  const shown = slices.filter((s) => s.value > 0);
  const gap = shown.length > 1 ? GAP : 0;

  // Each slice: its share of the ring, less the gap; round ends add half the stroke on each side, so take that off too
  let at = 0;
  const arcs = shown.map((s) => {
    const len = (s.value / total) * C;
    const start = at;
    at += len;
    const cap = shown.length > 1 ? STROKE : 0;
    const dash = Math.max(len - gap - cap, 0.01);
    return { ...s, dash, offset: -(start + gap / 2 + cap / 2) };
  });

  const centre = active ? shown.find((s) => s.key === active) : undefined;

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="relative mx-auto aspect-square w-48 sm:w-52">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="90" cy="90" r={R} fill="none" stroke="#f5f5f4" strokeWidth={STROKE} />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx="90"
              cy="90"
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={active === a.key ? STROKE + 4 : STROKE}
              strokeLinecap={shown.length > 1 ? "round" : "butt"}
              strokeDasharray={`${a.dash} ${C}`}
              strokeDashoffset={a.offset}
              opacity={active && active !== a.key ? 0.3 : 1}
              className="transition-[opacity,stroke-width] duration-150"
            />
          ))}
          <circle cx="90" cy="90" r={R - STROKE / 2 - 9} fill="none" stroke="#e7e5e4" strokeDasharray="2 4" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-stone-900">{rupeesShort(centre ? centre.value : total)}</span>
          <span className="mt-0.5 max-w-28 truncate text-xs text-stone-500">{centre ? centre.label : "Total cost"}</span>
        </div>
      </div>

      <div className="min-w-0">
        {shown.length === 0 ? (
          <p className="text-sm text-stone-500">No labour cost yet. Attendance entries and General expenses show here as they&apos;re added.</p>
        ) : (
          <ul className="space-y-0.5" aria-label="Cost by trade">
            {shown.map((s) => (
              <li
                key={s.key}
                tabIndex={0}
                onPointerEnter={() => setActive(s.key)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(s.key)}
                onBlur={() => setActive(null)}
                className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                  s.key === "general" ? "mt-1 border-t border-stone-100 pt-3" : ""
                } ${active === s.key ? "bg-stone-50" : ""}`}
              >
                <span className="h-3 w-3 shrink-0 rounded" style={{ background: s.color }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-stone-700">
                  {s.label}
                  {s.note && <span className="ml-2 text-xs text-stone-400">{s.note}</span>}
                </span>
                <span className="hidden w-10 text-right text-xs tabular-nums text-stone-400 sm:block">{Math.round((s.value / total) * 100)}%</span>
                <span className="shrink-0 font-semibold tabular-nums text-stone-900">{rupees(s.value)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-stone-200 px-2 pt-3 text-sm text-stone-600">
          <span>
            Paid to contractors <span className="ml-1 font-semibold tabular-nums text-stone-900">{rupees(summary.paid)}</span>
          </span>
          {summary.toPay > 0 ? (
            <span>
              Still to pay <span className="ml-1 font-semibold tabular-nums text-amber-700">{rupees(summary.toPay)}</span>
            </span>
          ) : summary.toPay < 0 ? (
            <span>
              Paid in advance <span className="ml-1 font-semibold tabular-nums text-sky-700">{rupees(-summary.toPay)}</span>
            </span>
          ) : summary.labour > 0 ? (
            <span className="font-medium text-green-700">All paid up</span>
          ) : null}
        </div>
      </div>
    </div>
  );
});