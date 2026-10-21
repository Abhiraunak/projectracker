"use client";

import React, { memo, type ClipboardEvent, type KeyboardEvent } from "react";
import { FiArrowDown, FiArrowUp, FiPlus, FiTrash2, FiType } from "react-icons/fi";
import { isManualQty, lineQty } from "@/lib/boq/calc";
import { newMeasureLine, newTextLine } from "@/lib/boq/factory";
import { fmtQty } from "@/lib/boq/format";
import { insertLines, moveLine, pasteLines, removeLine, updateLine } from "@/lib/boq/operations";
import { isMultiCellPaste, parseClipboardRows, rowsToMeasureLines, type MeasureColumn } from "@/lib/boq/tsv";
import type { Line, MeasureLine } from "@/lib/boq/types";
import { TD } from "../cells/cellStyles";
import { Computed } from "../cells/Computed";
import { EditableNumber } from "../cells/EditableNumber";
import { EditableText } from "../cells/EditableText";
import { focusRow, useBoqEdit } from "../editContext";
import { Empty } from "./Empty";
import { RowActions } from "./RowActions";

interface Props {
  line: Line;
  partId: string;
  isFirst: boolean;
  isLast: boolean;
  /** Where the cursor goes if this line is deleted */
  neighbourId: string | null;
}

/**
 * One line of a part: a measurement (Label | No. | Length | Width | Height = Qty) or a heading line.
 * Ctrl/Cmd+Enter adds a measurement line below, Ctrl/Cmd+Shift+Enter a heading line,
 * Ctrl/Cmd+Delete (or Ctrl/Cmd+Shift+Backspace) deletes this line. Rows pasted from Excel become lines.
 */
export const LineRow = memo(function LineRow({ line, partId, isFirst, isLast, neighbourId }: Props) {
  const { apply } = useBoqEdit();

  const set = (patch: Partial<MeasureLine> | { text: string }, field: string) =>
    apply((doc) => updateLine(doc, line.id, patch), `line:${line.id}:${field}`);

  const insertBelow = (kind: "measure" | "text") => {
    const fresh = kind === "text" ? newTextLine() : newMeasureLine();
    apply((doc) => insertLines(doc, partId, line.id, [fresh]));
    focusRow(fresh.id);
  };

  const remove = () => {
    apply((doc) => removeLine(doc, line.id));
    if (neighbourId) focusRow(neighbourId);
  };

  /** Several cells pasted: they become rows, starting at the column pasted into. One value: a normal paste. */
  const pasteInto = (column: MeasureColumn) => (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text/plain");
    if (!isMultiCellPaste(text)) return;
    event.preventDefault();
    apply((doc) => pasteLines(doc, line.id, rowsToMeasureLines(parseClipboardRows(text), column)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key === "Enter") {
      event.preventDefault();
      insertBelow(event.shiftKey ? "text" : "measure");
    } else if (event.key === "Delete" || (event.shiftKey && event.key === "Backspace")) {
      event.preventDefault();
      remove();
    }
  };

  const actions = [
    { label: "Add a measurement line below (Ctrl+Enter)", icon: FiPlus, onClick: () => insertBelow("measure") },
    { label: "Add a heading line below (Ctrl+Shift+Enter)", icon: FiType, onClick: () => insertBelow("text") },
    { label: "Move up", icon: FiArrowUp, onClick: () => apply((doc) => moveLine(doc, line.id, -1)), disabled: isFirst },
    { label: "Move down", icon: FiArrowDown, onClick: () => apply((doc) => moveLine(doc, line.id, 1)), disabled: isLast },
    { label: "Delete line (Ctrl+Delete)", icon: FiTrash2, onClick: remove, danger: true },
  ];

  if (line.kind === "text") {
    return (
      <tr data-grid-row data-row-id={line.id} onKeyDown={onKeyDown} className="group">
        <Empty count={2} />
        <td className={TD} colSpan={9}>
          <EditableText value={line.text} onValue={(v) => set({ text: v }, "text")} label="Heading line" col={2} strong placeholder="Heading, e.g. For Foundation" />
        </td>
        <RowActions actions={actions} />
      </tr>
    );
  }

  const manual = isManualQty(line);
  return (
    <tr data-grid-row data-row-id={line.id} onKeyDown={onKeyDown} className="group">
      <Empty count={2} />
      <td className={TD}>
        <EditableText value={line.label} onValue={(v) => set({ label: v }, "label")} label="Measurement" col={2} placeholder="e.g. CF6" onPaste={pasteInto("label")} />
      </td>
      <td className={TD}>
        <EditableNumber value={line.no} onValue={(v) => set({ no: v }, "no")} label="No." col={3} onPaste={pasteInto("no")} />
      </td>
      <td className={TD}>
        <EditableNumber value={line.length} onValue={(v) => set({ length: v }, "length")} label="Length" col={4} onPaste={pasteInto("length")} />
      </td>
      <td className={TD}>
        <EditableNumber value={line.width} onValue={(v) => set({ width: v }, "width")} label="Width" col={5} onPaste={pasteInto("width")} />
      </td>
      <td className={TD}>
        <EditableNumber value={line.height} onValue={(v) => set({ height: v }, "height")} label="Height" col={6} onPaste={pasteInto("height")} />
      </td>
      <td className={TD}>
        {manual ? (
          <EditableNumber value={line.qty} onValue={(v) => set({ qty: v }, "qty")} label="Quantity (typed, no dimensions)" col={7} placeholder="qty" onPaste={pasteInto("qty")} />
        ) : (
          <Computed title="No. × Length × Width × Height">{fmtQty(lineQty(line))}</Computed>
        )}
      </td>
      <Empty count={3} />
      <RowActions actions={actions} />
    </tr>
  );
});
