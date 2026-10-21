import type { DrawingKind } from "./types";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // PDF and AutoCAD files are often bigger
export const MAX_FILES_PER_UPLOAD = 10;

/**
 * What can be uploaded, by file extension. The extension decides, not the browser's file type: browsers report
 * AutoCAD files inconsistently (often as nothing at all). SVG is left out on purpose: it can carry scripts.
 * The server checks the actual contents again.
 */
const KIND_BY_EXTENSION: Record<string, DrawingKind> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  gif: "image",
  pdf: "pdf",
  dwg: "cad",
  dxf: "cad",
  dwf: "cad",
};

const MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

/** For the file picker: extensions (so AutoCAD files show up) and types (so phones offer the gallery and camera) */
export const ACCEPT_ATTRIBUTE = [...Object.keys(KIND_BY_EXTENSION).map((ext) => `.${ext}`), ...MIME_TYPES].join(",");

export const ACCEPTED_SUMMARY = "Images (PNG, JPG, WebP, GIF), PDF, or AutoCAD (DWG, DXF, DWF)";

export const extensionOf = (name: string) => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";

export const fileKind = (file: File): DrawingKind | null => KIND_BY_EXTENSION[extensionOf(file.name)] ?? null;

const mb = (bytes: number) => `${bytes / 1024 / 1024} MB`;

/** Returns a message if the file can't be uploaded, otherwise null. (Quick feedback only: the server checks again.) */
export function validateDrawingFile(file: File): string | null {
  const kind = fileKind(file);
  if (!kind) return `${file.name}: use ${ACCEPTED_SUMMARY}.`;
  if (file.size === 0) return `${file.name}: the file is empty.`;
  const limit = kind === "image" ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
  if (file.size > limit) return `${file.name}: larger than ${mb(limit)}${kind === "image" ? " (images)" : ""}.`;
  return null;
}

/** @deprecated the old name, kept so existing imports compile */
export const validateImage = validateDrawingFile;

/** Splits chosen files into the ones to queue and the problems to show */
export function pickValidFiles(files: File[], alreadyQueued: number) {
  const valid: File[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const problem = validateDrawingFile(file);
    if (problem) {
      errors.push(problem);
    } else if (alreadyQueued + valid.length >= MAX_FILES_PER_UPLOAD) {
      errors.push(`You can upload up to ${MAX_FILES_PER_UPLOAD} files at a time.`);
      break;
    } else {
      valid.push(file);
    }
  }
  return { valid, errors };
}
