import { dayDiff, parseDay } from "./format";
import type { ProcurementStatus, Requirement } from "./types";

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/** What to buy: the quantity plus the wastage allowance */
export const totalRequired = (r: Pick<Requirement, "requiredQty" | "wastagePercent">) =>
  round3(r.requiredQty * (1 + r.wastagePercent / 100));

/** Still to be ordered */
export const toOrderQty = (r: Requirement) => round3(Math.max(0, totalRequired(r) - r.orderedQty));

/** Ordered but not delivered yet: the "pending order" */
export const pendingQty = (r: Requirement) => round3(Math.max(0, r.orderedQty - r.receivedQty));

/** The status is worked out from the numbers, so it can never disagree with them */
export function procurementStatus(r: Requirement): ProcurementStatus {
  if (r.receivedQty > 0 && r.receivedQty >= totalRequired(r)) return "delivered";
  if (r.receivedQty > 0) return "partly_delivered";
  if (r.orderedQty > 0) return "ordered";
  if (r.requested) return "requested";
  return "not_ordered";
}

export const daysToDelivery = (r: Requirement, today: Date): number | null =>
  r.expectedDelivery ? dayDiff(today, parseDay(r.expectedDelivery)) : null;

/** The delivery date has passed and something is still pending */
export function isOverdue(r: Requirement, today: Date): boolean {
  const days = daysToDelivery(r, today);
  return days !== null && days < 0 && pendingQty(r) > 0;
}

export function describeDelivery(r: Requirement, today: Date): { text: string; late: boolean } | null {
  const days = daysToDelivery(r, today);
  if (days === null || pendingQty(r) === 0) return null;
  if (days < 0) return { text: `${-days} ${-days === 1 ? "day" : "days"} late`, late: true };
  if (days === 0) return { text: "Due today", late: false };
  return { text: `In ${days} ${days === 1 ? "day" : "days"}`, late: false };
}

/* -------------------------------- filtering -------------------------------- */

export interface RequirementFilters {
  search: string;
  taskId: string; // "" = every work item
  status: ProcurementStatus | "all";
  pendingOnly: boolean;
}

export const DEFAULT_FILTERS: RequirementFilters = { search: "", taskId: "", status: "all", pendingOnly: false };

export function filterRequirements(list: Requirement[], filters: RequirementFilters): Requirement[] {
  const needle = filters.search.trim().toLowerCase();
  return list.filter((r) => {
    if (filters.taskId && r.task.id !== filters.taskId) return false;
    if (filters.status !== "all" && procurementStatus(r) !== filters.status) return false;
    if (filters.pendingOnly && pendingQty(r) === 0) return false;
    if (!needle) return true;
    return [r.material.name, r.task.name, r.vendor?.name ?? ""].some((text) => text.toLowerCase().includes(needle));
  });
}

export function summarizeRequirements(list: Requirement[], today: Date) {
  return {
    notOrdered: list.filter((r) => procurementStatus(r) === "not_ordered").length,
    awaitingApproval: list.filter((r) => procurementStatus(r) === "requested").length,
    pendingOrders: list.filter((r) => pendingQty(r) > 0).length,
    overdue: list.filter((r) => isOverdue(r, today)).length,
  };
}
