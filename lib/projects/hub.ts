import { request } from "@/lib/api";

/** GET /projects/:id/hub. A section's part is null when this person may not open that section. */
export interface ProjectHub {
  project: { id: string; title: string; firmName: string | null; status: "ONGOING" | "COMPLETED" | "ARCHIVED"; updatedAt: string };
  progress: { percent: number; items: number; start: string | null; end: string | null; daysLeft: number | null; late: boolean };
  money: { budget: number; budgetIsSet: boolean; labourPaid: number; materialSpent: number; spent: number; left: number; usedPct: number };
  labour: { agreed: number; paid: number; earned: number; due: number; paidAhead: number };
  /** Contractor vs in-house for the work items with both rates (missing from an older API) */
  rates?: { compared: number; missing: number; contractor: number; inHouse: number; saving: number };
  materials: { spent: number; expected: number; openAlerts: number; pendingRequests: number } | null;
  boqs: { id: string; title: string; boqNumber: string; status: "DRAFT" | "FINAL"; grandTotal: number; itemCount: number; updatedAt: string }[] | null;
  drawings: { count: number } | null;
  attendance: { entriesThisWeek: number; amountThisWeek: number; lastDate: string | null; lastAmount: number | null } | null;
  /** Phase 6; missing from an older API */
  equipment?: { items: number; hireThisMonth: number } | null;
}

export const hubApi = {
  get: (projectId: string) => request<ProjectHub>(`/projects/${encodeURIComponent(projectId)}/hub`),
  setDetails: (projectId: string, body: { title?: string; firmName?: string | null; projectCost?: number | null }) =>
    request<unknown>(`/projects/${encodeURIComponent(projectId)}`, { method: "PATCH", body: JSON.stringify(body) }),
};

/* Formatting: one formatter each, made once (making an Intl formatter is slow; using one is fast) */

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** ₹1.48 Cr, ₹12.4 L, ₹48,500: short enough for a tile */
export function rupeesShort(value: number): string {
  const v = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (v >= 1e7) return `${sign}₹${trim(v / 1e7)} Cr`;
  if (v >= 1e5) return `${sign}₹${trim(v / 1e5)} L`;
  return `${sign}₹${inr.format(v)}`;
}
const trim = (n: number) => (n >= 100 ? Math.round(n).toString() : n.toFixed(2).replace(/\.?0+$/, ""));

export const rupees = (value: number) => `₹${inr.format(Math.round(value))}`;
export const shortDate = (ymd: string) => day.format(new Date(`${ymd}T00:00:00Z`));
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;