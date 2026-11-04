"use client";

import React, { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { BoqTotals } from "@/lib/boq/calc";
import type { BoqDocument } from "@/lib/boq/types";
import { PRINT_CSS } from "./printStyles";
import { PrintHeader } from "./PrintHeader";
import { PrintSummary } from "./PrintSummary";
import { PrintWorksSheet } from "./PrintWorksSheet";

/** True in the browser, false while rendering on the server (document.body only exists in the browser) */
const noSubscription = () => () => {};
const useIsBrowser = () => useSyncExternalStore(noSubscription, () => true, () => false);

/** The printable BOQ: hidden on screen, the only thing on paper (see printStyles.ts) */
export function BoqPrintView({ doc, totals }: { doc: BoqDocument; totals: BoqTotals }) {
  const mounted = useIsBrowser();
  if (!mounted) return null;

  return (
    <>
      <style>{PRINT_CSS}</style>
      {createPortal(
        <div id="boq-print-root" className="hidden">
          <PrintHeader doc={doc} />
          <PrintSummary doc={doc} totals={totals} />
          {doc.sheets.map((sheet) => (
            <PrintWorksSheet key={sheet.id} sheet={sheet} />
          ))}
        </div>,
        document.body
      )}
    </>
  );
}