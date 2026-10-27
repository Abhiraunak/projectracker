"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FiFileText, FiPlus } from "react-icons/fi";
import { describeError } from "@/lib/api";
import { newBlankDocument, newSampleDocument } from "@/lib/boq/newDocument";
import type { BoqSummary } from "@/lib/boq/types";
import { useBoqList, useCreateBoq, useDeleteBoq, useDuplicateBoq } from "@/hooks/useBoqs";
import { useDebounced } from "@/hooks/useDebounced";
import { useDialogState } from "@/hooks/useDialogState";
import { Heading } from "@/components/utilites/Label";
import { ConfirmDeleteDialog } from "@/components/utilites/Confirmdeletedialog"; // match your actual file name
import { QueryError } from "@/components/materials/QueryError";
import { Pagination } from "@/components/labour/Pagination";
import { BoqFilters, type StatusFilter } from "./BoqFilters";
import { BoqList } from "./BoqList";
import { BoqStats } from "./BoqStats";

const PAGE_SIZE = 10;

/** The BOQ dashboard: figures, search, the list with pages, and creating, opening, copying or deleting BOQs */
export function BoqDashboard() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim(), 300);

  const list = useBoqList({ q: q || undefined, status: status === "ALL" ? undefined : status, page, pageSize: PAGE_SIZE });
  const create = useCreateBoq();
  const duplicate = useDuplicateBoq();
  const remove = useDeleteBoq();
  const deleting = useDialogState<BoqSummary>();
  const [error, setError] = useState<string | null>(null);

  // A new search or filter starts again from page 1
  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const changeStatus = (value: StatusFilter) => {
    setStatus(value);
    setPage(1);
  };

  const startNew = async (from: "blank" | "sample") => {
    setError(null);
    try {
      const boq = await create.mutateAsync(from === "blank" ? newBlankDocument() : await newSampleDocument());
      router.push(`/dashboard/boq/${boq.id}`);
    } catch (err) {
      setError(describeError(err));
    }
  };

  const copy = async (source: BoqSummary) => {
    setError(null);
    try {
      const boq = await duplicate.mutateAsync(source.id);
      router.push(`/dashboard/boq/${boq.id}`);
    } catch (err) {
      setError(describeError(err));
    }
  };

  const confirmDelete = async () => {
    if (!deleting.value) return;
    try {
      await remove.mutateAsync(deleting.value.id);
      deleting.close();
      // Deleting the last BOQ on a page: go back a page rather than show an empty one
      if (list.data && list.data.items.length === 1 && page > 1) setPage(page - 1);
    } catch {
      /* shown inside the dialog */
    }
  };

  const data = list.data;
  const filtering = q !== "" || status !== "ALL";

  return (
    <div className="min-w-0 text-stone-900">
      {/*
        Stays at the top while the page scrolls, the same as the Labour and Drawings headers. On phones and tablets it
        sits just under the layout's 56px top bar (top-14). On large screens the white card scrolls, and a sticky
        element sticks inside the card's 24px padding, so lg:-top-6 lifts it flush to the card's edge; the negative
        margins with matching padding stretch its white background over the card's padding.
      */}
      <header className="sticky top-14 z-20 -mx-4 -mt-5 border-b border-stone-200 bg-white px-4 pt-3 sm:-mx-6 sm:-mt-6 sm:px-6 lg:-top-6 lg:-mx-8 lg:px-8 lg:pt-4">
        <div className="mx-auto mb-3 flex max-w-6xl flex-col gap-3 sm:mb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-0.5">
            <Heading>Bills of quantities</Heading>
            <p className="text-sm text-stone-500">Create a BOQ and type straight onto the page. Print it, or export it to Excel.</p>
          </div>
          {/* Side by side on phones too, so the fixed header stays short */}
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => startNew("sample")}
              disabled={create.isPending}
              className="flex items-center justify-center gap-2 rounded border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50"
            >
              <FiFileText aria-hidden /> Start from the sample
            </button>
            <button
              type="button"
              onClick={() => startNew("blank")}
              disabled={create.isPending}
              className="flex items-center justify-center gap-2 rounded bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50"
            >
              <FiPlus aria-hidden /> {create.isPending ? "Creating…" : "New BOQ"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 py-5 sm:py-8">
        {error && (
          <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {data && <BoqStats stats={data.stats} />}

        <BoqFilters search={search} onSearch={changeSearch} status={status} onStatus={changeStatus} />

        <div className="rounded border border-stone-300">
          {list.isPending && <div aria-busy="true" className="h-64 animate-pulse bg-stone-100 motion-reduce:animate-none" />}
          {list.isError && (
            <div className="p-4">
              <QueryError error={list.error} onRetry={() => list.refetch()} />
            </div>
          )}
          {data && data.items.length === 0 && (
            <div className="px-4 py-16 text-center">
              <p className="font-semibold">{filtering ? "No BOQs match" : "No BOQs yet"}</p>
              <p className="mt-1 text-sm text-stone-500">{filtering ? "Try another search, or show all BOQs." : "Create your first BOQ with New BOQ, or start from the sample."}</p>
            </div>
          )}
          {data && data.items.length > 0 && (
            <>
              <div aria-busy={list.isFetching} className={list.isPlaceholderData ? "opacity-60 transition-opacity" : ""}>
                <BoqList items={data.items} onDuplicate={copy} onDelete={deleting.open} busyId={duplicate.isPending ? (duplicate.variables ?? null) : null} />
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
            </>
          )}
        </div>

        <ConfirmDeleteDialog
          open={deleting.isOpen}
          onClose={deleting.close}
          onConfirm={confirmDelete}
          title="Delete this BOQ?"
          itemName={deleting.value?.title || "Untitled BOQ"}
          description="The BOQ and all its sheets will be deleted for everyone. Export it to Excel first if you might need it."
          pending={remove.isPending}
          error={remove.isError ? describeError(remove.error) : null}
        />
      </div>
    </div>
  );
}