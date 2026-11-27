"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FiActivity, FiX } from "react-icons/fi";
import { useAccess } from "@/hooks/useProjectAccess";
import { useActivity } from "@/hooks/useNotifications";
import type { ActivityItem } from "@/lib/notificationsApi";

/**
 * Recent activity, for admins only: a button next to the bell opens a panel just like the bell's, with everything
 * everyone did in the last 7 days, newest first, by day. No filters. The dot means something new since the admin
 * last opened it. Lines are for reading; they don't open anything.
 */
const SEEN_KEY = "recent-activity-seen";
const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/30";

/** "Today", "Yesterday", or "Mon 16 Nov" */
function dayOf(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const y = new Date();
    y.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

const readSeen = () => {
    try {
        return typeof window === "undefined" ? "" : (localStorage.getItem(SEEN_KEY) ?? "");
    } catch {
        return "";
    }
};

export function RecentActivity() {
    const access = useAccess();
    if (!access.isAdmin) return null; // admins only
    return <Panel />;
}

function Panel() {
    const [open, setOpen] = useState(false);
    const [seen, setSeen] = useState(readSeen);
    const feed = useActivity(true, undefined, undefined, 7);
    const items: ActivityItem[] = feed.data?.pages.flatMap((p) => p.items) ?? [];
    const newest = items[0]?.createdAt ?? "";
    const fresh = !!newest && newest > seen;

    const panelId = useId();
    const wrap = useRef<HTMLDivElement>(null);
    const button = useRef<HTMLButtonElement>(null);

    const toggle = () => {
        setOpen((o) => !o);
        const now = new Date().toISOString(); // opening it counts as seeing everything up to now
        setSeen(now);
        try {
            localStorage.setItem(SEEN_KEY, now);
        } catch {
            /* private mode: the dot just comes back next time */
        }
    };

    // Close on a click outside, or Escape (focus goes back to the button)
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
        <div ref={wrap}>
            <button
                ref={button}
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={fresh ? "Recent activity, something new" : "Recent activity"}
                title="Recent activity"
                className={`relative flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 ${focusRing}`}
            >
                <FiActivity aria-hidden className="text-base" />
                {fresh && <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#F5A524]" />}
            </button>

            {/* Hangs under the top bar's right side, the same size and look as the bell's panel */}
            {open && (
                <div
                    id={panelId}
                    role="dialog"
                    aria-label="Recent activity"
                    className="absolute right-3 top-15 z-50 flex max-h-[min(70vh,calc(100dvh-5rem))] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-xl sm:right-6 lg:right-8"
                >
                    <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
                        <p className="font-semibold">
                            Recent activity <span className="text-xs font-normal text-stone-500">· last 7 days</span>
                        </p>
                        <button type="button" onClick={() => setOpen(false)} aria-label="Close recent activity" className={`flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 ${focusRing}`}>
                            <FiX aria-hidden />
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                        {feed.isPending ? (
                            <p className="p-4 text-sm text-stone-500">Loading…</p>
                        ) : feed.isError ? (
                            <p role="alert" className="p-4 text-sm text-red-700">
                                Couldn&apos;t load the activity. Try again in a moment.
                            </p>
                        ) : items.length === 0 ? (
                            <p className="p-6 text-center text-sm text-stone-500">Nothing in the last 7 days.</p>
                        ) : (
                            <ul>
                                {items.map((a, i) => {
                                    const day = dayOf(a.createdAt);
                                    const head = i === 0 || dayOf(items[i - 1]!.createdAt) !== day; // a day heading above each day's first
                                    return (
                                        <li key={a.id}>
                                            {head && <p className="bg-stone-50 px-4 py-1.5 text-xs font-medium text-stone-500">{day}</p>}
                                            <div className="border-b border-stone-100 px-4 py-3 text-sm">
                                                <span className="block wrap-break-word text-stone-800">
                                                    <span className="font-semibold">{a.actor}</span> · {a.summary}
                                                </span>
                                                <span className="mt-0.5 block text-xs text-stone-500">
                                                    {a.project ? `${a.project.title} · ` : ""}
                                                    {new Date(a.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {feed.hasNextPage && (
                            <div className="p-3">
                                <button
                                    type="button"
                                    onClick={() => void feed.fetchNextPage()}
                                    disabled={feed.isFetchingNextPage}
                                    className={`h-10 w-full rounded-lg border border-stone-200 bg-white text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 ${focusRing}`}
                                >
                                    {feed.isFetchingNextPage ? "Loading…" : "Show older"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}