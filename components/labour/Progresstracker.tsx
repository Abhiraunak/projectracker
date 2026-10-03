"use client";

import React, { memo, useEffect, useMemo, useState } from "react";
import { FiCheck, FiTrendingDown, FiTrendingUp } from "react-icons/fi";
import { Heading } from "@/components/utilites/Label";

export interface TrackedTask {
  id: string;
  work: string;
  progress: number; // 0-100
  paid: number;
  stipulated: number;
  startDate?: string;
  endDate?: string;
}

type Patch = { progress?: number; paid?: number };

interface ProgressTrackerProps {
  tasks: TrackedTask[];
  /** Called on every change; the page saves it and all views recalculate. */
  onUpdate: (id: string, patch: Patch) => void;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const DAY = 86_400_000;
const clamp = (v: number) => Math.min(100, Math.max(0, Number.isFinite(v) ? v : 0));
const rupees = (v: number) => `₹${Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function parseDate(value?: string): Date | null {
  const m = value && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Where progress should be today, from the planned dates. Null if there are no valid dates. */
function expectedProgress(task: TrackedTask, today: Date | null): number | null {
  const start = parseDate(task.startDate);
  const end = parseDate(task.endDate);
  if (!today || !start || !end || end < start) return null;
  if (today < start) return 0;
  if (today > end) return 100;
  const total = Math.round((end.getTime() - start.getTime()) / DAY) + 1;
  const elapsed = Math.round((today.getTime() - start.getTime()) / DAY) + 1;
  return Math.round(clamp((elapsed / total) * 100));
}

const Pill = ({ good, children }: { good: boolean; children: React.ReactNode }) => (
  <span
    className={`flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${
      good ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    }`}
  >
    {good ? <FiTrendingUp aria-hidden /> : <FiTrendingDown aria-hidden />} {children}
  </span>
);

const inputBase =
  "w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm tabular-nums text-stone-900 " +
  "focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20";

/* -------------------------------------------------------------------------- */
/*  One task row (memoised: moving one slider doesn't re-render the others)   */
/* -------------------------------------------------------------------------- */

const Row = memo(function Row({
  task,
  today,
  onUpdate,
}: {
  task: TrackedTask;
  today: Date | null;
  onUpdate: ProgressTrackerProps["onUpdate"];
}) {
  const progress = Math.round(clamp(task.progress));
  const expected = expectedProgress(task, today);
  const diff = expected === null ? 0 : progress - expected;
  const overpaid = task.paid > task.stipulated;

  return (
    <li className="rounded border border-stone-300 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-base font-semibold">{task.work}</p>
          <p className="text-sm text-stone-500">Budget {rupees(task.stipulated)}</p>
        </div>
        {progress >= 100 ? (
          <Pill good>Complete</Pill>
        ) : expected === null ? null : diff < -10 ? (
          <Pill good={false}>{Math.abs(diff)}% behind</Pill>
        ) : diff > 10 ? (
          <Pill good>{diff}% ahead</Pill>
        ) : (
          <Pill good>On pace</Pill>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm text-stone-500">
            <label htmlFor={`p-${task.id}`}>Progress</label>
            {expected !== null && progress < 100 && <span className="text-xs">Should be about {expected}% by today</span>}
          </div>
          <div className="flex items-center gap-3">
            <input
              id={`p-${task.id}`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={progress}
              onChange={(e) => onUpdate(task.id, { progress: Number(e.target.value) })}
              aria-valuetext={`${progress} percent`}
              className="h-2 w-full cursor-pointer accent-stone-900"
            />
            <div className="relative w-20 shrink-0">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                aria-label={`${task.work} progress percent`}
                value={progress}
                onChange={(e) => onUpdate(task.id, { progress: clamp(Number(e.target.value)) })}
                className={`${inputBase} pr-7`}
              />
              <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-stone-400">
                %
              </span>
            </div>
            <button
              type="button"
              disabled={progress >= 100}
              onClick={() => onUpdate(task.id, { progress: 100 })}
              className="flex shrink-0 items-center gap-1 rounded border border-stone-300 px-2.5 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FiCheck aria-hidden /> Done
            </button>
          </div>
        </div>

        <div>
          <label htmlFor={`a-${task.id}`} className="mb-1.5 block text-sm text-stone-500">
            Amount paid
          </label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-stone-400">
              ₹
            </span>
            <input
              id={`a-${task.id}`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={task.paid}
              onChange={(e) => onUpdate(task.id, { paid: Math.max(0, Number(e.target.value) || 0) })}
              className={`${inputBase} pl-7`}
            />
          </div>
          {overpaid && <p className="mt-1 text-xs font-medium text-red-700">Over budget by {rupees(task.paid - task.stipulated)}</p>}
        </div>
      </div>
    </li>
  );
});

/* -------------------------------------------------------------------------- */
/*  Tracker                                                                   */
/* -------------------------------------------------------------------------- */

export const ProgressTracker = memo(function ProgressTracker({ tasks, onUpdate }: ProgressTrackerProps) {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    const d = new Date();
    setToday(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  }, []);

  // Budget-weighted, so a big task moves the overall number more than a small one
  const overall = useMemo(() => {
    const budget = tasks.reduce((s, t) => s + t.stipulated, 0);
    if (budget > 0) return Math.round(tasks.reduce((s, t) => s + t.stipulated * clamp(t.progress), 0) / budget);
    return tasks.length ? Math.round(tasks.reduce((s, t) => s + clamp(t.progress), 0) / tasks.length) : 0;
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="rounded border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
        No work items yet. Add them in the project form, then track progress here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Heading>Track progress</Heading>
        <p className="mt-1 text-sm text-stone-500">Changes save automatically and update every chart and total.</p>
      </div>

      <div className="rounded border border-stone-300 bg-white p-4">
        <div className="mb-3 flex items-end justify-between">
          <h3 className="text-sm text-stone-500">Overall progress</h3>
          <p className="text-3xl font-semibold tabular-nums">{overall}%</p>
        </div>
        <div
          role="progressbar"
          aria-label="Overall project progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={overall}
          className="h-2 overflow-hidden rounded bg-stone-200"
        >
          <div className="h-full bg-stone-900 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${overall}%` }} />
        </div>
      </div>

      <ul className="space-y-4">
        {tasks.map((t) => (
          <Row key={t.id} task={t} today={today} onUpdate={onUpdate} />
        ))}
      </ul>
    </div>
  );
});