"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { titleFromFilename } from "@/lib/drawings/format";

export type QueueStatus = "ready" | "uploading" | "error";

export interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  status: QueueStatus;
  progress: number; // 0 to 1
  error?: string;
}

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const toQueueItem = (file: File): QueueItem => ({
  id: makeId(),
  file,
  previewUrl: URL.createObjectURL(file),
  title: titleFromFilename(file.name) || "Untitled drawing",
  status: "ready",
  progress: 0,
});

/** Holds the images waiting to be uploaded, and cleans up their preview URLs */
export function useUploadQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);

  // Preview URLs hold memory until revoked: release whatever is left when the page closes
  const latest = useRef(items);
  latest.current = items;
  useEffect(() => () => latest.current.forEach((item) => URL.revokeObjectURL(item.previewUrl)), []);

  const add = useCallback((files: File[]) => setItems((prev) => [...prev, ...files.map(toQueueItem)]), []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const patch = useCallback(
    (id: string, changes: Partial<QueueItem>) =>
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item))),
    []
  );

  const clear = useCallback(() => {
    setItems((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  }, []);

  return { items, add, remove, patch, clear };
}
