"use client";

import React from "react";
import { FiAlertCircle, FiX } from "react-icons/fi";
import { formatBytes } from "@/lib/drawings/format";
import type { QueueItem } from "@/hooks/useUploadQueue";
import { FileTypeTile } from "./FileTypeTile";
import { iconButton, inputBase } from "./styles";

interface UploadQueueListProps {
  items: QueueItem[];
  disabled: boolean;
  onTitleChange: (id: string, title: string) => void;
  onRemove: (id: string) => void;
}

/** The files waiting to upload: a preview, an editable title, and the upload progress or error for each */
export function UploadQueueList({ items, disabled, onTitleChange, onRemove }: UploadQueueListProps) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3 rounded border border-stone-300 p-3">
          {item.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.previewUrl} alt="" className="h-16 w-16 shrink-0 rounded bg-stone-100 object-cover" />
          ) : (
            <FileTypeTile kind={item.kind} format={item.format} compact className="h-16 w-16 shrink-0 rounded" />
          )}

          <div className="min-w-0 flex-1 space-y-1.5">
            <input
              type="text"
              aria-label={`Title for ${item.file.name}`}
              value={item.title}
              maxLength={120}
              disabled={disabled}
              onChange={(event) => onTitleChange(item.id, event.target.value)}
              className={inputBase}
            />
            <QueueItemStatus item={item} />
          </div>

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={item.status === "uploading"}
            aria-label={`Remove ${item.file.name}`}
            className={`${iconButton} self-start`}
          >
            <FiX aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

function QueueItemStatus({ item }: { item: QueueItem }) {
  if (item.status === "uploading") {
    const percent = Math.round(item.progress * 100);
    return (
      <div>
        <div role="progressbar" aria-label={`Uploading ${item.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 overflow-hidden rounded bg-stone-200">
          <div className="h-full bg-stone-900 transition-[width] motion-reduce:transition-none" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1 text-xs text-stone-500">Uploading {percent}%</p>
      </div>
    );
  }

  if (item.status === "error") {
    return (
      <p role="alert" className="flex items-start gap-1 text-xs text-red-700">
        <FiAlertCircle aria-hidden className="mt-0.5 shrink-0" /> {item.error}
      </p>
    );
  }

  return <p className="truncate text-xs text-stone-500">{item.file.name} ({formatBytes(item.file.size)})</p>;
}
