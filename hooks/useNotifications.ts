"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type AppNotification } from "@/lib/notificationsApi";

const KEY = ["notifications"] as const;

/** The bell's list. Checked every minute, and whenever the tab comes back into view. */
export const useNotifications = () =>
  useQuery({ queryKey: KEY, queryFn: notificationsApi.list, refetchInterval: 60_000, refetchOnWindowFocus: true, staleTime: 30_000 });

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => notificationsApi.markRead(ids),
    // Show them read at once; the server catches up
    onMutate: (ids?: string[]) => {
      qc.setQueryData<{ unread: number; notifications: AppNotification[] }>(KEY, (old) => {
        if (!old) return old;
        const hit = (n: AppNotification) => !ids || ids.includes(n.id);
        const notifications = old.notifications.map((n) => (hit(n) ? { ...n, read: true } : n));
        return { notifications, unread: ids ? Math.max(0, old.unread - old.notifications.filter((n) => hit(n) && !n.read).length) : 0 };
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
