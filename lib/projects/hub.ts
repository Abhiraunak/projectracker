import { request } from "@/lib/api";

/** GET /projects/:id/hub. A section's part is null when this person may not open that section. */
export interface ProjectHub {
  project: {
    id: string;
    title: string;
    firmName: string | null;
    /** PT-001, or the admin's own number (left out by older servers) */
    number?: string;
    customNumber?: boolean;
    status: "ONGOING" | "COMPLETED" | "ARCHIVED";
    updatedAt: string;
    /** Set on Edit project; null = worked out from the work items (left out by older servers) */
    startDate?: string | null;
    endDate?: string | null;
  };
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

/**
 * What a project has actually spent, only from the workspace sections (GET /projects/:id/spend):
 * labour = attendance + contract work, materials = deliveries, equipment = hire so far, general = General expenses.
 */
export interface ProjectSpend {
  /**
   * total = earned (attendance + contract); billed = bills (a period's amount); spent = per person the larger of what
   * they are owed (bills if any, else earned) and what they were paid; toPay = still owed; ahead = paid beyond owed
   */
  labour: { attendance: number; contract: number; total: number; billed: number; paid: number; paidTeam: number; paidSub: number; toPay: number; ahead: number; spent: number };
  material: { deliveries: number; total: number; planned: number };
  equipment: number;
  general: number;
  total: number;
}

/** Under "attendance", so every labour save refreshes it; deliveries, expenses and payments refresh it by name */
export const spendKey = (projectId: string) => ["attendance", "spend", projectId] as const;

/** What Edit project saves; dates are "2026-11-21", null clears them */
export interface ProjectDetails {
  title?: string;
  firmName?: string | null;
  /** Admins only: the project number; null or "" goes back to the automatic PT-00N */
  number?: string | null;
  projectCost?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

export const hubApi = {
  get: (projectId: string) => request<ProjectHub>(`/projects/${encodeURIComponent(projectId)}/hub`),
  spend: (projectId: string) => request<ProjectSpend>(`/projects/${encodeURIComponent(projectId)}/spend`),
  setDetails: (projectId: string, body: ProjectDetails) =>
    request<unknown>(`/projects/${encodeURIComponent(projectId)}`, { method: "PATCH", body: JSON.stringify(body) }),
};

/* Formatting: one formatter each, made once (making an Intl formatter is slow; using one is fast) */

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Amounts as full figures everywhere: ₹60,00,000, ₹12,19,000, ₹48,500 (never "60 L" or "1.4 Cr").
 * Kept under its old name so every screen that used the short form now shows the full figure.
 */
export function rupeesShort(value: number): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}₹${inr.format(Math.round(Math.abs(value)))}`;
}

export const rupees = (value: number) => `₹${inr.format(Math.round(value))}`;
export const shortDate = (ymd: string) => day.format(new Date(`${ymd}T00:00:00Z`));
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;