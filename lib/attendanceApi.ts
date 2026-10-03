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
  page: number;
  pageSize: number;
}

export interface AttendancePayload {
  projectId?: string; // only used when creating
  contractorName: string;
  date: string;
  workers: { label: string; amount: number }[];
  extras: number;
  notes: string;
}

export const attendanceApi = {
  list: ({ projectId, q, page, pageSize }: AttendanceListParams) => {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (projectId) qs.set("projectId", projectId);
    if (q) qs.set("q", q);
    return request<AttendancePage>(`/attendance?${qs}`);
  },
  create: (data: AttendancePayload) =>
    request<{ attendance: AttendanceRecord }>("/attendance", { method: "POST", body: JSON.stringify(data) }).then(
      (r) => r.attendance
    ),
  update: (id: string, data: AttendancePayload) =>
    request<{ attendance: AttendanceRecord }>(`/attendance/${id}`, { method: "PUT", body: JSON.stringify(data) }).then(
      (r) => r.attendance
    ),
  remove: (id: string) => request<void>(`/attendance/${id}`, { method: "DELETE" }),
};