"use client";

import { memo, useEffect, useState } from "react";
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiDownload, FiExternalLink, FiUpload } from "react-icons/fi";
import { useDrawingRevisions } from "@/hooks/useProjectDrawings";
import { goTo, hrefFor, onPlaceClick } from "@/hooks/useWorkspacePlace";
import { downloadName, formatBytes, formatDate } from "@/lib/drawings/format";
import type { NumberedDrawing, ProjectDrawing } from "@/lib/drawings/projectApi";
import { ImageWithFallback } from "@/components/drawing/ImageWithFallback";
import { FileTypeTile, kindLabel } from "@/components/drawing/FileTypeTile";


const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50";

/**
 * One drawing in the page (not a pop-up): the latest revision large, the earlier revisions to switch to, and the
 * previous and next numbers. The ← and → keys move between numbers.
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
  const [shownId, setShownId] = useState(drawing.id);
  const shown: NumberedDrawing = (shownId !== drawing.id && history.data?.revisions.find((r) => r.id === shownId)) || drawing;
  const place = (d: ProjectDrawing | null) => (d ? { projectId, section: "drawings" as const, item: d.id } : null);
  const grid = { projectId, section: "drawings" as const, item: null };

  // Arrow keys move between drawings (not while typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowLeft" && prev) goTo(place(prev)!);
      if (e.key === "ArrowRight" && next) goTo(place(next)!);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- place() only reads projectId, which is in the list
  }, [prev, next, projectId]);

  const isOld = shown.id !== drawing.id;

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

      <div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">
          {drawing.number} <span className="text-base font-normal text-stone-500">R{shown.revision}</span>
        </p>
        <p className="text-stone-700">{shown.title}</p>
        {isOld && <p className="mt-1 text-sm text-amber-700">You are looking at an earlier revision. The latest is R{drawing.revision}.</p>}
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
        {shown.imageUrl ? (
          <ImageWithFallback
            src={shown.imageUrl}
            alt={shown.kind === "pdf" ? `${drawing.number}, page 1` : `${drawing.number} ${shown.title}`}
            className="mx-auto max-h-[65dvh] w-auto max-w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <FileTypeTile kind={shown.kind} format={shown.format} className="h-32 w-40 rounded" />
            <p className="max-w-sm text-sm text-stone-600">Browsers can&rsquo;t show AutoCAD files. Download it and open it in AutoCAD or DWG TrueView.</p>
          </div>
        )}
      </div>

      <p className="text-xs text-stone-500">
        {kindLabel(shown.kind, shown.format, shown.pageCount)} · {formatBytes(shown.sizeBytes)} · uploaded {formatDate(shown.createdAt)} by {shown.isOwner ? "you" : shown.owner.email}
        {shown.kind === "pdf" && (shown.pageCount ?? 0) > 1 && " · the preview shows page 1"}
      </p>
      {shown.description && <p className="whitespace-pre-line text-sm text-stone-700">{shown.description}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        {shown.kind === "pdf" && (
          <a href={shown.openUrl} target="_blank" rel="noopener noreferrer" className={button}>
            <FiExternalLink aria-hidden /> Open PDF
          </a>
        )}
        <a href={shown.downloadUrl} download={downloadName(`${drawing.number} ${shown.title} R${shown.revision}`)} target="_blank" rel="noopener noreferrer" className={button}>
          <FiDownload aria-hidden /> Download
        </a>
        <button type="button" onClick={() => onRevise(drawing.number)} className={button}>
          <FiUpload aria-hidden /> Upload new revision
        </button>
      </div>

      {drawing.revisions > 1 && (
        <section aria-labelledby="revisions-title" className="rounded-xl border border-stone-200">
          <h3 id="revisions-title" className="border-b border-stone-200 px-4 py-2.5 text-sm font-semibold">
            Revisions <span className="font-normal text-stone-500">· {drawing.revisions}</span>
          </h3>
          {history.isPending ? (
            <p className="px-4 py-3 text-sm text-stone-500">Loading…</p>
          ) : history.isError ? (
            <p className="px-4 py-3 text-sm text-red-700">Couldn&rsquo;t load the earlier revisions.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {history.data.revisions.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setShownId(r.id)}
                    aria-pressed={r.id === shown.id}
                    className={`flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm hover:bg-stone-50 ${r.id === shown.id ? "bg-orange-50" : ""}`}
                  >
                    <span className="w-9 font-semibold tabular-nums">R{r.revision}</span>
                    <span className="min-w-0 flex-1 truncate">{r.title}</span>
                    <span className="shrink-0 text-xs text-stone-500">
                      {formatDate(r.createdAt)}
                      {r.id === drawing.id && " · latest"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
});

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
