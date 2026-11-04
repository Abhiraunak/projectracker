"use client";

import { useCallback, useState } from "react";
import { FiX } from "react-icons/fi";
import { SearchInput } from "@/components/utilites/SearchInput";
import { useDebounced } from "@/hooks/useDebounced";
import { useAttendanceList, useDeleteAttendance, useDeleteAttendanceBatch } from "@/hooks/useAttendance";
import { describeError } from "@/lib/api";
import type { AttendanceListItem } from "@/lib/attendanceApi";
import { formatDay } from "@/lib/attendance/form";
import { Pagination } from "../Pagination";
import { RecordsTable } from "./RecordsTable";

const PAGE_SIZE = 5;

interface Props {
  projectId: string;
  /** Only one trade's entries ("-" = not set); undefined = all */
  trade?: string;
  onClearTrade: () => void;
  /** A row to edit: one day, or (with `batch`) days saved together */
  onEdit: (r: AttendanceListItem) => void;
  /** Told after a delete (the entry's id, or the batch's), so an entry being edited can be closed */
  onDeleted?: (id: string) => void;
  /** Changes after each save: the panel goes back to page 1 with the search cleared, to show the new entry */
  resetKey?: number;
}

/**
 * Saved records: search, paging and deleting, all from the server.
 *
 * A new `resetKey` (after a save) starts the panel afresh, with the search cleared and page 1: the `key` below
 * does that without an effect.
 */
export function RecordsPanel(props: Props) {
  return <Panel key={props.resetKey ?? 0} {...props} />;
}

/** Owns its own search and page, so the form above doesn't re-render while someone types in the search box */
function Panel({ projectId, trade, onClearTrade, onEdit, onDeleted }: Props) {
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const query = useDebounced(search.trim(), 300);

  // The page belongs to the search and trade it was picked for: a new search or trade is back on page 1,
  // worked out here while rendering instead of reset in an effect
  const filterKey = `${query}\u0000${trade ?? ""}`;
  const [paging, setPaging] = useState({ key: filterKey, page: 1 });
  const page = paging.key === filterKey ? paging.page : 1;
  const setPage = useCallback((p: number) => setPaging({ key: filterKey, page: Math.max(1, p) }), [filterKey]);
  // Typing a search (or clearing it) goes back to page 1, done in the handler rather than an effect
  const onSearch = (v: string) => {
    setSearch(v);
    setPaging((old) => ({ ...old, page: 1 }));
  };

  // grouped: days saved together come back as one row
  const list = useAttendanceList({ projectId, q: query || undefined, trade, page, pageSize: PAGE_SIZE, grouped: true });
  const remove = useDeleteAttendance();
  const removeBatch = useDeleteAttendanceBatch();

  // A page that no longer exists (entries deleted elsewhere) offers the last page instead of an empty table
  const totalPages = Math.max(1, list.data?.totalPages ?? 1);
  const pastTheEnd = !!list.data && list.data.total > 0 && list.data.items.length === 0 && page > totalPages;

  // Deleting the only row on a page (not the first) steps back a page, so an empty page is never shown
  const onlyRowOnPage = (list.data?.items.length ?? 0) === 1 && page > 1;

  const handleDelete = useCallback(
    (r: AttendanceListItem) => {
      const done = (id: string) => {
        onDeleted?.(id);
        if (onlyRowOnPage) setPage(page - 1);
      };
      const batch = r.batch;
      if (batch && batch.from && batch.to) {
        if (!window.confirm(`Delete all ${batch.count} days for ${r.contractorName} (${formatDay(batch.from)} to ${formatDay(batch.to)})?`)) return;
        setError(null);
        removeBatch.mutate(batch.id, { onSuccess: () => done(batch.id), onError: (err: unknown) => setError(describeError(err)) });
        return;
      }
      if (!window.confirm(`Delete the entry for ${r.contractorName} on ${formatDay(r.date)}?`)) return;
      setError(null);
      remove.mutate(r.id, { onSuccess: () => done(r.id), onError: (err: unknown) => setError(describeError(err)) });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remove.mutate, removeBatch.mutate, onDeleted, onlyRowOnPage, page, setPage]
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
        <SearchInput value={search} onChange={onSearch} label="Search contractor or notes" className="w-full sm:w-64" />
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
          {pastTheEnd ? (
            <p className="p-8 text-center text-sm text-stone-500">
              This page is empty now.{" "}
              <button type="button" onClick={() => setPage(totalPages)} className="font-medium text-stone-800 underline">
                Go to page {totalPages}
              </button>
            </p>
          ) : (
            <RecordsTable records={list.data.items} dimmed={list.isPlaceholderData} onEdit={onEdit} onDelete={handleDelete} />
          )}
          <Pagination page={Math.min(page, totalPages)} totalPages={list.data.totalPages} total={list.data.total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}