"use client";

import React, { memo } from "react";
import { FiDownload, FiShare2, FiTrash2 } from "react-icons/fi";
import { downloadName, formatDate } from "@/lib/drawings/format";
import type { Drawing } from "@/lib/drawings/types";
import { FileTypeTile, kindLabel } from "./FileTypeTile";
import { ImageWithFallback } from "./ImageWithFallback";
import { focusRing, iconButton } from "./styles";

interface DrawingCardProps {
  drawing: Drawing;
  onOpen: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
}

function ShareBadge({ drawing }: { drawing: Drawing }) {
  if (!drawing.isOwner) {
    return <span className="inline-block rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">Shared with you</span>;
  }
  const count = drawing.sharedWith.length;
  return (
    <span className="inline-block rounded bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600">
      {count === 0 ? "Only you" : `Shared with ${count} ${count === 1 ? "person" : "people"}`}
    </span>
  );
}

/** One drawing in the grid: picture, who and when, and its actions */
export const DrawingCard = memo(function DrawingCard({ drawing, onOpen, onShare, onDelete }: DrawingCardProps) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded border border-stone-300">
      <button type="button" onClick={() => onOpen(drawing.id)} aria-label={`Open ${drawing.title}`} className={`block aspect-[4/3] w-full bg-stone-100 ${focusRing}`}>
        {drawing.thumbnailUrl ? (
          <ImageWithFallback src={drawing.thumbnailUrl} alt={drawing.title} className={`h-full w-full ${drawing.kind === "pdf" ? "object-contain bg-white" : "object-cover"}`} />
        ) : (
          <FileTypeTile kind={drawing.kind} format={drawing.format} className="h-full w-full" />
        )}
      </button>

      <div className="flex-1 space-y-2 p-4">
        <h3 className="truncate text-base font-semibold" title={drawing.title}>
          {drawing.title}
        </h3>
        <p className="truncate text-xs text-stone-500">
          {drawing.isOwner ? "Uploaded by you" : `From ${drawing.owner.email}`} on {formatDate(drawing.createdAt)}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-block rounded border border-stone-200 px-2 py-1 text-xs text-stone-600">{kindLabel(drawing.kind, drawing.format, drawing.pageCount)}</span>
          <ShareBadge drawing={drawing} />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-stone-200 px-2 py-1">
        <a href={drawing.downloadUrl} download={downloadName(drawing.title)} target="_blank" rel="noopener noreferrer" aria-label={`Download ${drawing.title}`} className={iconButton}>
          <FiDownload aria-hidden className="h-5 w-5" />
        </a>
        {drawing.isOwner && (
          <span className="flex">
            <button type="button" onClick={() => onShare(drawing.id)} aria-label={`Share ${drawing.title}`} className={iconButton}>
              <FiShare2 aria-hidden className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => onDelete(drawing.id)} aria-label={`Delete ${drawing.title}`} className={`${iconButton} hover:bg-red-50 hover:text-red-600`}>
              <FiTrash2 aria-hidden className="h-5 w-5" />
            </button>
          </span>
        )}
      </div>
    </article>
  );
});
