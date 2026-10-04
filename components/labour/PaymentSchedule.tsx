"use client";

import React, { memo, useMemo } from "react";
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import { formatINR } from "./data";
import { Heading } from "../utilites/Label";

/** Only the fields this table needs, so it works with your ProjectTask type or the page's processed tasks */
export interface PaymentTask {
  id: string | number;
  work: string;
  stipulated: number;
  paid: number;
  progress: number; // 0-100
}

/* -------------------------------------------------------------------------- */
/*  Budget status                                                             */
/*                                                                            */
/*  over  (red)    already paid more than the budget                          */
/*  risk  (yellow) within budget now, but at the current pace the final cost  */
/*                 is projected to exceed it                                  */
/*  ok    (green)  within budget and on pace to stay there                    */
/*                                                                            */
/*  Projected cost = paid so far / share of work done. For example, ₹650,000  */
/*  paid for 90% progress projects to about ₹722,000 at 100%.                 */
/* -------------------------------------------------------------------------- */

export type BudgetStatus = "over" | "risk" | "ok";

export interface BudgetResult {
  status: BudgetStatus;
  /** Forecast final cost, or null when it can't be estimated (no progress recorded yet) */
  projected: number | null;
  reason: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 0));

export function budgetStatus(t: Pick<PaymentTask, "stipulated" | "paid" | "progress">): BudgetResult {
  const stipulated = Math.max(0, t.stipulated);
  const paid = Math.max(0, t.paid);
  const progress = clamp(t.progress, 0, 100);
  const projected = progress > 0 ? paid / (progress / 100) : null;

  if (paid > stipulated) {
    return {
      status: "over",
      projected: projected ?? paid,
      reason: `Already paid ${formatINR(paid - stipulated)} more than the stipulated budget.`,
    };
  }
  if (progress >= 100) {
    return { status: "ok", projected: paid, reason: "Work is complete and within budget." };
  }
  if (progress === 0) {
    return paid > 0
      ? { status: "risk", projected: null, reason: "Money has been paid but no progress is recorded yet." }
      : { status: "ok", projected: null, reason: "Nothing paid yet." };
  }
  if (projected! > stipulated + 1) {
    return {
      status: "risk",
      projected,
      reason: `Within budget now, but at ${Math.round(progress)}% progress the final cost is projected at ${formatINR(
        Math.round(projected!)
      )}, which is ${formatINR(Math.round(projected! - stipulated))} over budget.`,
    };
  }
  return { status: "ok", projected, reason: "Within budget and on pace to stay within it." };
}

/* -------------------------------------------------------------------------- */
/*  Presentation                                                              */
/* -------------------------------------------------------------------------- */

const STATUS = {
  over: { label: "Over budget", pill: "bg-red-100 text-red-700", text: "text-red-700", Icon: FiAlertCircle },
  risk: { label: "At risk", pill: "bg-yellow-100 text-yellow-800", text: "text-yellow-800", Icon: FiAlertTriangle },
  ok: { label: "On budget", pill: "bg-green-100 text-green-700", text: "text-green-700", Icon: FiCheckCircle },
} as const;

/**
 * `reasonVisible`: the mobile cards print the reason on screen (touch devices
 * have no hover tooltip), so the pill must not repeat it for screen readers.
 */
const StatusPill = ({ result, reasonVisible = false }: { result: BudgetResult; reasonVisible?: boolean }) => {
  const { label, pill, Icon } = STATUS[result.status];
  return (
    <span
      title={result.reason}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${pill}`}
    >
      <Icon aria-hidden /> {label}
      {!reasonVisible && <span className="sr-only">. {result.reason}</span>}
    </span>
  );
};

const ProgressBar = ({ work, progress, className }: { work: string; progress: number; className: string }) => (
  <div
    role="progressbar"
    aria-label={`${work} progress`}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(progress)}
    className={`h-1.5 overflow-hidden rounded bg-stone-200 ${className}`}
  >
    <div className="h-full bg-stone-900" style={{ width: `${progress}%` }} />
  </div>
);

interface PaymentScheduleProps {
  tasks?: PaymentTask[];
}

export const PaymentSchedule = memo(function PaymentSchedule({ tasks = [] }: PaymentScheduleProps) {
  // Everything both layouts need is worked out once, so mobile and desktop can't disagree
  const rows = useMemo(
    () =>
      tasks.map((task) => {
        const result = budgetStatus(task);
        const variance = task.stipulated - task.paid;
        return {
          task,
          result,
          progress: clamp(task.progress, 0, 100),
          varianceText: variance < 0 ? `-${formatINR(Math.abs(variance))}` : formatINR(variance),
          varianceCls: variance < 0 ? "font-medium text-red-700" : "text-stone-500",
          projectedText: result.projected === null ? "-" : formatINR(Math.round(result.projected)),
          projectedCls:
            result.projected === null
              ? "text-stone-400"
              : result.status === "ok"
                ? "text-stone-500"
                : `${STATUS[result.status].text} font-medium`,
        };
      }),
    [tasks]
  );

  const over = rows.filter((r) => r.result.status === "over").length;
  const risk = rows.filter((r) => r.result.status === "risk").length;

  if (tasks.length === 0) {
    return (
      <div className="min-w-0">
        <Heading className="mb-3 sm:mb-4">Payment schedule</Heading>
        <div className="rounded border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 sm:p-8">
          No payment schedule data available.
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4 sm:gap-3">
        <Heading>Payment schedule</Heading>
        <div className="flex flex-wrap gap-2">
          {over > 0 && (
            <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">{over} over budget</span>
          )}
          {risk > 0 && (
            <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">{risk} at risk</span>
          )}
          {over === 0 && risk === 0 && (
            <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">All on budget</span>
          )}
        </div>
      </div>

      <div className="rounded border border-stone-300">
        {/* ───────── Mobile: one stacked entry per task (no sideways scrolling) ───────── */}
        <ul className="divide-y divide-stone-200 md:hidden">
          {rows.map(({ task, result, progress, varianceText, varianceCls, projectedText, projectedCls }) => (
            <li key={task.id} className="p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 wrap-break-word font-medium text-stone-900">{task.work}</p>
                <StatusPill result={result} reasonVisible />
              </div>

              <div className="mt-3 flex items-center gap-2">
                <ProgressBar work={task.work} progress={progress} className="flex-1" />
                <span className="text-sm tabular-nums">{Math.round(progress)}%</span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div className="min-w-0">
                  <dt className="text-xs text-stone-500">Stipulated</dt>
                  <dd className="wrap-break-word tabular-nums">{formatINR(task.stipulated)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-stone-500">Paid</dt>
                  <dd className="wrap-break-word tabular-nums">{formatINR(task.paid)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-stone-500">Variance</dt>
                  <dd className={`wrap-break-word tabular-nums ${varianceCls}`}>{varianceText}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-stone-500">Projected cost</dt>
                  <dd className={`wrap-break-word tabular-nums ${projectedCls}`}>{projectedText}</dd>
                </div>
              </dl>

              {/* No hover on touch screens, so show why a task is flagged */}
              {result.status !== "ok" && (
                <p className={`mt-3 text-xs ${STATUS[result.status].text}`}>{result.reason}</p>
              )}
            </li>
          ))}
        </ul>

        {/* ───────── md+: the full table ───────── */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-stone-500">
              <tr>
                <th scope="col" className="w-1/4 px-3 py-3 font-medium lg:px-4">Work</th>
                <th scope="col" className="px-3 py-3 font-medium lg:px-4">Stipulated</th>
                <th scope="col" className="px-3 py-3 font-medium lg:px-4">Paid</th>
                <th scope="col" className="px-3 py-3 font-medium lg:px-4">Progress</th>
                <th scope="col" className="px-3 py-3 font-medium lg:px-4">Variance</th>
                <th scope="col" className="px-3 py-3 font-medium lg:px-4">Projected cost</th>
                <th scope="col" className="px-3 py-3 text-right font-medium lg:px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {rows.map(({ task, result, progress, varianceText, varianceCls, projectedText, projectedCls }) => (
                <tr key={task.id} className="hover:bg-stone-50">
                  <td className="px-3 py-3 font-medium text-stone-900 lg:px-4">{task.work}</td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums lg:px-4">{formatINR(task.stipulated)}</td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums lg:px-4">{formatINR(task.paid)}</td>
                  <td className="px-3 py-3 lg:px-4">
                    <div className="flex items-center gap-2">
                      <ProgressBar work={task.work} progress={progress} className="w-16" />
                      <span className="tabular-nums">{Math.round(progress)}%</span>
                    </div>
                  </td>
                  <td className={`whitespace-nowrap px-3 py-3 tabular-nums lg:px-4 ${varianceCls}`}>{varianceText}</td>
                  <td className={`whitespace-nowrap px-3 py-3 tabular-nums lg:px-4 ${projectedCls}`}>{projectedText}</td>
                  <td className="px-3 py-3 text-right lg:px-4">
                    <StatusPill result={result} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="border-t border-stone-200 px-3 py-3 text-xs text-stone-500 sm:px-4">
          <span className="font-medium text-yellow-800">At risk</span> means a task is within budget today, but at its
          current pace (paid so far divided by progress) the final cost is projected to go over. Variance is stipulated
          minus paid.
        </p>
      </div>
    </div>
  );
});