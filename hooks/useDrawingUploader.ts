"use client";

import { useCallback, useState } from "react";
import { describeError } from "@/lib/api";
import { pickValidFiles } from "@/lib/drawings/validation";
import { useUploadDrawing } from "./useDrawings";
import { useUploadQueue, type QueueItem } from "./useUploadQueue";

export interface SharedUploadFields {
  description: string;
  sharedWith: string[];
}

/** Runs the queue: checks files as they are added, uploads them one after another, reports the outcome */
export function useDrawingUploader() {
  const queue = useUploadQueue();
  const upload = useUploadDrawing();
  const [problems, setProblems] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = useCallback(
    (files: File[]) => {
      const { valid, errors } = pickValidFiles(files, queue.items.length);
      setProblems(errors);
      setSummary(null);
      queue.add(valid);
    },
    [queue]
  );

  const uploadOne = async (item: QueueItem, fields: SharedUploadFields): Promise<boolean> => {
    queue.patch(item.id, { status: "uploading", progress: 0, error: undefined });
    try {
      await upload.mutateAsync({
        input: {
          file: item.file,
          title: item.title.trim() || "Untitled drawing",
          description: fields.description.trim(),
          sharedWith: fields.sharedWith,
        },
        onProgress: (fraction) => queue.patch(item.id, { progress: fraction }),
      });
      queue.remove(item.id); // finished images leave the queue
      return true;
    } catch (error) {
      queue.patch(item.id, { status: "error", error: describeError(error) });
      return false;
    }
  };

  const describeOutcome = (done: number, failed: number) => {
    const uploaded = `${done} ${done === 1 ? "drawing" : "drawings"} uploaded.`;
    return failed === 0 ? uploaded : `${uploaded} ${failed} failed. Fix the problem and try again.`;
  };

  const submit = async (fields: SharedUploadFields) => {
    setIsUploading(true);
    setSummary(null);

    let done = 0;
    let failed = 0;
    for (const item of queue.items) {
      if (await uploadOne(item, fields)) done++;
      else failed++;
    }

    setIsUploading(false);
    setSummary(describeOutcome(done, failed));
    return { done, failed };
  };

  const clearAll = useCallback(() => {
    queue.clear();
    setProblems([]);
    setSummary(null);
  }, [queue]);

  return {
    items: queue.items,
    problems,
    summary,
    isUploading,
    addFiles,
    updateTitle: (id: string, title: string) => queue.patch(id, { title }),
    removeItem: queue.remove,
    clearAll,
    submit,
  };
}
