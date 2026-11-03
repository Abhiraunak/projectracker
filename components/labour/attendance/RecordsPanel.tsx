"use client";

import { useCallback, useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import { SearchInput } from "@/components/utilites/SearchInput";
import { useDebounced } from "@/hooks/useDebounced";
import { useAttendanceList, useDeleteAttendance } from "@/hooks/useAttendance";
import { describeError } from "@/lib/api";
import type { AttendanceRecord } from "@/lib/attendanceApi";
import { formatDay } from "@/lib/attendance/form";
import { Pagination } from "../Pagination";
import { RecordsTable } from "./RecordsTable";

const PAGE_SIZE = 5;

interface Props {
  projectId: string;
  /** Only one trade's entries ("-" = not set); undefined = all */
  trade?: string;
  onClearTrade: () => void;
  onEdit: (r: AttendanceRecord) => void;
  /** Told after a delete, so an entry being edited can be closed */
  onDeleted?: (id: string) => void;
  /** Changes after each save: the panel goes back to page 1 with the search cleared, to show the new entry */
  resetKey?: number;
}

/**
 * Saved records: search, paging and deleting, all from the server. Owns its own search and page, so the form above
 * doesn't re-render while someone types in the search box.
 */
export function RecordsPanel({ projectId, trade, onClearTrade, onEdit, onDeleted, resetKey = 0 }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const query = useDebounced(search.trim(), 300);
  const list = useAttendanceList({ projectId, q: query || undefined, trade, page, pageSize: PAGE_SIZE });
  const remove = useDeleteAttendance();

  useEffect(() => setPage(1), [query, trade]); // a new search or trade starts on page 1
  useEffect(() => {
    if (resetKey === 0) return;
    setSearch("");
    setPage(1);
  }, [resetKey]);
  // After deleting the last row of the last page, step back instead of showing an empty page
  useEffect(() => {
    if (list.data && page > list.data.totalPages) setPage(list.data.totalPages);
  }, [list.data, page]);

  const handleDelete = useCallback(
    (r: AttendanceRecord) => {
      if (!window.confirm(`Delete the entry for ${r.contractorName} on ${formatDay(r.date)}?`)) return;
      setError(null);
      remove.mutate(r.id, { onSuccess: () => onDeleted?.(r.id), onError: (err: unknown) => setError(describeError(err)) });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remove.mutate, onDeleted]
  );

  return (
    <section aria-label="Saved attendance" className="rounded border border-stone-300">
      <div className="flex flex-col items-start justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">Saved records</h2>
          {list.data && (
            <span className="rounded bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600">
              {list.data.total} {list.data.total === 1 ? "entry" : "entries"}
            </span>
          )}
          {trade !== undefined && (
            <button type="button" onClick={onClearTrade} aria-label="Show all trades" className="flex items-center gap-1 rounded bg-stone-900 px-2 py-1 text-xs font-medium text-white">
              {trade === "-" ? "Not set" : trade} <FiX aria-hidden />
            </button>
          )}
        </div>
        <SearchInput value={search} onChange={setSearch} label="Search contractor or notes" className="w-full sm:w-64" />
      </div>

      {error && (
        <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {list.isPending ? (
        <div aria-busy="true" className="m-4 h-48 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />
      ) : list.isError ? (
        <div role="alert" className="m-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{describeError(list.error)}</p>
          <button type="button" onClick={() => list.refetch()} className="mt-2 font-medium underline">
            Try again
          </button>
        </div>
      ) : list.data.total === 0 ? (
        <p className="p-10 text-center text-sm text-stone-500">
          {query ? (
            <>
              No results for &ldquo;<span className="font-semibold text-stone-700">{query}</span>&rdquo;.
            </>
          ) : trade !== undefined ? (
            "No entries for this trade."
          ) : (
            "No entries yet. Fill in the form above and save."
          )}
        </p>
      ) : (
        <>
          <RecordsTable records={list.data.items} dimmed={list.isPlaceholderData} onEdit={onEdit} onDelete={handleDelete} />
          <Pagination page={page} totalPages={list.data.totalPages} total={list.data.total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}
