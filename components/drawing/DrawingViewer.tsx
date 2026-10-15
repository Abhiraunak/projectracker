"use client";

import React, { useEffect } from "react";
import { FiChevronLeft, FiChevronRight, FiDownload, FiShare2 } from "react-icons/fi";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { downloadName, formatBytes, formatDate } from "@/lib/drawings/format";
import type { Drawing } from "@/lib/drawings/types";
import { Avatar } from "./Avatar";
import { ImageWithFallback } from "./ImageWithFallback";
import { buttonSecondary, focusRing } from "./styles";

interface DrawingViewerProps {
  drawing: Drawing | null;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onShare: (id: string) => void;
}

/** Big view of one drawing, with previous/next, download and (for the owner) share */
export function DrawingViewer({ drawing, ...rest }: DrawingViewerProps) {
  return (
    <ModalDialog open={!!drawing} onClose={rest.onClose} label="Drawing viewer" size="xl">
      {drawing && <ViewerBody drawing={drawing} {...rest} />}
    </ModalDialog>
  );
}

function useArrowKeys(onPrev: () => void, onNext: () => void, hasPrev: boolean, hasNext: boolean) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && hasPrev) onPrev();
      if (event.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onPrev, onNext, hasPrev, hasNext]);
}

function NavButton({ side, onClick, label }: { side: "left" | "right"; onClick: () => void; label: string }) {
  const Icon = side === "left" ? FiChevronLeft : FiChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full border border-stone-300 bg-white/90 p-2.5 text-stone-700 hover:bg-white ${focusRing} ${side === "left" ? "left-2" : "right-2"}`}
    >
      <Icon aria-hidden className="h-5 w-5" />
    </button>
  );
}

function ViewerBody({ drawing, hasPrev, hasNext, onPrev, onNext, onClose, onShare }: DrawingViewerProps & { drawing: Drawing }) {
  useArrowKeys(onPrev, onNext, hasPrev, hasNext);

  return (
    <div>
      <DialogHeader title={drawing.title} subtitle={`${drawing.isOwner ? "Uploaded by you" : `From ${drawing.owner.email}`} on ${formatDate(drawing.createdAt)}`} onClose={onClose} />

      <div className="relative bg-stone-100">
        <ImageWithFallback src={drawing.imageUrl} alt={drawing.title} className="mx-auto max-h-[55dvh] w-auto max-w-full object-contain sm:max-h-[65dvh]" />
        {hasPrev && <NavButton side="left" onClick={onPrev} label="Previous drawing" />}
        {hasNext && <NavButton side="right" onClick={onNext} label="Next drawing" />}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {drawing.description && <p className="whitespace-pre-line text-sm text-stone-700">{drawing.description}</p>}
        <p className="text-xs text-stone-500">{formatBytes(drawing.sizeBytes)}</p>

        {drawing.isOwner && drawing.sharedWith.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-stone-500">Shared with</p>
            <ul className="flex flex-wrap gap-2">
              {drawing.sharedWith.map((user) => (
                <li key={user.id} className="flex items-center gap-1.5 rounded bg-stone-100 py-1 pl-1.5 pr-2 text-xs text-stone-700">
                  <Avatar user={user} size="sm" />
                  <span className="max-w-48 truncate">{user.email}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <a href={drawing.downloadUrl} download={downloadName(drawing.title)} target="_blank" rel="noopener noreferrer" className={buttonSecondary}>
            <FiDownload aria-hidden /> Download
          </a>
          {drawing.isOwner && (
            <button type="button" onClick={() => onShare(drawing.id)} className={buttonSecondary}>
              <FiShare2 aria-hidden /> Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
