"use client";

import { memo } from "react";
import { hrefFor, onPlaceClick } from "@/hooks/useWorkspacePlace";
import { formatDate } from "@/lib/drawings/format";
import type { ProjectDrawing } from "@/lib/drawings/projectApi";
import { FileTypeTile, kindLabel } from "@/components/drawing/FileTypeTile";
import { ImageWithFallback } from "@/components/drawing/ImageWithFallback";


/**
 * One drawing as a dark folder card: the latest revision's picture on top, a folder tab, then the name and number,
 * how many revisions it has, and when it was last updated. Tap it to open the folder (all its revisions).
 */
export const FolderTile = memo(function FolderTile({ projectId, drawing: d }: { projectId: string; drawing: ProjectDrawing }) {
  const place = { projectId, section: "drawings" as const, item: d.id };
  return (
    <li className="[content-visibility:auto] [contain-intrinsic-size:auto_240px]">
      <a
        href={hrefFor(place)}
        onClick={onPlaceClick(place)}
        aria-label={`${d.title || d.number}, ${d.number}, ${d.revisions === 1 ? "1 revision" : `${d.revisions} revisions`}, updated ${formatDate(d.createdAt)}`}
        className="group relative block overflow-hidden rounded-[20px] bg-neutral-800 p-1.5 ring-offset-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 active:scale-[0.98] motion-reduce:transition-none"
      >
        {/* the latest revision's picture */}
        <div className="relative aspect-16/10 overflow-hidden rounded-[15px] bg-neutral-700">
          {d.thumbnailUrl ? (
            <ImageWithFallback src={d.thumbnailUrl} alt="" className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100" />
          ) : (
            <FileTypeTile kind={d.kind} format={d.format} compact className="h-full w-full pb-6" />
          )}
          {d.revision > 0 && (
            <span className="absolute right-2 top-2 rounded-full border border-amber-400/60 bg-black/55 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              Rev {d.revision}
            </span>
          )}
        </div>

        {/* the folder: its tab, then the front, laid over the bottom of the picture */}
        <div className="relative -mt-8">
          <span aria-hidden className="block h-5.75 w-[58%] rounded-tl-[13px] bg-neutral-900 [clip-path:polygon(0_0,86%_0,100%_100%,0_100%)]" />
          <div className="-mt-px flex min-h-28 flex-col justify-between gap-3 rounded-b-[15px] rounded-tr-[13px] bg-neutral-900 px-3 pb-3 pt-0.5 sm:min-h-32 sm:px-3.5">
            <div className="min-w-0">
              <p className="line-clamp-2 wrap-break-word text-[15px] font-medium leading-snug text-white">{d.title || d.number}</p>
              <p className="mt-0.5 truncate text-xs text-neutral-400">
                {d.number} · {kindLabel(d.kind, d.format, null)}
              </p>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
              <p className="whitespace-nowrap text-neutral-400">
                <span className="text-2xl font-medium leading-none tabular-nums text-white">{d.revisions}</span>{" "}
                <span className="text-xs">{d.revisions === 1 ? "revision" : "revisions"}</span>
              </p>
              <p className="whitespace-nowrap sm:text-right">
                <span className="hidden text-[11px] text-neutral-400 sm:block">Updated</span>
                <span className="text-xs font-medium text-neutral-100">{formatDate(d.createdAt)}</span>
              </p>
            </div>
          </div>
        </div>
      </a>
    </li>
  );
});