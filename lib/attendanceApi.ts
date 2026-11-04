import { request } from "@/lib/api";

export interface AttendanceWorker {
  id: string;
  label: string;
  amount: number;
  // Paid hourly: who on the team list, hours and OT that day, and the hourly rate used; null when paid by amount
  memberId?: string | null;
  hours?: number | null;
  otHours?: number | null;
  hourlyRate?: number | null;
}

export interface AttendanceRecord {
  id: string;
  projectId: string;
  project: { id: string; title: string };
  contractorName: string;
  trade: string; // "Civil", "Tiles"…; empty: not set (older entries)
  date: string; // YYYY-MM-DD
  workers: AttendanceWorker[];
  extras: number;
  notes: string;
  totalAmount: number;
  payMode?: "amount" | "hourly"; // older servers leave it out: paid by amount
  batchId?: string | null; // set when several days were saved together
  createdAt: string;
  updatedAt: string;
}

/** Several days saved together, listed as one row: every day, and the total of all of them */
export interface AttendanceBatch {
  id: string;
  count: number;
  from: string | null; // first day
  to: string | null; // last day
  totalAmount: number;
  days: AttendanceRecord[];
}

/** A row of Saved records: one day, or (with `batch`) several days saved together */
export type AttendanceListItem = AttendanceRecord & { batch?: AttendanceBatch | null };

export interface AttendancePage {
  items: AttendanceListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AttendanceListParams {
  projectId?: string;
  q?: string;
  /** One trade only; "-" for entries with no trade set */
  trade?: string;
  page: number;
  pageSize: number;
  /** Days saved together come back as one row (Saved records); other lists leave it out and get every day */
  grouped?: boolean;
}

export interface AttendancePayload {
  projectId?: string; // only used when creating
  payMode?: "amount" | "hourly"; // left out: paid by amount ("Paid monthly")
  contractorName: string;
  trade: string;
  date: string;
  workers: { label: string; amount: number; dayRate?: number; hours?: number; otHours?: number }[];
  extras: number;
  notes: string;
}

/**
 * Several days at once (one entry per day). Each labourer can have a different amount on each day: `amounts` by
 * date ("YYYY-MM-DD"); a day it doesn't list uses `amount`.
 */
export type AttendanceManyPayload = Omit<AttendancePayload, "date" | "workers"> & {
  projectId: string;
  dates: string[];
  workers: {
    label: string;
    amount: number;
    amounts?: Record<string, number>; // paid by amount
    dayRate?: number; // paid hourly: rupees for 8 hours
    hoursByDay?: Record<string, number>;
    otByDay?: Record<string, number>;
  }[];
};

/** One of a contractor's labourers (hourly attendance) */
export interface TeamMember {
  id: string;
  name: string;
  dayRate: number; // for 8 hours
  hourlyRate: number;
  active: boolean; // false: left the team
}

export interface Team {
  contractorName: string;
  members: TeamMember[];
  standardHours: number;
}

/** One labourer's month: each day's hours, OT and pay, and their totals */
export interface MonthSheetRow {
  key: string;
  name: string;
  hourly: boolean;
  dayRate: number | null;
  hourlyRate: number | null;
  days: Record<string, { hours: number | null; ot: number | null; amount: number }>; // "1".."31"
  hours: number;
  otHours: number;
  amount: number; // normal hours (or everything typed, when paid by amount)
  otAmount: number;
  total: number;
}

export interface MonthResponse {
  month: string; // YYYY-MM
  contractor: { name: string; trade: string } | null;
  contractors: { name: string; trade: string }[];
  sheet: {
    daysInMonth: number;
    rows: MonthSheetRow[];
    extras: Record<string, number>;
    extrasTotal: number;
    dayTotals: Record<string, number>;
    totals: { hours: number; otHours: number; amount: number; otAmount: number; total: number };
  };
  statement: {
    opening: number; // owed from before this month; below 0: paid in advance
    earned: number;
    payments: { id: string; date: string; amount: number; remark: string }[];
    paid: number;
    closing: number; // carried to next month
  };
}

/** One card per trade on a project */
export interface TradeSummary {
  trade: string; // "" = not set
  entries: number;
  total: number;
  week: number; // the last 7 days
  month: number; // this calendar month
  lastDate: string | null;
  contractors: string[];
}

export interface TradesResponse {
  trades: TradeSummary[];
  /** Trades to offer on the form: the project's own first, then the usual ones */
  choices: string[];
  /** Each contractor's latest trade, to fill the form in */
  usual: Record<string, string>;
}

export const attendanceApi = {
  list: ({ projectId, q, trade, page, pageSize, grouped }: AttendanceListParams) => {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (grouped) qs.set("grouped", "true");
    if (projectId) qs.set("projectId", projectId);
    if (q) qs.set("q", q);
    if (trade !== undefined) qs.set("trade", trade);
    return request<AttendancePage>(`/attendance?${qs}`);
  },
  trades: (projectId: string) => request<TradesResponse>(`/attendance/trades?projectId=${encodeURIComponent(projectId)}`),
  setTrade: (data: { projectId: string; contractorName: string; trade: string; all?: boolean }) =>
    request<{ updated: number; trade: string }>("/attendance/trade", { method: "PATCH", body: JSON.stringify(data) }),
  create: (data: AttendancePayload) =>
    request<{ attendance: AttendanceRecord }>("/attendance", { method: "POST", body: JSON.stringify(data) }).then(
      (r) => r.attendance
    ),
  update: (id: string, data: AttendancePayload) =>
    request<{ attendance: AttendanceRecord }>(`/attendance/${id}`, { method: "PUT", body: JSON.stringify(data) }).then(
      (r) => r.attendance
    ),
  createMany: (data: AttendanceManyPayload) =>
    request<{ attendance: AttendanceRecord[]; count: number; batchId: string | null }>("/attendance/bulk", { method: "POST", body: JSON.stringify(data) }),
  /** Days saved together, edited in one go (days can be added or taken out) */
  updateMany: (batchId: string, data: AttendanceManyPayload) =>
    request<{ attendance: AttendanceRecord[]; count: number; batchId: string }>(`/attendance/bulk/${encodeURIComponent(batchId)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  removeBatch: (batchId: string) => request<void>(`/attendance/bulk/${encodeURIComponent(batchId)}`, { method: "DELETE" }),
  remove: (id: string) => request<void>(`/attendance/${id}`, { method: "DELETE" }),
  team: (projectId: string, contractor: string) =>
    request<Team>(`/attendance/team?${new URLSearchParams({ projectId, contractor })}`),
  saveTeam: (data: { projectId: string; contractorName: string; members: { id?: string; name: string; dayRate: number; active: boolean }[] }) =>
    request<Team>("/attendance/team", { method: "PUT", body: JSON.stringify(data) }),
  month: (projectId: string, month: string, contractor?: string) => {
    const qs = new URLSearchParams({ projectId, month });
    if (contractor) qs.set("contractor", contractor);
    return request<MonthResponse>(`/attendance/month?${qs}`);
  },
};