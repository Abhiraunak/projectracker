import React from "react";
import { FiFileText, FiImage, FiLayers } from "react-icons/fi";
import type { DrawingKind } from "@/lib/drawings/types";

const LOOK: Record<DrawingKind, { Icon: typeof FiFileText; label: string; tone: string }> = {
  image: { Icon: FiImage, label: "Image", tone: "bg-stone-100 text-stone-500" },
  pdf: { Icon: FiFileText, label: "PDF", tone: "bg-red-50 text-red-700" },
  cad: { Icon: FiLayers, label: "AutoCAD drawing", tone: "bg-sky-50 text-sky-800" },
};

/** Stands in for a picture when there is none (AutoCAD files), or before a PDF has a preview */
export function FileTypeTile({ kind, format, compact = false, className = "" }: { kind: DrawingKind; format: string; compact?: boolean; className?: string }) {
  const { Icon, label, tone } = LOOK[kind];
  return (
    <div role="img" aria-label={`${label} (${format.toUpperCase()})`} className={`flex flex-col items-center justify-center gap-1 ${tone} ${className}`}>
      <Icon aria-hidden className={compact ? "h-5 w-5" : "h-10 w-10"} />
      <span className={`font-semibold tracking-wide ${compact ? "text-[10px]" : "text-sm"}`}>{format.toUpperCase()}</span>
      {!compact && <span className="text-xs opacity-80">{label}</span>}
    </div>
  );
}

/** "PDF · 4 pages", "AutoCAD DWG", "PNG image": the small label on cards and in the viewer */
export function kindLabel(kind: DrawingKind, format: string, pageCount: number | null): string {
  const f = format.toUpperCase();
  if (kind === "pdf") return pageCount ? `PDF · ${pageCount} ${pageCount === 1 ? "page" : "pages"}` : "PDF";
  if (kind === "cad") return `AutoCAD ${f}`;
  return `${f} image`;
}
