"use client";

import React from "react";
import type { BoqEditorState } from "@/hooks/useBoqEditor";

const BUTTON = "rounded border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";

/** The messages that can appear above the page: final (locked), a save conflict, or a failed action */
export function EditorBanners({ editor }: { editor: BoqEditorState }) {
  return (
    <>
      {editor.conflict && (
        <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Someone else saved this BOQ while you were editing</p>
          <p className="mt-1">Your latest changes aren&rsquo;t saved. Choose which version to keep.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => editor.resolveConflict("theirs")} className={`${BUTTON} border-red-300 bg-white hover:bg-red-100`}>
              Load their version
            </button>
            <button type="button" onClick={() => editor.resolveConflict("mine")} className={`${BUTTON} border-red-700 bg-red-700 text-white hover:bg-red-800`}>
              Keep mine (save over theirs)
            </button>
          </div>
        </div>
      )}

      {editor.status === "FINAL" && !editor.conflict && (
        <div className="flex flex-col gap-2 rounded border border-stone-300 bg-stone-50 p-4 text-sm text-stone-700 sm:flex-row sm:items-center sm:justify-between">
          <p>This BOQ is final, so it can&rsquo;t be edited. You can still print it or export it to Excel.</p>
          <button type="button" onClick={editor.reopen} className={`${BUTTON} border-stone-300 bg-white hover:bg-stone-100`}>
            Reopen as draft
          </button>
        </div>
      )}

      {editor.actionError && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {editor.actionError}
        </p>
      )}
    </>
  );
}
