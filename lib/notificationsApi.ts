import { request } from "@/lib/api";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  url: string;
  read: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: () => request<{ unread: number; notifications: AppNotification[] }>("/notifications"),
  /** No ids: mark everything read */
  markRead: (ids?: string[]) => request<void>("/notifications/read", { method: "POST", body: JSON.stringify({ ids }) }),
};