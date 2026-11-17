"use client";

import React from "react";
import type { AdminUser } from "@/lib/access/types";
import { describeChange, displayName } from "@/lib/access/sections";
import { useAccessLog } from "@/hooks/useAdminUsers";
import { QueryError } from "@/components/materials/QueryError";

const when = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** The latest access changes across the company: who changed whose access, and what changed */
export function RecentAccessChanges({ users }: { users: AdminUser[] }) {
    const log = useAccessLog();
    const byId = new Map(users.map((u) => [u.id, u]));

    return (
        <section aria-labelledby="access-log-heading" className="rounded border border-stone-300">
            <h2 id="access-log-heading" className="border-b border-stone-200 px-4 py-3 text-sm font-semibold">
                Recent access changes
            </h2>
            {log.isPending && <div aria-busy="true" className="m-4 h-24 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />}
            {log.isError && (
                <div className="p-4">
                    <QueryError error={log.error} onRetry={() => log.refetch()} />
                </div>
            )}
            {log.data && log.data.length === 0 && <p className="p-4 text-sm text-stone-500">No access changes yet.</p>}
            {log.data && log.data.length > 0 && (
                <ol className="divide-y divide-stone-100">
                    {log.data.map((entry) => {
                        const person = entry.userId ? byId.get(entry.userId) : undefined;
                        const what = describeChange(entry.changes);
                        return (
                            <li key={entry.id} className="flex flex-col gap-0.5 px-4 py-2.5 text-sm sm:flex-row sm:items-baseline sm:gap-3">
                                <span className="shrink-0 text-xs tabular-nums text-stone-500 sm:w-32">{when(entry.createdAt)}</span>
                                <span className="min-w-0">
                                    <span className="font-medium">{person ? displayName(person) : entry.summary.replace(/^Changed access for /, "")}</span>
                                    {what.length > 0 && <span className="text-stone-700">: {what.join("; ")}</span>}
                                    <span className="text-stone-500"> · by {entry.actor}</span>
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
}