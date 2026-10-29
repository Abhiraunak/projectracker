import { request } from "@/lib/api";
import type { AdminOverview, Period } from "./types";

export const dashboardApi = {
  /** Admins only: every project and person, for the chosen week, month or quarter */
  adminOverview: (period: Period) => request<AdminOverview>(`/dashboard/overview?period=${period}`),
};
