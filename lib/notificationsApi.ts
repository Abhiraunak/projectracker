import { request } from "@/lib/api";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  url: string;
  read: boolean;
  createdAt: string;
}

/** The filters in Recent activity */
export type ActivityType = "materials" | "labour" | "payments" | "projects";

/** One line of the Activity feed (admins): who did what, where */
export interface ActivityItem {
  id: string;
  action: string; // "diary.submitted", "attendance.created"…
  entityType: string;
  summary: string;
  actor: string;
  project: { id: string; title: string } | null;
  createdAt: string;
}

export const notificationsApi = {
  list: () => request<{ unread: number; notifications: AppNotification[] }>("/notifications"),
  /** No ids: mark everything read */
  markRead: (ids?: string[]) => request<void>("/notifications/read", { method: "POST", body: JSON.stringify({ ids }) }),
  /** Recent activity (admins): every project or one, the last `days` days, one kind of change or all */
  activity: (page: number, projectId?: string, days?: number, type?: ActivityType) =>
    request<{ items: ActivityItem[]; page: number; hasMore: boolean }>(
      `/activity?page=${page}&pageSize=20${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ""}${days ? `&days=${days}` : ""}${type ? `&type=${type}` : ""}`,
    ),
};