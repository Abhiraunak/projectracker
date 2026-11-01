"use client";

import { memo, useMemo, useState } from "react";
import { FiArrowLeft, FiCheck } from "react-icons/fi";
import { usePlaceDrawing, useUnassignedDrawings } from "@/hooks/useProjectDrawings";
import { hrefFor, onPlaceClick } from "@/hooks/useWorkspacePlace";
import { describeError } from "@/lib/api";
import { formatDate } from "@/lib/drawings/format";
import { normalizeNumber } from "@/lib/drawings/numbers";
import type { NumberedDrawing, ProjectDrawing } from "@/lib/drawings/projectApi";
import { FileTypeTile } from "@/components/drawing/FileTypeTile";
import { ImageWithFallback } from "@/components/drawing/ImageWithFallback";
import { EmptyState, SectionError, SectionSkeleton } from "../../ui";

/**
 * The one-time sort: drawings uploaded before Phase 4 aren't in any project. Give each one that belongs here a
 * number and it moves into this project; leave the rest for their own projects. Until then they stay where they
 * were, visible to the people they were shared with.
 */
export default function SortDrawings({ projectId, taken }: { projectId: string; taken: ProjectDrawing[] }) {
  const list = useUnassignedDrawings();
  const used = useMemo(() => new Set(taken.map((d) => d.number)), [taken]);
  const back = { projectId, section: "drawings" as const, item: null };

  return (
    <div className="space-y-4">
      <a href={hrefFor(back)} onClick={onPlaceClick(back)} className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900">
        <FiArrowLeft aria-hidden /> Drawings
      </a>
      <div>
        <h2 className="text-lg font-semibold">Sort older drawings</h2>
        <p className="text-sm text-stone-500">Give a number to each drawing that belongs to this project. Leave the others for their own projects.</p>
      </div>

      {list.isPending ? (
        <SectionSkeleton />
      ) : list.isError ? (
        <SectionError error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.drawings.length === 0 ? (
        <EmptyState title="All sorted" hint="Every drawing is in a project." />
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
          {list.data.drawings.map((d) => (
            <SortRow key={d.id} projectId={projectId} drawing={d} used={used} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** One drawing: its own number box and button, so typing in one row re-renders only that row */
const SortRow = memo(function SortRow({ projectId, drawing: d, used }: { projectId: string; drawing: NumberedDrawing; used: Set<string> }) {
  const [number, setNumber] = useState("");
  const place = usePlaceDrawing(projectId);
  const clean = normalizeNumber(number);
  const clash = clean !== null && used.has(clean);

  return (
    <li className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-stone-50">
          {d.thumbnailUrl ? <ImageWithFallback src={d.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <FileTypeTile kind={d.kind} format={d.format} compact className="h-full w-full" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{d.title}</p>
          <p className="truncate text-xs text-stone-500">
            {d.isOwner ? "You" : d.owner.email} · {formatDate(d.createdAt)}
          </p>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (clean && !clash) place.mutate({ drawingId: d.id, number: clean });
        }}
        className="flex items-start gap-2"
      >
        <label className="flex-1 sm:w-32 sm:flex-none">
          <span className="sr-only">Number for {d.title}</span>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="e.g. A-1.00"
            maxLength={24}
            disabled={place.isPending}
            className="min-h-11 w-full rounded-lg border border-stone-300 px-3 text-sm font-semibold uppercase tabular-nums placeholder:font-normal placeholder:normal-case focus:border-stone-900 focus:outline-none"
          />
          {(clash || place.isError) && (
            <span role="alert" className="mt-1 block text-xs text-red-700">
              {clash ? `${clean} is already used here` : describeError(place.error)}
            </span>
          )}
        </label>
        <button
          type="submit"
          disabled={!clean || clash || place.isPending}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-stone-900 px-3 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-40"
        >
          <FiCheck aria-hidden /> {place.isPending ? "Adding…" : "Add here"}
        </button>
      </form>
    </li>
  );
});
