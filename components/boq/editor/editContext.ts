"use client";

import { createContext, useContext } from "react";
import type { BoqDocument } from "@/lib/boq/types";

export interface BoqEditApi {
  readOnly: boolean;
  /** Change the document. Edits with the same key in quick succession are one undo step. */
  apply: (update: (doc: BoqDocument) => BoqDocument, key?: string) => void;
}

const BoqEditContext = createContext<BoqEditApi | null>(null);

/** Given once by the editor, so every row can make its own edits without passing callbacks down */
export const BoqEditProvider = BoqEditContext.Provider;

export function useBoqEdit(): BoqEditApi {
  const api = useContext(BoqEditContext);
  if (!api) throw new Error("useBoqEdit must be used inside BoqEditProvider");
  return api;
}

/** Puts the cursor in the first cell of a row (after inserting it, or after deleting the one before) */
export function focusRow(rowId: string) {
  requestAnimationFrame(() => {
    const cell = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-row-id="${CSS.escape(rowId)}"] [data-cell]`);
    cell?.focus();
    cell?.select();
  });
}
