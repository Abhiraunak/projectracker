"use client";

import { useState } from "react";
import { FiFileText, FiPlus } from "react-icons/fi";
import { BoqEditor } from "@/components/boq/editor/BoqEditor";
import { BoqFilters, type StatusFilter } from "@/components/boq/dashboard/BoqFilters";
import { BoqList } from "@/components/boq/dashboard/BoqList";
import { Pagination } from "@/components/labour/Pagination";
import { ConfirmDeleteDialog } from "@/components/utilites/Confirmdeletedialog"; // match your actual file name
import { useBoq, useBoqList, useCreateBoq, useDeleteBoq, useDuplicateBoq } from "@/hooks/useBoqs";
import { useDebounced } from "@/hooks/useDebounced";
import { useProjectHub } from "@/hooks/useProjectHub";
import { goTo, useWorkspaceItem } from "@/hooks/useWorkspacePlace";
import { describeError } from "@/lib/api";
import { newBlankDocument, newSampleDocument } from "@/lib/boq/newDocument";
import type { BoqSummary } from "@/lib/boq/types";
import { SectionError } from "../ui";
import { mono } from "./materials/mono";

const PAGE_SIZE = 10;

/**
 * The project's BOQs, made and edited right here (no trip to the BOQ page). Every BOQ created here belongs to this
 * project from the start and is listed only here; inside the workspace its project is fixed, so it can't drift into
 * another one. Opening a BOQ puts its id in the address (?i=), so back, refresh and shared links land on it.
 */
export default function BoqSection({ projectId }: { projectId: string }) {
  const open = useWorkspaceItem();
  const close = () => goTo({ projectId, section: "boq", item: null });
  return open ? <OpenBoq projectId={projectId} id={open} onBack={close} /> : <BoqBook projectId={projectId} />;
}

/* ------------------------------------------------ the list ------------------------------------------------ */

/** The same table as the BOQ page (search, All / Drafts / Final, pages), with this project's BOQs only */
function BoqBook({ projectId }: { projectId: string }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim(), 300);
  const list = useBoqList({ projectId, q: q || undefined, status: status === "ALL" ? undefined : status, page, pageSize: PAGE_SIZE });
  const create = useCreateBoq(projectId); // linked to this project from the start
  const duplicate = useDuplicateBoq(projectId); // the copy stays in this project
  const remove = useDeleteBoq();
  const [deleting, setDeleting] = useState<BoqSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openBoq = (id: string) => goTo({ projectId, section: "boq", item: id });
  const startNew = async (from: "blank" | "sample") => {
    setError(null);
    try {
      const boq = await create.mutateAsync(from === "blank" ? newBlankDocument() : await newSampleDocument());
      openBoq(boq.id);
    } catch (err) {
      setError(describeError(err));
    }
  };
  const copy = async (source: BoqSummary) => {
    setError(null);
    try {
      const boq = await duplicate.mutateAsync(source.id);
      openBoq(boq.id);
    } catch (err) {
      setError(describeError(err));
    }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      setDeleting(null);
      if (list.data && list.data.items.length === 1 && page > 1) setPage(page - 1);
    } catch {
      /* shown in the dialog */
    }
  };

  const data = list.data;
  const filtering = q !== "" || status !== "ALL";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button type="button" onClick={() => void startNew("sample")} disabled={create.isPending} className={mono.secondary}>
            <FiFileText aria-hidden /> From sample
          </button>
          <button type="button" onClick={() => void startNew("blank")} disabled={create.isPending} className={mono.primary}>
            <FiPlus aria-hidden /> {create.isPending ? "Creating…" : "New BOQ"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-[#FCEDEC] px-4 py-3 text-sm text-[#B3261E]">
          {error}
        </p>
      )}

      <BoqFilters
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        status={status}
        onStatus={(v) => {
          setStatus(v);
          setPage(1);
        }}
      />

      <div className={`${mono.card} overflow-hidden`}>
        {list.isPending ? (
          <div aria-busy="true" className="h-64 animate-pulse bg-[#F7F7F5] motion-reduce:animate-none" />
        ) : list.isError ? (
          <div className="p-4">
            <SectionError error={list.error} onRetry={() => void list.refetch()} />
          </div>
        ) : data!.items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-[17px] font-semibold text-[#111111]">{filtering ? "No BOQ matches" : "No BOQ for this project yet"}</p>
            <p className="mt-1.5 text-sm text-[#666666]">{filtering ? "Try another search, or show all." : "Create one with New BOQ or start from the sample. It belongs to this project only."}</p>
          </div>
        ) : (
          <>
            <div aria-busy={list.isFetching} className={list.isPlaceholderData ? "opacity-60 transition-opacity" : ""}>
              <BoqList items={data!.items} onOpen={(b) => openBoq(b.id)} onDuplicate={copy} onDelete={setDeleting} busyId={duplicate.isPending ? (duplicate.variables ?? null) : null} hideProject />
            </div>
            <Pagination page={data!.page} totalPages={data!.totalPages} total={data!.total} pageSize={data!.pageSize} onPageChange={setPage} />
          </>
        )}
      </div>

      <ConfirmDeleteDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete this BOQ?"
        itemName={deleting?.title || "Untitled BOQ"}
        description="The BOQ and all its sheets will be deleted. Export it to Excel first if you might need it."
        pending={remove.isPending}
        error={remove.isError ? describeError(remove.error) : null}
      />
    </div>
  );
}

/* ------------------------------------------------ one BOQ ------------------------------------------------ */

function OpenBoq({ projectId, id, onBack }: { projectId: string; id: string; onBack: () => void }) {
  const boq = useBoq(id);
  const hub = useProjectHub(projectId);
  if (boq.isPending) return <div aria-busy="true" className="h-[70vh] animate-pulse rounded-[22px] bg-[#EFEFED] motion-reduce:animate-none" />;
  if (boq.isError)
    return (
      <div className="space-y-3">
        <SectionError error={boq.error} onRetry={() => void boq.refetch()} />
        <button type="button" onClick={onBack} className={mono.secondary}>
          Back to this project&apos;s BOQs
        </button>
      </div>
    );
  // Only this project's BOQs open here; a link to another project's BOQ does not
  if (boq.data.project?.id !== projectId)
    return (
      <div className={`${mono.card} px-6 py-12 text-center`}>
        <p className="text-[17px] font-semibold text-[#111111]">This BOQ isn&apos;t part of this project</p>
        <button type="button" onClick={onBack} className={`${mono.secondary} mt-4`}>
          Back to this project&apos;s BOQs
        </button>
      </div>
    );
  const projectTitle = hub.data?.project.title ?? boq.data.project.title;
  // key: a different BOQ is a fresh editor (history, autosave and all)
  return <BoqEditor key={boq.data.id} record={boq.data} embedded={{ onBack, projectTitle }} />;
}