import { request } from "@/lib/api";

export interface AttendanceWorker {
  id: string;
  label: string;
  amount: number;
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
  createdAt: string;
  updatedAt: string;
}

export interface AttendancePage {
  items: AttendanceRecord[];
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
}

export interface AttendancePayload {
  projectId?: string; // only used when creating
  contractorName: string;
  trade: string;
  date: string;
  workers: { label: string; amount: number }[];
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
  workers: { label: string; amount: number; amounts?: Record<string, number> }[];
};

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
  list: ({ projectId, q, trade, page, pageSize }: AttendanceListParams) => {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
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
    request<{ attendance: AttendanceRecord[]; count: number }>("/attendance/bulk", { method: "POST", body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/attendance/${id}`, { method: "DELETE" }),
};
