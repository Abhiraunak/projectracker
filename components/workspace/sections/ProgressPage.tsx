"use client";

import { lazy, memo, Suspense, useMemo, useState } from "react";
import { FiEdit3, FiX } from "react-icons/fi";
import { useAccess } from "@/hooks/useProjectAccess";
import { useProjectProgress } from "@/hooks/useProjectPages";
import { plural, rupeesShort, shortDate } from "@/lib/projects/hub";
import type { Pace, ProjectProgress } from "@/lib/projects/pages";
import { EmptyState, ProgressRing, SectionError, SectionSkeleton } from "../ui";

// The editing screen (sliders per work item) only downloads when someone opens it
const ProgressEditor = lazy(() => import("./ProgressEditor"));

const PACE: Record<Pace, { label: string; text: string; bar: string }> = {
  done: { label: "Done", text: "text-emerald-700", bar: "bg-emerald-600" },
  ahead: { label: "Ahead", text: "text-emerald-700", bar: "bg-emerald-600" },
  on_track: { label: "On track", text: "text-stone-600", bar: "bg-stone-800" },
  behind: { label: "Behind", text: "text-amber-700", bar: "bg-amber-500" },
  late: { label: "Past end date", text: "text-red-700", bar: "bg-red-600" },
  not_started: { label: "Not started", text: "text-stone-400", bar: "bg-stone-400" },
};

/**
 * Phase 2: the project's progress on one page. Three answers at the top (how much work is done, how much time
 * has gone, how much money has gone), then every work item on a time-line. One request; editing is one tap away.
 */
export default function ProgressPage({ projectId, compact = false }: { projectId: string; compact?: boolean }) {
  const progress = useProjectProgress(projectId);
  const access = useAccess();
  const [editing, setEditing] = useState(false);
  const canEdit = access.can("tasks.progress") || access.can("project.manage");

  if (progress.isPending) return <SectionSkeleton />;
  if (progress.isError) return <SectionError error={progress.error} onRetry={() => void progress.refetch()} />;
  const p = progress.data;

  return (
    <div className="space-y-6">
      {compact ? (
        // On the Overview: just work done against time used (the money is already above)
        <WorkVsTime time={p.time} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <WorkCard time={p.time} />
          <TimeCard time={p.time} />
          <MoneyCard cost={p.cost} />
        </div>
      )}

      <section aria-labelledby="timeline-title" className="rounded-xl border border-stone-200">
        <header className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:px-5">
          <h2 id="timeline-title" className="font-semibold">
            Work items <span className="font-normal text-stone-500">· {p.rows.length}</span>
          </h2>
          {canEdit && p.rows.length > 0 && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              aria-expanded={editing}
              className="flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 px-3 text-sm font-medium hover:bg-stone-50"
            >
              {editing ? <FiX aria-hidden /> : <FiEdit3 aria-hidden />}
              {editing ? "Done" : "Update progress"}
            </button>
          )}
        </header>

        {editing ? (
          <div className="p-4 sm:p-5">
            <Suspense fallback={<SectionSkeleton />}>
              <ProgressEditor projectId={projectId} />
            </Suspense>
          </div>
        ) : p.rows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No work items yet" hint="Add work items with their dates on the Project page to see them here." action={{ href: "/dashboard/labour", label: "Go to Project page" }} />
          </div>
        ) : (
          <Timeline progress={p} />
        )}
      </section>
    </div>
  );
}

/* ------------------------------- the three answers ------------------------------- */

/** Two bars, one under the other: how much work is done, and how much of the time has gone. Work behind time = behind. */
const WorkVsTime = memo(function WorkVsTime({ time: t }: { time: ProjectProgress["time"] }) {
  const pace = PACE[t.pace];
  const line = (label: string, pct: number, bar: string) => (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
      <span className="text-stone-600">{label}</span>
      <span aria-hidden className="h-2.5 overflow-hidden rounded-full bg-stone-100">
        <span className={`block h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </span>
      <span className="text-right font-semibold tabular-nums text-stone-900">{pct}%</span>
    </div>
  );
  return (
    <section aria-label="Work done and time used" className="space-y-2.5 rounded-xl border border-stone-200 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-900">Progress</h2>
        <span className={`text-sm font-medium ${pace.text}`}>
          {pace.label}
          {(t.pace === "behind" || t.pace === "ahead") && ` · ${Math.abs(t.gap)} points`}
        </span>
      </div>
      {line("Work done", t.workPct, pace.bar)}
      {t.start && t.end ? line("Time used", t.timePct, t.daysLeft !== null && t.daysLeft < 0 ? "bg-red-600" : "bg-stone-500") : <p className="text-sm text-stone-500">No dates yet</p>}
      {t.start && t.end && (
        <p className="text-xs text-stone-500">
          Day {t.daysUsed} of {t.totalDays} · {t.daysLeft !== null && t.daysLeft < 0 ? `${plural(-t.daysLeft, "day")} past the end` : `${plural(t.daysLeft ?? 0, "day")} left`} · ends {shortDate(t.end)}
        </p>
      )}
    </section>
  );
});

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-stone-200 p-4 sm:p-5">
    <h2 className="text-xs font-medium uppercase tracking-wide text-stone-500">{title}</h2>
    <div className="mt-2">{children}</div>
  </section>
);

const WorkCard = memo(function WorkCard({ time: t }: { time: ProjectProgress["time"] }) {
  const pace = PACE[t.pace];
  return (
    <Card title="Work done">
      <div className="flex items-center gap-4">
        <ProgressRing percent={t.workPct} size={64} />
        <div className="min-w-0">
          <p className={`font-semibold ${pace.text}`}>{pace.label}</p>
          <p className="text-sm text-stone-500">
            {t.pace === "behind" || t.pace === "ahead" ? `${Math.abs(t.gap)} points ${t.gap < 0 ? "behind" : "ahead of"} the calendar` : `The calendar says ${t.timePct}%`}
          </p>
        </div>
      </div>
    </Card>
  );
});

const TimeCard = memo(function TimeCard({ time: t }: { time: ProjectProgress["time"] }) {
  if (!t.start || !t.end)
    return (
      <Card title="Time">
        <p className="text-sm text-stone-500">No dates yet</p>
      </Card>
    );
  const late = t.daysLeft !== null && t.daysLeft < 0;
  return (
    <Card title="Time">
      <p className="text-2xl font-semibold tabular-nums tracking-tight">
        Day {t.daysUsed} <span className="text-base font-normal text-stone-500">of {t.totalDays}</span>
      </p>
      <Bar parts={[{ pct: t.timePct, className: late ? "bg-red-600" : "bg-stone-800" }]} />
      <p className={`mt-2 text-sm ${late ? "text-red-700" : "text-stone-500"}`}>
        {late ? `${plural(-t.daysLeft!, "day")} past the end` : `${plural(t.daysLeft ?? 0, "day")} left`} · ends {shortDate(t.end)}
      </p>
    </Card>
  );
});

const MoneyCard = memo(function MoneyCard({ cost: c }: { cost: ProjectProgress["cost"] }) {
  const over = c.left < 0;
  const share = (v: number) => (c.budget > 0 ? Math.min(100, (v / c.budget) * 100) : 0);
  return (
    <Card title={c.budgetIsSet ? "Budget" : "Agreed work"}>
      <p className="text-2xl font-semibold tabular-nums tracking-tight">
        {rupeesShort(c.used)} <span className="text-base font-normal text-stone-500">of {rupeesShort(c.budget)}</span>
      </p>
      <Bar
        parts={[
          { pct: share(c.labourUsed), className: "bg-stone-800" },
          { pct: share(c.materialUsed), className: "bg-orange-400" },
        ]}
      />
      <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-stone-500">
        <span>
          <i aria-hidden className="mr-1 inline-block h-2 w-2 rounded-full bg-stone-800" />
          Labour {rupeesShort(c.labourUsed)}
        </span>
        <span>
          <i aria-hidden className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-400" />
          Materials {rupeesShort(c.materialUsed)}
        </span>
      </p>
      <p className={`mt-1 text-sm ${over ? "text-red-700" : "text-stone-500"}`}>
        {over ? `${rupeesShort(-c.left)} over` : `${rupeesShort(c.left)} left`}
        {c.likelyFinal > c.budget && !over && <span className="text-amber-700"> · likely to end at {rupeesShort(c.likelyFinal)}</span>}
      </p>
    </Card>
  );
});

function Bar({ parts }: { parts: { pct: number; className: string }[] }) {
  return (
    <div aria-hidden className="mt-3 flex h-2 overflow-hidden rounded-full bg-stone-100">
      {parts.map((p, i) => (
        <div key={i} className={`h-full ${p.className}`} style={{ width: `${Math.max(0, p.pct)}%` }} />
      ))}
    </div>
  );
}

/* ---------------------------------- time-line ---------------------------------- */

const DAY = 86_400_000;
const ms = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`);
const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });

/**
 * Each work item as a bar between its dates, filled as far as it's done, with today marked.
 * Plain positioned blocks (no chart library): fast to draw even with a couple of hundred rows.
 */
const Timeline = memo(function Timeline({ progress: p }: { progress: ProjectProgress }) {
  const { start, end } = p.time;
  const scale = useMemo(() => {
    const from = ms(start!);
    const span = ms(end!) + DAY - from;
    const at = (ymd: string, endOfDay = false) => ((ms(ymd) + (endOfDay ? DAY : 0) - from) / span) * 100;
    // Month labels along the top: at most six, so they never crowd
    const months: { label: string; left: number }[] = [];
    const d = new Date(from);
    d.setUTCDate(1);
    while (d.getTime() <= ms(end!)) {
      const ymd = d.toISOString().slice(0, 10);
      if (ms(ymd) >= from) months.push({ label: monthFmt.format(d), left: at(ymd) });
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
    const step = Math.ceil(months.length / 6) || 1;
    return { at, months: months.filter((_, i) => i % step === 0) };
  }, [start, end]);
  // The orange line: the middle of today (kept inside the chart before the start or after the end)
  const todayLeft = Math.min(100, Math.max(0, (scale.at(p.today) + scale.at(p.today, true)) / 2));

  return (
    <div className="px-4 pb-4 pt-2 sm:px-5">
      <div className="sm:grid sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4">
        <div aria-hidden className="hidden sm:block" />
        <div aria-hidden className="relative h-6 text-xs text-stone-400">
          {scale.months.map((m) => (
            <span key={m.label + m.left} className="absolute top-1" style={{ left: `${m.left}%` }}>
              {m.label}
            </span>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-stone-100">
        {p.rows.map((r) => (
          <TimelineRow key={r.id} row={r} left={scale.at(r.start)} right={scale.at(r.end, true)} todayLeft={todayLeft} />
        ))}
      </ul>
    </div>
  );
});

const TimelineRow = memo(function TimelineRow({
  row: r,
  left,
  right,
  todayLeft,
}: {
  row: ProjectProgress["rows"][number];
  left: number;
  right: number;
  todayLeft: number;
}) {
  const pace = PACE[r.pace];
  return (
    <li className="py-3 [content-visibility:auto] [contain-intrinsic-size:auto_64px] sm:grid sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center sm:gap-4">
      <div className="mb-2 flex items-baseline justify-between gap-2 sm:mb-0 sm:block">
        <p className="truncate text-sm font-medium text-stone-900">{r.work}</p>
        <p className="shrink-0 text-xs">
          <span className="tabular-nums text-stone-900">{r.progress}%</span> <span className={pace.text}>· {pace.label}</span>
        </p>
      </div>
      <div className="relative h-5 rounded bg-stone-50" title={`${shortDate(r.start)} – ${shortDate(r.end)}`}>
        <div className="absolute inset-y-0 overflow-hidden rounded bg-stone-200" style={{ left: `${left}%`, width: `${Math.max(1, right - left)}%` }}>
          <div className={`h-full ${pace.bar}`} style={{ width: `${r.progress}%` }} />
        </div>
        <div aria-hidden className="absolute -inset-y-1 w-px bg-orange-500" style={{ left: `${todayLeft}%` }} />
      </div>
      <span className="sr-only">
        {shortDate(r.start)} to {shortDate(r.end)}, {r.progress}% done, should be {r.expected}%
      </span>
    </li>
  );
});