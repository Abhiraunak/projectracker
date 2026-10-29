/** What GET /dashboard/overview returns (admins only). Money is in rupees, percentages are 0..100. */

export type Period = "week" | "month" | "quarter";
export type ProjectStatus = "Completed" | "Over budget" | "Running late" | "On track" | "Not started";

export interface ProjectRow {
  id: string;
  title: string;
  next: string | null; // the first work item not finished yet
  done: number;
  time: number;
  spent: number;
  budget: number | null;
  used: number | null;
  expected: number;
  status: ProjectStatus;
}

export interface NeedItem {
  kind: "requests" | "access" | "late" | "rates" | "budget";
  title: string;
  detail: string;
  href: string;
  since: string | null;
}

export interface AdminOverview {
  period: Period;
  generatedAt: string;
  kpis: {
    budget: { spent: number; budget: number; projectsWithoutBudget: number };
    work: { done: number; time: number; late: string[] };
    labour: { paid: number; earned: number; due: number };
    approvals: { requests: number; people: number; lateDeliveries: number; oldest: string | null };
  };
  strip: {
    materialSpend: { current: number; previous: number; change: number | null };
    attendance: { current: number; previous: number; change: number };
    alerts: { open: number; late: number };
    drawings: { shares: number; people: number; previous: number };
    boqs: { value: number; final: number; draft: number };
  };
  trend: { from: string; materials: number; labour: number }[];
  projects: ProjectRow[];
  needs: NeedItem[];
  activity: { id: string; who: string; summary: string; action: string; project: string | null; at: string }[];
}
