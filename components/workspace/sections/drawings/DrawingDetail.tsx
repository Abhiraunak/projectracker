"use client";

import { memo, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiDownload, FiExternalLink, FiEye, FiTrash2, FiUpload } from "react-icons/fi";
import { useDeleteDrawing } from "@/hooks/useDrawings";
import { describeError } from "@/lib/api";
import { useDrawingRevisions } from "@/hooks/useProjectDrawings";
import { goTo, hrefFor, onPlaceClick } from "@/hooks/useWorkspacePlace";
import { downloadName, formatBytes, formatDate } from "@/lib/drawings/format";
import type { NumberedDrawing, ProjectDrawing } from "@/lib/drawings/projectApi";

import { ModalDialog } from "@/components/utilites/ModalDialog";
import { FileTypeTile, kindLabel } from "@/components/drawing/FileTypeTile";
import { ImageWithFallback } from "@/components/drawing/ImageWithFallback";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50";
const who = (r: NumberedDrawing) => (r.isOwner ? "you" : r.owner.email.split("@")[0]);

/**
 * One drawing opened as a folder: every revision as a dark tile, newest first, with view, download and (for the
 * person who uploaded it) delete. Tapping a tile shows that revision large. The ← and → keys, and the arrows at the
 * top, move to the previous and next drawing.
 */
export const DrawingDetail = memo(function DrawingDetail({
  projectId,
  drawing,
  prev,
  next,
  onRevise,
}: {
  projectId: string;
  drawing: ProjectDrawing;
  prev: ProjectDrawing | null;
  next: ProjectDrawing | null;
  onRevise: (number: string) => void;
}) {
  const history = useDrawingRevisions(drawing.id, drawing.revisions > 1);
  const [viewing, setViewing] = useState<string | null>(null); // the revision open large
  const place = (d: ProjectDrawing | null) => (d ? { projectId, section: "drawings" as const, item: d.id } : null);
  const grid = { projectId, section: "drawings" as const, item: null };
  const qc = useQueryClient();
  const remove = useDeleteDrawing();

  // Newest first. With one revision there is nothing to fetch: it is the drawing itself.
  const revisions: NumberedDrawing[] = drawing.revisions > 1 ? (history.data?.revisions ?? [drawing]) : [drawing];
  const shown = viewing ? (revisions.find((r) => r.id === viewing) ?? null) : null;

  /**
   * Delete one revision straight away (no confirmation). Deleting the latest: the one before it becomes the latest;
   * the only one: back to all drawings. Only the person who uploaded a file can delete it (the server checks).
   */
  const deleteRevision = (id: string) => {
    const others = revisions.filter((r) => r.id !== id);
    remove.mutate(id, {
      onSuccess: () => {
        setViewing(null);
        void qc.invalidateQueries({ queryKey: ["drawings"] });
        void qc.invalidateQueries({ queryKey: ["projects", "hub", projectId] }); // the overview's count
        if (id === drawing.id) {
          const newest = others[0];
          goTo(newest ? { projectId, section: "drawings", item: newest.id } : grid, { replace: true });
        }
      },
    });
  };

  // Arrow keys move between drawings (not while typing, and not while a revision is open large)
  useEffect(() => {
    if (viewing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowLeft" && prev) goTo(place(prev)!);
      if (e.key === "ArrowRight" && next) goTo(place(next)!);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- place() only reads projectId, which is in the list
  }, [prev, next, projectId, viewing]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <a href={hrefFor(grid)} onClick={onPlaceClick(grid)} className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900">
          <FiArrowLeft aria-hidden /> All drawings
        </a>
        <span className="flex-1" />
        <StepLink to={place(prev)} label={prev ? `Previous: ${prev.number}` : "No previous drawing"} Icon={FiChevronLeft} />
        <StepLink to={place(next)} label={next ? `Next: ${next.number}` : "No next drawing"} Icon={FiChevronRight} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <h2 className="wrap-break-word text-2xl font-semibold tracking-tight text-stone-900">{drawing.title || drawing.number}</h2>
          <p className="text-sm text-stone-500">
            {drawing.number} · {drawing.revisions === 1 ? "1 revision" : `${drawing.revisions} revisions`} · updated {formatDate(drawing.createdAt)}
          </p>
        </div>
        <button type="button" onClick={() => onRevise(drawing.number)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800">
          <FiUpload aria-hidden /> Upload new revision
        </button>
      </div>

      {history.isError && <p className="text-sm text-red-700">Couldn&rsquo;t load the earlier revisions. Only the latest is shown.</p>}
      {remove.isError && !shown && (
        <p role="alert" className="text-sm text-red-700">
          {describeError(remove.error)}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {revisions.map((r) => (
          <RevisionTile key={r.id} r={r} latest={r.id === drawing.id} number={drawing.number} busy={remove.isPending} onView={() => setViewing(r.id)} onDelete={() => deleteRevision(r.id)} />
        ))}
        {drawing.revisions > 1 &&
          history.isPending &&
          Array.from({ length: Math.min(drawing.revisions - 1, 3) }, (_, i) => <li key={i} aria-hidden className="aspect-4/5 animate-pulse rounded-[20px] bg-neutral-200 motion-reduce:animate-none" />)}
      </ul>

      {shown && (
        <ModalDialog open onClose={() => setViewing(null)} label={`${drawing.number} R${shown.revision}`} size="xl" locked={remove.isPending}>
          <RevisionViewer
            r={shown}
            latest={shown.id === drawing.id}
            latestRevision={drawing.revision}
            number={drawing.number}
            busy={remove.isPending}
            error={remove.isError ? describeError(remove.error) : null}
            onDelete={() => deleteRevision(shown.id)}
            onClose={() => setViewing(null)}
          />
        </ModalDialog>
      )}
    </div>
  );
});

/* ------------------------------------------ one revision ------------------------------------------ */

const RevisionTile = memo(function RevisionTile({
  r,
  latest,
  number,
  busy,
  onView,
  onDelete,
}: {
  r: NumberedDrawing;
  latest: boolean;
  number: string;
  busy: boolean;
  onView: () => void;
  onDelete: () => void;
}) {
  const icon = "inline-flex h-10 w-10 items-center justify-center rounded-lg text-neutral-300 hover:bg-white/10 hover:text-white disabled:opacity-50";
  return (
    <li className="flex flex-col overflow-hidden rounded-[20px] bg-neutral-900 p-1.5">
      <button
        type="button"
        onClick={onView}
        aria-label={`View R${r.revision}`}
        className="relative block aspect-4/3 overflow-hidden rounded-[15px] bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        {r.thumbnailUrl ? <ImageWithFallback src={r.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <FileTypeTile kind={r.kind} format={r.format} compact className="h-full w-full" />}
        {latest && <span className="absolute right-2 top-2 rounded-full border border-emerald-400/60 bg-black/55 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">Latest</span>}
      </button>
      <div className="flex flex-1 flex-col px-2 pb-0.5 pt-2">
        <p className="text-lg font-medium leading-none tabular-nums text-white">R{r.revision}</p>
        <p className="mt-1 truncate text-xs text-neutral-400">
          {formatDate(r.createdAt)} · {who(r)}
        </p>
        <div className="-mx-1 mt-1.5 flex items-center">
          <button type="button" onClick={onView} aria-label={`View R${r.revision}`} title="View" className={icon}>
            <FiEye aria-hidden />
          </button>
          <a href={r.downloadUrl} download={downloadName(`${number} ${r.title} R${r.revision}`)} target="_blank" rel="noopener noreferrer" aria-label={`Download R${r.revision}`} title="Download" className={icon}>
            <FiDownload aria-hidden />
          </a>
          <span className="flex-1" />
          {r.isOwner && (
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              aria-label={`Delete R${r.revision}`}
              title="Delete"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50"
            >
              <FiTrash2 aria-hidden />
            </button>
          )}
        </div>
      </div>
    </li>
  );
});

/** A revision large, in a pop-up: the picture (page 1 for a PDF), its details, and open / download / delete */
function RevisionViewer({
  r,
  latest,
  latestRevision,
  number,
  busy,
  error,
  onDelete,
  onClose,
}: {
  r: NumberedDrawing;
  latest: boolean;
  latestRevision: number;
  number: string;
  busy: boolean;
  error: string | null;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="min-w-0 space-y-3 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold tabular-nums tracking-tight">
            {number} <span className="text-base font-normal text-stone-500">R{r.revision}</span>
          </p>
          <p className="wrap-break-word text-stone-700">{r.title}</p>
          {!latest && <p className="mt-0.5 text-sm text-amber-700">An earlier revision. The latest is R{latestRevision}.</p>}
        </div>
        <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100">
          Close
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
        {r.imageUrl ? (
          <ImageWithFallback src={r.imageUrl} alt={r.kind === "pdf" ? `${number}, page 1` : `${number} ${r.title}`} className="mx-auto max-h-[60dvh] w-auto max-w-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <FileTypeTile kind={r.kind} format={r.format} className="h-32 w-40 rounded" />
            <p className="max-w-sm text-sm text-stone-600">Browsers can&rsquo;t show AutoCAD files. Download it and open it in AutoCAD or DWG TrueView.</p>
          </div>
        )}
      </div>

      <p className="text-xs text-stone-500">
        {kindLabel(r.kind, r.format, r.pageCount)} · {formatBytes(r.sizeBytes)} · uploaded {formatDate(r.createdAt)} by {r.isOwner ? "you" : r.owner.email}
        {r.kind === "pdf" && (r.pageCount ?? 0) > 1 && " · the preview shows page 1"}
      </p>
      {r.description && <p className="whitespace-pre-line text-sm text-stone-700">{r.description}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        {r.kind === "pdf" && (
          <a href={r.openUrl} target="_blank" rel="noopener noreferrer" className={button}>
            <FiExternalLink aria-hidden /> Open PDF
          </a>
        )}
        <a href={r.downloadUrl} download={downloadName(`${number} ${r.title} R${r.revision}`)} target="_blank" rel="noopener noreferrer" className={button}>
          <FiDownload aria-hidden /> Download
        </a>
        {r.isOwner && (
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 sm:ml-auto"
          >
            <FiTrash2 aria-hidden /> {busy ? "Deleting…" : `Delete R${r.revision}`}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function StepLink({ to, label, Icon }: { to: { projectId: string; section: "drawings"; item: string } | null; label: string; Icon: typeof FiChevronLeft }) {
  const cls = "flex h-11 w-11 items-center justify-center rounded-lg border border-stone-300 text-lg";
  if (!to)
    return (
      <span aria-label={label} className={`${cls} text-stone-300`}>
        <Icon aria-hidden />
      </span>
    );
  return (
    <a href={hrefFor(to)} onClick={onPlaceClick(to)} aria-label={label} title={label} className={`${cls} text-stone-700 hover:bg-stone-50`}>
      <Icon aria-hidden />
    </a>
  );
}