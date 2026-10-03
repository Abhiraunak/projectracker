"use client";

import React, { useEffect, useState } from "react";
import { FiClock } from "react-icons/fi";
import { describeError } from "@/lib/api";
import { useAttendanceList } from "@/hooks/useAttendance";
import { Pagination } from "./Pagination";

const PAGE_SIZE = 5;
const rupees = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function timeAgo(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

function formatDay(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Newest attendance records across every project, paginated by the server */
export function RecentAttendance({ onSelect }: { onSelect?: (projectId: string) => void }) {
  const [page, setPage] = useState(1);
  const list = useAttendanceList({ page, pageSize: PAGE_SIZE });

  // If the last record on the final page is deleted, step back instead of showing an empty page
  useEffect(() => {
    if (list.data && page > list.data.totalPages) setPage(list.data.totalPages);
  }, [list.data, page]);

  if (list.isPending) {
    return <div aria-busy="true" className="h-56 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />;
  }
  if (list.isError) {
    return (
      <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{describeError(list.error)}</p>
        <button type="button" onClick={() => list.refetch()} className="mt-2 font-medium underline">
          Try again
        </button>
      </div>
    );
  }

  const { items, total, totalPages } = list.data;

  if (total === 0) {
    return (
      <div className="rounded border border-dashed border-stone-300 px-8 py-10 text-center">
        <p className="font-semibold">No attendance recorded yet</p>
        <p className="mt-1 text-sm text-stone-500">Open a project and use its Attendance tab to add the first entry.</p>
      </div>
    );
  }

  return (
    <div className="rounded border border-stone-300">
      <ul className={`divide-y divide-stone-200 transition-opacity ${list.isPlaceholderData ? "opacity-60" : ""}`}>
        {items.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onSelect?.(r.projectId)}
              disabled={!onSelect}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900 disabled:cursor-default disabled:hover:bg-transparent"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.contractorName}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
                  <span className="rounded bg-stone-100 px-2 py-0.5 font-medium text-stone-600">{r.project.title}</span>
                  <span>For {formatDay(r.date)}</span>
                  <span className="flex items-center gap-1">
                    <FiClock aria-hidden /> Added {timeAgo(r.createdAt)}
                  </span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold tabular-nums">{rupees(r.totalAmount)}</p>
                <p className="text-xs text-stone-500">
                  {r.workers.length} {r.workers.length === 1 ? "labourer" : "labourers"}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}