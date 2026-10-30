"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiBell } from "react-icons/fi";
import { ago } from "@/lib/dashboard/format";
import { useMarkRead, useNotifications } from "@/hooks/useNotifications";
import { NotificationToggle } from "./NotificationToggle";

const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500";

/**
 * The bell: what happened that this person should know (payments asked for, confirmed, overdue, schedule extended,
 * payments to check…), newest first, with a red count of unread ones. The foot of the panel turns phone notifications on.
 */
export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const list = useNotifications();
  const markRead = useMarkRead();
  const router = useRouter();
  const panelId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const unread = list.data?.unread ?? 0;

  // Close on a click outside, or Escape (focus goes back to the bell)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = (id: string, url: string, read: boolean) => {
    if (!read) markRead.mutate([id]);
    setOpen(false);
    router.push(url);
  };

  return (
    <div ref={wrap} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 ${focusRing}`}
      >
        <FiBell aria-hidden className="text-base" />
        {unread > 0 && (
          <span aria-hidden className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className={`absolute top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-stone-200 bg-white text-left shadow-xl ${align === "right" ? "right-0" : "left-0"}`}
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <p className="font-semibold">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={() => markRead.mutate(undefined)} className={`rounded text-xs font-semibold text-orange-700 hover:text-orange-800 ${focusRing}`}>
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {list.isPending ? (
              <p className="p-4 text-sm text-stone-500">Loading…</p>
            ) : list.isError ? (
              <p className="p-4 text-sm text-red-700">Couldn&apos;t load notifications.</p>
            ) : list.data.notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-stone-500">Nothing yet. Payment reminders and updates will show here.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {list.data.notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => go(n.id, n.url, n.read)}
                      className={`flex w-full gap-3 px-4 py-3 text-left text-sm hover:bg-stone-50 focus:outline-none focus-visible:bg-stone-50 ${n.read ? "" : "bg-orange-50/50"}`}
                    >
                      <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-orange-600"}`} />
                      <span className="min-w-0 flex-1">
                        <span className={`block ${n.read ? "font-medium text-stone-700" : "font-semibold"}`}>{n.title}</span>
                        <span className="block text-stone-600">{n.body}</span>
                        <span className="mt-0.5 block text-xs text-stone-500">{ago(n.createdAt)}</span>
                      </span>
                      {!n.read && <span className="sr-only">Unread</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-stone-100 bg-stone-50 px-2 py-2">
            <p className="px-2.5 pb-1 text-xs font-semibold text-stone-600">Also get these on this phone or computer</p>
            <NotificationToggle />
          </div>
        </div>
      )}
    </div>
  );
}
