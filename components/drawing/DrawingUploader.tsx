"use client";

import React, { useState } from "react";
import { FiUpload } from "react-icons/fi";
import { useDrawingUploader } from "@/hooks/useDrawingUploader";
import type { AppUser } from "@/lib/drawings/types";
import { UploadQueueList } from "./UploadQueueList";
import { UserPicker } from "./UserPicker";
import { buttonPrimary, buttonSecondary, inputBase } from "./styles";
import { DropZone } from "./DropZone";

/** The top of the page: choose images, name them, optionally share them, upload */
export function DrawingUploader() {
  const uploader = useDrawingUploader();
  const [description, setDescription] = useState("");
  const [shareWith, setShareWith] = useState<AppUser[]>([]);

  const count = uploader.items.length;
  const hasItems = count > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasItems || uploader.isUploading) return;

    const { failed } = await uploader.submit({ description, sharedWith: shareWith.map((user) => user.id) });
    if (failed === 0) {
      setDescription("");
      setShareWith([]);
    }
  };

  return (
    <section aria-label="Upload drawings" className="rounded border border-stone-300 p-4 sm:p-6">
      <h2 className="text-base font-semibold">Upload drawings</h2>
      <p className="mb-4 mt-1 text-sm text-stone-500">Add images, then choose who can see them.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <DropZone onFiles={uploader.addFiles} disabled={uploader.isUploading} />

        {uploader.problems.length > 0 && (
          <ul role="alert" className="space-y-1 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {uploader.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}

        {hasItems && (
          <>
            <UploadQueueList items={uploader.items} disabled={uploader.isUploading} onTitleChange={uploader.updateTitle} onRemove={uploader.removeItem} />

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="drawing-note" className="mb-1.5 block text-sm text-stone-500">
                  Note (optional, applies to all)
                </label>
                <textarea
                  id="drawing-note"
                  rows={4}
                  maxLength={500}
                  value={description}
                  disabled={uploader.isUploading}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="e.g. Revision 2, approved by structural engineer"
                  className={`${inputBase} resize-y`}
                />
              </div>
              <UserPicker selected={shareWith} onChange={setShareWith} disabled={uploader.isUploading} />
            </div>
          </>
        )}

        {uploader.summary && (
          <p role="status" className="rounded border border-stone-300 bg-stone-50 p-3 text-sm text-stone-700">
            {uploader.summary}
          </p>
        )}

        {hasItems && (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={uploader.clearAll} disabled={uploader.isUploading} className={buttonSecondary}>
              Clear
            </button>
            <button type="submit" disabled={uploader.isUploading} className={buttonPrimary}>
              <FiUpload aria-hidden />
              {uploader.isUploading ? "Uploading…" : `Upload ${count} ${count === 1 ? "drawing" : "drawings"}`}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
