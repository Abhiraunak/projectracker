"use client";

import React, { useId, useState, type ChangeEvent, type DragEvent } from "react";
import { FiUploadCloud } from "react-icons/fi";
import { ACCEPT_ATTRIBUTE } from "@/lib/drawings/validation";

/** Choose images by tapping (phone, camera or gallery) or dragging them in (desktop). It only hands the files up. */
export function DropZone({ onFiles, disabled = false }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFiles(Array.from(event.target.files ?? []));
    event.target.value = ""; // lets the same file be chosen again later
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) onFiles(Array.from(event.dataTransfer.files));
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!disabled) setDragging(true);
  };

  return (
    <label
      htmlFor={inputId}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed px-4 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-stone-900 sm:py-10 ${
        dragging ? "border-stone-900 bg-stone-50" : "border-stone-300 hover:border-stone-500 hover:bg-stone-50"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <FiUploadCloud aria-hidden className="h-8 w-8 text-stone-400" />
      <span className="text-sm font-medium">
        Tap to choose images
        <span className="hidden sm:inline"> or drag and drop them here</span>
      </span>
      <span className="text-xs text-stone-500">PNG, JPG, WebP or GIF, up to 10 MB each, 10 at a time</span>
      <input id={inputId} type="file" accept={ACCEPT_ATTRIBUTE} multiple disabled={disabled} onChange={handleChange} className="sr-only" />
    </label>
  );
}
