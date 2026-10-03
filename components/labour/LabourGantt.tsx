"use client";

import React, { memo, useEffect, useMemo, useState } from "react";
import { FiCalendar, FiClock, FiTrendingDown, FiTrendingUp } from "react-icons/fi";
import { formatINR } from "./data";
import { Heading } from "../utilites/Label";

/** Dates are "YYYY-MM-DD" strings, exactly what <input type="date"> produces. */
export interface GanttTask {
  id: string | number;
  work: string;
  progress: number; // 0-100
  stipulated: number;
  paid: number;
  startDate?: string;
  endDate?: string;
}

/* -------------------------------------------------------------------------- */
/*  Date helpers (local time, DST-safe)                                       */
/* -------------------------------------------------------------------------- */

const DAY = 86_400_000;

function parseDate(value?: string): Date | null {
  const m = value && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

const dayDiff = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const short = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 0));

type Range = { start: Date; end: Date; days: number };

/** Weekly ticks for short projects, monthly up to ~13 months, quarterly beyond. */
function buildTicks({ start, end, days }: Range) {
  const pos = (d: Date) => (dayDiff(start, d) / days) * 100;
  const ticks: { pos: number; label: string }[] = [];

  if (days <= 70) {
    for (let d = start; d <= end; d = addDays(d, 7)) ticks.push({ pos: pos(d), label: short(d) });
    return ticks;
  }

  const step = days <= 400 ? 1 : 3;
  let d = new Date(start.getFullYear(), start.getMonth() + (start.getDate() === 1 ? 0 : 1), 1);
  for (; d <= end; d = new Date(d.getFullYear(), d.getMonth() + step, 1)) {
    const withYear = ticks.length === 0 || d.getMonth() === 0;
    ticks.push({
      pos: pos(d),
      label: d.toLocaleDateString("en-IN", { month: "short", ...(withYear ? { year: "numeric" } : {}) }),
    });
  }
  return ticks;
}

/* -------------------------------------------------------------------------- */
/*  Schedule status: compares progress with how much of the time has passed   */
/* -------------------------------------------------------------------------- */

type Tone = "good" | "bad" | "neutral";
type Row = GanttTask & { start: Date; end: Date };

function scheduleStatus(t: Row, today: Date | null): { label: string; tone: Tone; expected: number | null } {
  const progress = clamp(t.progress);
  if (progress >= 100) return { label: "Complete", tone: "good", expected: null };
  if (!today) return { label: "Scheduled", tone: "neutral", expected: null };
  if (today > t.end) return { label: `Overdue by ${dayDiff(t.end, today)}d`, tone: "bad", expected: null };
  if (today < t.start) return { label: `Starts in ${dayDiff(today, t.start)}d`, tone: "neutral", expected: null };

  const total = dayDiff(t.start, t.end) + 1;
  const expected = Math.round(clamp(((dayDiff(t.start, today) + 1) / total) * 100));
  const gap = expected - Math.round(progress);
  return gap > 10
    ? { label: `${gap}% behind`, tone: "bad", expected }
    : { label: "On track", tone: "good", expected };
}

/* -------------------------------------------------------------------------- */
/*  Presentational pieces (same pill language as StatCards)                   */
/* -------------------------------------------------------------------------- */

const TONE = {
  good: { pill: "bg-green-100 text-green-700", fill: "bg-green-600", Icon: FiTrendingUp },
  bad: { pill: "bg-red-100 text-red-700", fill: "bg-red-500", Icon: FiTrendingDown },
  neutral: { pill: "bg-stone-100 text-stone-600", fill: "bg-stone-500", Icon: FiClock },
} as const;

const Pill = ({ tone, children }: { tone: Tone; children: React.ReactNode }) => {
  const { pill, Icon } = TONE[tone];
  return (
    <span className={`flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${pill}`}>
      <Icon aria-hidden /> {children}
    </span>
  );
};

const COLS = "grid grid-cols-[11rem_minmax(0,1fr)_10rem]";

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">{children}</div>
);

/* -------------------------------------------------------------------------- */
/*  Gantt                                                                     */
/* -------------------------------------------------------------------------- */

export const LabourGantt = memo(function LabourGantt({ tasks = [] }: { tasks?: GanttTask[] }) {
  // "Today" is read on the client after mount, so server and client HTML always match
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    const d = new Date();
    setToday(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  }, []);

  const { scheduled, unscheduled, range } = useMemo(() => {
    const scheduled: Row[] = [];
    const unscheduled: GanttTask[] = [];
    for (const t of tasks) {
      const start = parseDate(t.startDate);
      const end = parseDate(t.endDate);
      if (start && end && end >= start) scheduled.push({ ...t, start, end });
      else unscheduled.push(t);
    }
    scheduled.sort((a, b) => a.start.getTime() - b.start.getTime());
    if (!scheduled.length) return { scheduled, unscheduled, range: null };

    const first = scheduled[0]!.start;
    const last = scheduled.reduce((m, t) => (t.end > m ? t.end : m), scheduled[0]!.end);
    return { scheduled, unscheduled, range: { start: first, end: last, days: dayDiff(first, last) + 1 } as Range };
  }, [tasks]);

  const ticks = useMemo(() => (range ? buildTicks(range) : []), [range]);
  const rows = useMemo(() => scheduled.map((t) => ({ t, s: scheduleStatus(t, today) })), [scheduled, today]);
  const behind = rows.filter((r) => r.s.tone === "bad").length;
  const onTrack = rows.filter((r) => r.s.tone === "good").length;

  const todayPos =
    range && today && today >= range.start && today <= range.end
      ? (dayDiff(range.start, today) / range.days) * 100
      : null;

  const heading = <Heading className="mb-4">Planned vs ongoing schedule</Heading>;

  if (tasks.length === 0) {
    return (
      <>
        {heading}
        <Empty>No work items yet. Add them in the project form to see the schedule.</Empty>
      </>
    );
  }

  return (
    <>
      {heading}
      <div className="rounded border border-stone-300 bg-white">
        {/* Legend + summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 p-4">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500">
            <li className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm border border-stone-300 bg-stone-200" />Planned</li>
            <li className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm bg-green-600" />Done, on track</li>
            <li className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm bg-red-500" />Done, behind</li>
            <li className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-stone-900/50" />Where progress should be</li>
            <li className="flex items-center gap-1.5"><span className="h-3 w-px bg-red-400" />Today</li>
          </ul>
          {rows.length > 0 && today && (
            <div className="flex gap-2">
              {behind > 0 && <Pill tone="bad">{behind} behind</Pill>}
              {onTrack > 0 && <Pill tone="good">{onTrack} on track or done</Pill>}
            </div>
          )}
        </div>

        {range ? (
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Time axis */}
              <div className={`${COLS} border-b border-stone-200 text-sm text-stone-500`}>
                <div className="px-4 py-2">Work item</div>
                <div className="relative h-9 px-3">
                  <div className="absolute inset-y-0 left-3 right-3">
                    {ticks.map((tk) => (
                      <span
                        key={tk.pos}
                        className="absolute top-2 whitespace-nowrap text-xs"
                        style={{ left: `${tk.pos}%`, transform: tk.pos > 92 ? "translateX(-100%)" : undefined }}
                      >
                        {tk.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-2 text-right">Status</div>
              </div>

              {/* Rows */}
              <ol>
                {rows.map(({ t, s }) => {
                  const progress = clamp(t.progress);
                  const left = (dayDiff(range.start, t.start) / range.days) * 100;
                  const width = Math.max(((dayDiff(t.start, t.end) + 1) / range.days) * 100, 1.5);
                  const overpaid = t.paid > t.stipulated;
                  const label = `${t.work}: ${short(t.start)} to ${short(t.end)}, ${Math.round(progress)}% complete, ${s.label}`;

                  return (
                    <li key={t.id} className={`${COLS} border-b border-stone-200 last:border-b-0`}>
                      <div className="min-w-0 px-4 py-3">
                        <p className="break-words text-sm font-semibold text-stone-900">{t.work}</p>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {short(t.start)} to {short(t.end)}
                        </p>
                        <p className="text-xs text-stone-500">{Math.round(progress)}% complete</p>
                      </div>

                      <div className="relative px-3">
                        <div className="absolute inset-y-0 left-3 right-3">
                          {ticks.map((tk) => (
                            <span key={tk.pos} className="absolute inset-y-0 w-px bg-stone-100" style={{ left: `${tk.pos}%` }} />
                          ))}
                          {todayPos !== null && (
                            <span className="absolute inset-y-0 z-10 w-px bg-red-400" style={{ left: `${todayPos}%` }} />
                          )}
                          <div
                            role="img"
                            aria-label={label}
                            title={label}
                            className="absolute top-1/2 h-7 -translate-y-1/2 overflow-hidden rounded border border-stone-300 bg-stone-200"
                            style={{ left: `${Math.min(left, 100 - width)}%`, width: `${width}%` }}
                          >
                            <div className={`h-full ${TONE[s.tone].fill}`} style={{ width: `${progress}%` }} />
                            {s.expected !== null && (
                              <span className="absolute inset-y-0 w-0.5 bg-stone-900/50" style={{ left: `${s.expected}%` }} />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 px-4 py-3">
                        <Pill tone={s.tone}>{s.label}</Pill>
                        <span className="text-right text-xs text-stone-500">
                          Paid {formatINR(t.paid)} of {formatINR(t.stipulated)}
                        </span>
                        {overpaid && <span className="text-xs font-medium text-red-700">Paid over budget</span>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <Empty>None of the work items have valid start and end dates yet.</Empty>
          </div>
        )}

        {unscheduled.length > 0 && (
          <p className="flex items-start gap-2 border-t border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
            <FiCalendar aria-hidden className="mt-0.5 shrink-0" />
            <span>
              {unscheduled.length === 1 ? "1 work item has" : `${unscheduled.length} work items have`} no valid dates and{" "}
              {unscheduled.length === 1 ? "is" : "are"} not shown: {unscheduled.map((t) => t.work || "Untitled").join(", ")}.
              Edit the project data to add a start and end date.
            </span>
          </p>
        )}
      </div>
    </>
  );
});