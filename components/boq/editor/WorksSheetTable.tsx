"use client";

import React, { memo, useMemo } from "react";
import { FiArrowDown, FiArrowUp, FiTrash2 } from "react-icons/fi";
import { serialNumbers, sheetTotal } from "@/lib/boq/calc";
import { newSection } from "@/lib/boq/factory";
import { fmtMoney } from "@/lib/boq/format";
import { insertSection, moveSheet, removeSheet, updateSheet } from "@/lib/boq/operations";
import type { WorksSheet } from "@/lib/boq/types";
import { EditableText } from "./cells/EditableText";
import { focusRow, useBoqEdit } from "./editContext";
import { ActionButtons } from "./rows/RowActions";
import { AddRow } from "./rows/RowActions";
import { SectionRows } from "./rows/SectionRows";

const HEADINGS = ["SOR No.", "S.No.", "Particulars", "No.", "Length", "Width", "Height", "Qty.", "Unit", "Rate", "Amount"];
// Same proportions as the workbook's columns
const WIDTHS = ["6.5rem", "3.5rem", "auto", "5rem", "5rem", "5rem", "5rem", "6rem", "4.5rem", "6.5rem", "8.5rem", "8.5rem"];

interface Props {
  sheet: WorksSheet;
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
}

/** One works sheet: its heading, then the grid of sections, items and measurements, then its TOTAL */
export const WorksSheetTable = memo(function WorksSheetTable({ sheet, isFirst, isLast, canRemove }: Props) {
  const { apply, readOnly } = useBoqEdit();
  const serials = useMemo(() => serialNumbers(sheet), [sheet]);
  const total = useMemo(() => sheetTotal(sheet), [sheet]);

  const addSection = () => {
    const fresh = newSection();
    apply((doc) => insertSection(doc, sheet.id, null, fresh));
    focusRow(fresh.id);
  };

  return (
    <section aria-label={`Works sheet: ${sheet.title || sheet.name || "untitled"}`} className="mt-10">
      <div data-grid-row data-row-id={sheet.id} className="group mb-2 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <EditableText
            value={sheet.title}
            onValue={(v) => apply((doc) => updateSheet(doc, sheet.id, { title: v }), `sheet:${sheet.id}:title`)}
            label="Works sheet heading"
            col={2}
            align="center"
            strong
            className="text-base"
            placeholder="WORKS SHEET HEADING, e.g. PART H-1 : CIVIL WORKS"
          />
        </div>
        {!readOnly && (
          <ActionButtons
            actions={[
              { label: "Move works sheet up", icon: FiArrowUp, onClick: () => apply((doc) => moveSheet(doc, sheet.id, -1)), disabled: isFirst },
              { label: "Move works sheet down", icon: FiArrowDown, onClick: () => apply((doc) => moveSheet(doc, sheet.id, 1)), disabled: isLast },
              { label: "Delete works sheet (Ctrl+Z to undo)", icon: FiTrash2, onClick: () => apply((doc) => removeSheet(doc, sheet.id)), danger: true, disabled: !canRemove },
            ]}
          />
        )}
      </div>

      {/* A wide grid, like a spreadsheet: it scrolls sideways on small screens rather than squashing */}
      <div className="overflow-x-auto rounded border border-stone-300">
        <table className="w-full min-w-[1080px] border-collapse">
          <colgroup>
            {WIDTHS.map((width, i) => (
              <col key={i} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-stone-100">
              {HEADINGS.map((heading, i) => (
                <th key={heading} scope="col" className={`border border-stone-300 px-1.5 py-2 text-xs font-semibold text-stone-700 ${i >= 3 && i !== 8 ? "text-right" : i === 8 ? "text-center" : "text-left"}`}>
                  {heading}
                </th>
              ))}
              <th scope="col" className="border border-transparent">
                <span className="sr-only">Row actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sheet.sections.map((section, i) => (
              <SectionRows key={section.id} section={section} serials={serials} isFirst={i === 0} isLast={i === sheet.sections.length - 1} />
            ))}
            <AddRow buttons={[{ label: "Section", onClick: addSection }]} />
            <tr className="bg-stone-100">
              <td colSpan={8} className="border border-stone-300" />
              <td colSpan={2} className="border border-stone-300 px-1.5 py-2 text-right text-sm font-bold">
                TOTAL
              </td>
              <td className="border border-stone-300 px-1.5 py-2 text-right text-sm font-bold tabular-nums">{fmtMoney(total)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
});
