/**
 * The whole-project cost tracker: the money side of one project, in plain numbers.
 *
 *  total       what the whole project is meant to cost (set by the owner or a manager; null if not set yet)
 *  spent       paid so far, added up over the work items
 *  committed   what the work items will cost if each ends at its budget (or what is already paid, if that is more)
 *  remaining   total - spent: how much of the project cost is left to pay out
 *  unallocated total - committed: how much of the project cost no work item has claimed yet
 *              (below zero means the work item budgets add up to more than the project cost)
 */

export interface CostTask {
  stipulated: number;
  paid: number;
}

export type CostStatus = "within" | "nearly" | "over_allocated" | "over";

/** A project's materials, from its BOQ and orders: value received so far, and the most likely final cost */
export interface CostMaterials {
  spent: number;
  expected: number;
}

export interface CostSummary {
  total: number | null;
  spent: number; // labour paid + materials received
  labourSpent: number;
  materialSpent: number;
  committed: number;
  remaining: number | null;
  unallocated: number | null;
  usedPercent: number | null;
  status: CostStatus | null;
}

/** 90% of the project cost paid out is the point to start warning */
export const NEARLY_THRESHOLD = 90;

const round2 = (value: number) => Math.round(value * 100) / 100;
const sum = (values: number[]) => round2(values.reduce((a, b) => a + b, 0));

export function summarizeProjectCost(total: number | null, tasks: CostTask[], materials: CostMaterials = { spent: 0, expected: 0 }): CostSummary {
  const labourSpent = sum(tasks.map((t) => t.paid));
  const materialSpent = round2(materials.spent);
  const spent = round2(labourSpent + materialSpent);
  const committed = round2(sum(tasks.map((t) => Math.max(t.paid, t.stipulated))) + Math.max(materials.expected, materials.spent));
  const parts = { labourSpent, materialSpent };

  if (total === null) {
    return { total: null, spent, ...parts, committed, remaining: null, unallocated: null, usedPercent: null, status: null };
  }

  const usedPercent = total > 0 ? (spent / total) * 100 : spent > 0 ? 100 : 0;
  const status: CostStatus =
    spent > total ? "over" : committed > total ? "over_allocated" : usedPercent >= NEARLY_THRESHOLD ? "nearly" : "within";

  return {
    total,
    spent,
    ...parts,
    committed,
    remaining: round2(total - spent),
    unallocated: round2(total - committed),
    usedPercent: round2(usedPercent),
    status,
  };
}

export interface BarSegments {
  paidPct: number; // dark: already paid
  toPayPct: number; // light: work item budgets still to be paid
  limitPct: number | null; // where the project cost limit sits; only given when something goes past it
}

/** The widths for the tracker bar, as percentages of the bar. The bar widens past the limit when costs exceed it. */
export function barSegments(summary: CostSummary): BarSegments | null {
  if (summary.total === null) return null;

  const scale = Math.max(summary.total, summary.committed, summary.spent);
  if (scale <= 0) return { paidPct: 0, toPayPct: 0, limitPct: null };

  const pct = (value: number) => Math.min(100, Math.max(0, (value / scale) * 100));
  return {
    paidPct: pct(summary.spent),
    toPayPct: pct(summary.committed - summary.spent),
    limitPct: summary.total < scale ? pct(summary.total) : null,
  };
}
