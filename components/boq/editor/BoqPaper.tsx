"use client";

import React, { useRef } from "react";
import type { BoqTotals } from "@/lib/boq/calc";
import { newSheet } from "@/lib/boq/factory";
import { insertSheet } from "@/lib/boq/operations";
import type { BoqDocument } from "@/lib/boq/types";
import { useGridNavigation } from "@/hooks/useGridNavigation";
import { DocumentHeader } from "./DocumentHeader";
import { focusRow, useBoqEdit } from "./editContext";
import { SignatureBlock } from "./SignatureBlock";
import { SummaryOfPrices } from "./SummaryOfPrices";
import { WorksSheetTable } from "./WorksSheetTable";

/** The BOQ as a page you type on directly: header, summary of prices, signatures, then each works sheet */
export function BoqPaper({ doc, totals }: { doc: BoqDocument; totals: BoqTotals }) {
  const { apply, readOnly } = useBoqEdit();
  const grid = useRef<HTMLDivElement>(null);
  useGridNavigation(grid);

  const addSheet = () => {
    const fresh = newSheet("NEW WORKS");
    apply((d) => insertSheet(d, null, fresh));
    focusRow(fresh.id);
  };

  return (
    <div ref={grid} className="rounded border border-stone-300 bg-white px-3 py-6 sm:px-8 sm:py-10">
      <DocumentHeader doc={doc} />
      <SummaryOfPrices totals={totals} />
      <SignatureBlock signatures={doc.signatures} />
      {doc.sheets.map((sheet, i) => (
        <WorksSheetTable key={sheet.id} sheet={sheet} isFirst={i === 0} isLast={i === doc.sheets.length - 1} canRemove={doc.sheets.length > 1} />
      ))}
      {!readOnly && (
        <button
          type="button"
          onClick={addSheet}
          className="mt-6 w-full rounded border border-dashed border-stone-300 py-3 text-sm font-medium text-stone-600 transition-colors hover:border-stone-500 hover:bg-stone-50 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          + Add a works sheet (for example Electrical, Plumbing)
        </button>
      )}
    </div>
  );
}
