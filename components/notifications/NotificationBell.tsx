"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FiBell, FiX } from "react-icons/fi";
import { ago } from "@/lib/dashboard/format";
import { useMarkRead, useNotifications } from "@/hooks/useNotifications";
import { NotificationToggle } from "./NotificationToggle";

/** A notice about the client portal: it opens /client or /dashboard/clients */
const isClientNotice = (url: string) => url.startsWith("/client") || url.startsWith("/dashboard/clients");

const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500";

/**
 * The bell: what this person should know, to read (tapping one opens nothing). It updates by itself. (What everyone did is in Recent activity, the admin's own button next to the bell.) On a phone the panel spans the screen under the top bar; on a computer it hangs
 * from the bell. The foot turns push notifications on for this device.
 */
export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const list = useNotifications();
  const markRead = useMarkRead();
  const panelId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  // Client portal notices (payments to check, client messages) are hidden: that feature isn't in use yet
  const shown = (list.data?.notifications ?? []).filter((n) => !isClientNotice(n.url));
  const unread = shown.filter((n) => !n.read).length;

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
          className={`fixed inset-x-3 top-17 z-50 flex max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-xl sm:absolute sm:inset-x-auto sm:top-12 sm:max-h-[70vh] sm:w-[24rem] ${align === "right" ? "sm:right-0" : "sm:left-0"}`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
            <p className="font-semibold">Notifications</p>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button type="button" onClick={() => markRead.mutate(undefined)} className={`rounded px-1 text-xs font-semibold text-orange-700 hover:text-orange-800 ${focusRing}`}>
                  Mark all read
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className={`flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 sm:hidden ${focusRing}`}>
                <FiX aria-hidden />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {list.isPending ? (
              <p className="p-4 text-sm text-stone-500">Loading…</p>
            ) : list.isError ? (
              <p className="p-4 text-sm text-red-700">Couldn&apos;t load notifications.</p>
            ) : shown.length === 0 ? (
              <p className="p-6 text-center text-sm text-stone-500">Nothing yet. Site reports, deliveries that need a rate and cost alerts show here.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {shown.map((n) => (
                  <li key={n.id} className={`flex gap-3 px-4 py-3 text-sm ${n.read ? "" : "bg-orange-50/50"}`}>
                    <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-orange-600"}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block ${n.read ? "font-medium text-stone-700" : "font-semibold"}`}>{n.title}</span>
                      <span className="block wrap-break-word text-stone-600">{n.body}</span>
                      <span className="mt-0.5 block text-xs text-stone-500">{ago(n.createdAt)}</span>
                    </span>
                    {!n.read && <span className="sr-only">Unread</span>}
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