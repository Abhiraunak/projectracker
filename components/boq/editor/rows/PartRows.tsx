"use client";

import React, { memo, useState } from "react";
import { FiArrowDown, FiArrowUp, FiCopy, FiPlus, FiTag, FiTrash2, FiType } from "react-icons/fi";
import { partAmount, partQty } from "@/lib/boq/calc";
import { newMeasureLine, newPart, newTextLine } from "@/lib/boq/factory";
import { fmtMoney, fmtQty } from "@/lib/boq/format";
import { insertLines, insertPart, movePart, removePart, updatePart } from "@/lib/boq/operations";
import type { Part } from "@/lib/boq/types";
import { TD } from "../cells/cellStyles";
import { Computed } from "../cells/Computed";
import { EditableArea } from "../cells/EditableArea";
import { EditableNumber } from "../cells/EditableNumber";
import { EditableText } from "../cells/EditableText";
import { focusRow, useBoqEdit } from "../editContext";
import { Empty } from "./Empty";
import { LineRow } from "./LineRow";
import { RowActions, type RowAction } from "./RowActions";

interface Props {
  part: Part;
  itemId: string;
  multiPart: boolean;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * One priced block of an item: an optional heading row ("(a) 10mm TMT..."), its lines, and its total row
 * (Qty | Unit | Rate | Amount). The heading row shows when the item has several parts or the heading is filled in.
 */
export const PartRows = memo(function PartRows({ part, itemId, multiPart, isFirst, isLast }: Props) {
  const { apply } = useBoqEdit();
  const [headingWanted, setHeadingWanted] = useState(false);
  const showHeading = multiPart || !!part.code || !!part.description || headingWanted;

  const set = (patch: Partial<Part>, field: string) => apply((doc) => updatePart(doc, part.id, patch), `part:${part.id}:${field}`);

  const addLine = (kind: "measure" | "text") => {
    const fresh = kind === "text" ? newTextLine() : newMeasureLine();
    apply((doc) => insertLines(doc, part.id, null, [fresh]));
    focusRow(fresh.id);
  };

  const addPartBelow = () => {
    const fresh = newPart();
    apply((doc) => insertPart(doc, itemId, part.id, fresh));
    focusRow(fresh.id);
  };

  const actions: RowAction[] = [
    { label: "Add a measurement line", icon: FiPlus, onClick: () => addLine("measure") },
    { label: "Add a heading line", icon: FiType, onClick: () => addLine("text") },
    ...(showHeading ? [] : [{ label: "Add a part code and heading", icon: FiTag, onClick: () => (setHeadingWanted(true), focusRow(part.id)) }]),
    { label: "Add another priced part (own unit and rate)", icon: FiCopy, onClick: addPartBelow },
    { label: "Move part up", icon: FiArrowUp, onClick: () => apply((doc) => movePart(doc, part.id, -1)), disabled: isFirst },
    { label: "Move part down", icon: FiArrowDown, onClick: () => apply((doc) => movePart(doc, part.id, 1)), disabled: isLast },
    { label: "Delete part", icon: FiTrash2, onClick: () => apply((doc) => removePart(doc, part.id)), danger: true, disabled: !multiPart },
  ];

  return (
    <>
      {showHeading && (
        <tr data-grid-row data-row-id={part.id} className="group">
          <td className={TD}>
            <EditableText value={part.code} onValue={(v) => set({ code: v }, "code")} label="Part code" col={0} placeholder="(a)" />
          </td>
          <td className={TD} />
          <td className={TD}>
            <EditableArea value={part.description} onValue={(v) => set({ description: v }, "description")} label="Part heading" col={2} placeholder="Part heading, e.g. 10mm TMT bars" />
          </td>
          <Empty count={8} />
          <RowActions actions={actions} />
        </tr>
      )}

      {part.lines.map((line, i) => (
        <LineRow
          key={line.id}
          line={line}
          partId={part.id}
          isFirst={i === 0}
          isLast={i === part.lines.length - 1}
          neighbourId={part.lines[i - 1]?.id ?? part.lines[i + 1]?.id ?? null}
        />
      ))}

      <tr data-grid-row data-row-id={`${part.id}:total`} className="group bg-stone-50/70">
        <Empty count={2} />
        <td className={TD}>
          <span className="block px-1.5 py-1 text-right text-xs text-stone-400">Total</span>
        </td>
        <Empty count={4} />
        <td className={`${TD} border-t-stone-400`}>
          <Computed strong title="Sum of the measurement lines">{fmtQty(partQty(part))}</Computed>
        </td>
        <td className={TD}>
          <EditableText value={part.unit} onValue={(v) => set({ unit: v }, "unit")} label="Unit" col={8} align="center" placeholder="cum" />
        </td>
        <td className={TD}>
          <EditableNumber value={part.rate} onValue={(v) => set({ rate: v }, "rate")} label="Rate" col={9} placeholder="0.00" />
        </td>
        <td className={TD}>
          <Computed strong title="Qty × Rate">{fmtMoney(partAmount(part))}</Computed>
        </td>
        <RowActions actions={showHeading ? [] : actions} />
      </tr>
      <tr aria-hidden className="h-1.5">
        <td colSpan={12} />
      </tr>
    </>
  );
});
