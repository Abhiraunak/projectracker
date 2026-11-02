"use client";

import { lazy, memo, Suspense, useDeferredValue, useMemo, useState } from "react";
import { FiInbox, FiSearch, FiUpload } from "react-icons/fi";
import { useProjectDrawings } from "@/hooks/useProjectDrawings";
import { hrefFor, onPlaceClick, useWorkspaceItem } from "@/hooks/useWorkspacePlace";
import { seriesOf } from "@/lib/drawings/numbers";
import type { ProjectDrawing } from "@/lib/drawings/projectApi";
import { FileTypeTile } from "@/components/drawing/FileTypeTile";
import { ImageWithFallback } from "@/components/drawing/ImageWithFallback";
import { EmptyState, SectionError, SectionSkeleton } from "../ui";
import { DrawingDetail } from "./drawings/DrawingDetail";

// Only downloaded when used
const UploadDrawingDialog = lazy(() => import("./drawings/UploadDrawingDialog"));
const SortDrawings = lazy(() => import("./drawings/SortDrawings"));

const SORT = "sort"; // ?i=sort: put old drawings into this project
const SEARCH_FROM = 13;

/**
 * Phase 4: the project's drawings as a grid of numbered tiles (A-1.00, A-1.01 …), grouped by series.
 * Tap a tile for the drawing and its revisions; upload a file under a number (an existing number becomes its next
 * revision). Grid → drawing → back all happen in place (?…&i=<drawing>), and the back button works.
 */
export default function DrawingsBook({ projectId }: { projectId: string }) {
  const item = useWorkspaceItem();
  const list = useProjectDrawings(projectId);
  const [uploadFor, setUploadFor] = useState<string | null>(null); // null: closed; "": new number; "A-1.00": new revision

  const dialog =
    uploadFor !== null && list.data ? (
      <Suspense fallback={null}>
        <UploadDrawingDialog projectId={projectId} existing={list.data.drawings} initialNumber={uploadFor} onClose={() => setUploadFor(null)} />
      </Suspense>
    ) : null;

  if (item === SORT)
    return (
      <Suspense fallback={<SectionSkeleton />}>
        <SortDrawings projectId={projectId} taken={list.data?.drawings ?? []} />
      </Suspense>
    );

  if (list.isPending) return <SectionSkeleton />;
  if (list.isError) return <SectionError error={list.error} onRetry={() => void list.refetch()} />;
  const { drawings, unassigned } = list.data;

  if (item) {
    const index = drawings.findIndex((d) => d.id === item);
    if (index >= 0)
      return (
        <>
          <DrawingDetail key={item} projectId={projectId} drawing={drawings[index]!} prev={drawings[index - 1] ?? null} next={drawings[index + 1] ?? null} onRevise={setUploadFor} />
          {dialog}
        </>
      );
    // A drawing that is no longer the latest (or was deleted): fall back to the grid
  }

  return (
    <>
      <Grid projectId={projectId} drawings={drawings} unassigned={unassigned} onUpload={() => setUploadFor("")} />
      {dialog}
    </>
  );
}

/* ----------------------------------- grid ----------------------------------- */

const Grid = memo(function Grid({ projectId, drawings, unassigned, onUpload }: { projectId: string; drawings: ProjectDrawing[]; unassigned: number; onUpload: () => void }) {
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search.trim().toLowerCase());

  // Grouped by series (A, S, E …); a heading only when there is more than one series
  const groups = useMemo(() => {
    const shown = query ? drawings.filter((d) => `${d.number} ${d.title}`.toLowerCase().includes(query)) : drawings;
    const map = new Map<string, ProjectDrawing[]>();
    for (const d of shown) {
      const s = seriesOf(d.number);
      map.set(s, [...(map.get(s) ?? []), d]);
    }
    return [...map.entries()];
  }, [drawings, query]);

  const sort = { projectId, section: "drawings" as const, item: SORT };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-stone-500 sm:flex-1">{drawings.length === 1 ? "1 drawing" : `${drawings.length} drawings`}</p>
        {drawings.length >= SEARCH_FROM && (
          <label className="relative block sm:w-64">
            <span className="sr-only">Find a drawing</span>
            <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Number or name"
              className="min-h-11 w-full rounded-lg border border-stone-300 pl-9 pr-3 text-sm focus:border-stone-900 focus:outline-none"
            />
          </label>
        )}
        <button
          type="button"
          onClick={onUpload}
          onPointerEnter={() => void import("./drawings/UploadDrawingDialog")}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800"
        >
          <FiUpload aria-hidden /> Upload drawing
        </button>
      </div>

      {unassigned > 0 && (
        <a
          href={hrefFor(sort)}
          onClick={onPlaceClick(sort)}
          onPointerEnter={() => void import("./drawings/SortDrawings")}
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:border-amber-300"
        >
          <FiInbox aria-hidden className="shrink-0 text-lg" />
          <span className="flex-1">
            {unassigned === 1 ? "1 older drawing isn't" : `${unassigned} older drawings aren't`} in any project yet. <b className="font-semibold">Sort them</b>
          </span>
        </a>
      )}

      {drawings.length === 0 ? (
        <EmptyState title="No drawings in this project yet" hint="Upload a drawing with its number (like A-1.00). Uploading the same number again makes a new revision." />
      ) : groups.length === 0 ? (
        <EmptyState title="No drawing matches that" hint="Try a number such as A-1 or part of the name." />
      ) : (
        groups.map(([series, list]) => (
          <section key={series} aria-label={series ? `Series ${series}` : "Drawings"}>
            {groups.length > 1 && <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{series || "Other"}</h3>}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {list.map((d) => (
                <DrawingTile key={d.id} projectId={projectId} drawing={d} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
});

/** One numbered drawing. Memoised: re-renders only when that drawing changes. */
const DrawingTile = memo(function DrawingTile({ projectId, drawing: d }: { projectId: string; drawing: ProjectDrawing }) {
  const place = { projectId, section: "drawings" as const, item: d.id };
  return (
    <li className="[content-visibility:auto] [contain-intrinsic-size:auto_200px]">
      <a
        href={hrefFor(place)}
        onClick={onPlaceClick(place)}
        className="group block overflow-hidden rounded-xl border border-stone-200 transition-colors hover:border-stone-400 focus-visible:border-stone-900 focus-visible:outline-none"
      >
        <div className="relative aspect-4/3 bg-stone-50">
          {d.thumbnailUrl ? (
            <ImageWithFallback src={d.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <FileTypeTile kind={d.kind} format={d.format} compact className="h-full w-full" />
          )}
          {d.revision > 0 && (
            <span className="absolute right-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold text-stone-700 shadow-sm">R{d.revision}</span>
          )}
        </div>
        <div className="px-3 py-2">
          <p className="font-semibold tabular-nums tracking-tight text-stone-900">{d.number}</p>
          <p className="truncate text-xs text-stone-500">{d.title}</p>
        </div>
      </a>
    </li>
  );
});
