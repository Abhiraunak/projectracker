"use client";

import React, { useMemo, useState } from "react";
import { boqTotals } from "@/lib/boq/calc";
import { exportBoqToExcel } from "@/lib/boq/exportExcel";
import type { BoqRecord } from "@/lib/boq/types";
import { useBoqEditor } from "@/hooks/useBoqEditor";
import { BoqPrintView } from "../print/BoqPrintView";
import { BoqPaper } from "./BoqPaper";
import { BoqEditProvider } from "./editContext";
import { EditorBanners } from "./EditorBanners";
import { EditorToolbar } from "./EditorToolbar";

/** The BOQ editor: toolbar, banners, the page you type on, and the print copy */
export function BoqEditor({ record }: { record: BoqRecord }) {
  const editor = useBoqEditor(record);
  const totals = useMemo(() => boqTotals(editor.doc), [editor.doc]);
  const editApi = useMemo(() => ({ readOnly: editor.readOnly, apply: editor.apply }), [editor.readOnly, editor.apply]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportExcel = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await exportBoqToExcel(editor.doc);
    } catch {
      setExportError("Couldn't create the Excel file. Try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <BoqEditProvider value={editApi}>
      <div className="space-y-4">
        <EditorToolbar boqId={record.id} editor={editor} onPrint={() => window.print()} onExport={exportExcel} exporting={exporting} />
        <EditorBanners editor={editor} />
        {exportError && (
          <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {exportError}
          </p>
        )}
        <BoqPaper doc={editor.doc} totals={totals} />
      </div>
      <BoqPrintView doc={editor.doc} totals={totals} />
    </BoqEditProvider>
  );
}
