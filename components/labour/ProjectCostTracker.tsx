"use client";

import React, { memo } from "react";
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import { barSegments, summarizeProjectCost, type CostStatus, type CostTask } from "@/lib/projectCost";
import { Pill, type Tone } from "@/components/materials/Pill";
import { useCan } from "@/hooks/useProjectAccess";
import { useMaterialCost } from "@/hooks/useInventory";

const rupees = (value: number) => `₹${Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const STATUS: Record<CostStatus, { label: string; tone: Tone; icon: typeof FiCheckCircle }> = {
  within: { label: "Within budget", tone: "good", icon: FiCheckCircle },
  nearly: { label: "Nearly used up", tone: "warn", icon: FiAlertTriangle },
  over_allocated: { label: "Work items exceed budget", tone: "warn", icon: FiAlertTriangle },
  over: { label: "Over budget", tone: "bad", icon: FiAlertCircle },
};

interface Props {
  /** The whole project's cost, or null if nobody has set it yet */
  projectCost: number | null;
  tasks: CostTask[];
  /** Shown when there is no project cost yet and this person may add one */
  onSetCost?: () => void;
  /** Given: the project's materials (received so far, likely final cost) count too */
  projectId?: string;
}

function Figure({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: string }) {
  return (
    <div className="px-5 py-4">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${tone ?? "text-stone-900"}`}>{value}</dd>
      {note && <p className="mt-1 text-xs text-stone-500">{note}</p>}
    </div>
  );
}

/** The whole-project cost, how much has been paid out of it, and what is left */
export const ProjectCostTracker = memo(function ProjectCostTracker({ projectCost, tasks, onSetCost, projectId }: Props) {
  const canSeeMaterials = useCan("materials.view");
  const cost = useMaterialCost(projectId ?? "", !!projectId && canSeeMaterials);
  const materials = cost.data ? { spent: cost.data.totals.spent, expected: cost.data.totals.expected } : undefined;
  const summary = summarizeProjectCost(projectCost, tasks, materials);
  const hasMaterials = summary.materialSpent > 0 || (materials?.expected ?? 0) > 0;
  const bar = barSegments(summary);

  if (summary.total === null) {
    return (
      <div className="flex flex-col gap-3 rounded border border-dashed border-stone-300 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">No project cost set</p>
          <p className="mt-1 text-sm text-stone-500">
            Add what the whole project should cost to track how much of it is left. {rupees(summary.spent)} has been spent so far
            {hasMaterials ? ` (${rupees(summary.labourSpent)} labour, ${rupees(summary.materialSpent)} materials)` : " on work items"}.
          </p>
        </div>
        {onSetCost && (
          <button
            type="button"
            onClick={onSetCost}
            className="shrink-0 rounded border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Set project cost
          </button>
        )}
      </div>
    );
  }

  const { label, tone, icon } = STATUS[summary.status!];
  const overspent = summary.remaining! < 0;

  return (
    <section aria-label="Project cost" className="rounded border border-stone-300">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
        <div>
          <p className="text-sm text-stone-500">Total project cost</p>
          <p className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">{rupees(summary.total)}</p>
        </div>
        <Pill tone={tone} icon={icon}>
          {label}
        </Pill>
      </div>

      {bar && (
        <div className="border-b border-stone-200 px-5 py-4">
          <div
            role="progressbar"
            aria-label="Project cost paid"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(summary.usedPercent!)}
            className="relative flex h-3 overflow-hidden rounded bg-stone-200"
          >
            <div className={overspent ? "bg-red-600" : "bg-stone-900"} style={{ width: `${bar.paidPct}%` }} />
            <div className={overspent ? "bg-red-200" : "bg-stone-400"} style={{ width: `${bar.toPayPct}%` }} />
            {bar.limitPct !== null && (
              // The red line marks the project cost: anything to its right is beyond budget
              <span aria-hidden className="absolute inset-y-0 w-0.5 bg-red-600" style={{ left: `${bar.limitPct}%` }} />
            )}
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {Math.round(summary.usedPercent!)}% of the project cost spent
            {bar.limitPct !== null && <span className="text-red-700"> &middot; the red line is the project cost</span>}
          </p>
        </div>
      )}

      <dl className="grid grid-cols-2 divide-stone-200 sm:grid-cols-4 sm:divide-x">
        <Figure label="Spent so far" value={rupees(summary.spent)} note={hasMaterials ? `Labour ${rupees(summary.labourSpent)} · materials ${rupees(summary.materialSpent)}` : "Across all work items"} />
        <Figure
          label={overspent ? "Over budget by" : "Remaining"}
          value={rupees(summary.remaining!)}
          note={overspent ? "Spent more than the project cost" : "Left to pay out"}
          tone={overspent ? "text-red-700" : "text-emerald-700"}
        />
        <Figure label={hasMaterials ? "Budgets" : "Work item budgets"} value={rupees(summary.committed)} note={hasMaterials ? "Work items + expected material cost" : "What the work items are meant to cost"} />
        <Figure
          label={summary.unallocated! < 0 ? "Over-allocated by" : "Not yet allocated"}
          value={rupees(summary.unallocated!)}
          note={summary.unallocated! < 0 ? "Work item budgets exceed the project cost" : "Not given to any work item yet"}
          tone={summary.unallocated! < 0 ? "text-red-700" : undefined}
        />
      </dl>
    </section>
  );
});
