"use client";

import React, { memo } from "react";
import { FiArrowDown, FiArrowUp, FiLayers, FiPlus, FiTrash2 } from "react-icons/fi";
import { itemCombinedQty } from "@/lib/boq/calc";
import { newItem, newPart } from "@/lib/boq/factory";
import { fmtQty } from "@/lib/boq/format";
import { insertEntry, insertPart, moveEntry, removeEntry, updateEntry } from "@/lib/boq/operations";
import type { Item } from "@/lib/boq/types";
import { TD } from "../cells/cellStyles";
import { Computed } from "../cells/Computed";
import { EditableArea } from "../cells/EditableArea";
import { EditableText } from "../cells/EditableText";
import { focusRow, useBoqEdit } from "../editContext";
import { Empty } from "./Empty";
import { PartRows } from "./PartRows";
import { RowActions } from "./RowActions";

interface Props {
  item: Item;
  serial: number | undefined;
  sectionId: string;
  isFirst: boolean;
  isLast: boolean;
}

/** An item: SOR No | S.No (numbered automatically) | description, then its parts */
export const ItemRows = memo(function ItemRows({ item, serial, sectionId, isFirst, isLast }: Props) {
  const { apply } = useBoqEdit();
  const set = (patch: Partial<Item>, field: string) => apply((doc) => updateEntry(doc, item.id, patch), `item:${item.id}:${field}`);
  const combined = itemCombinedQty(item);

  const addItemBelow = () => {
    const fresh = newItem();
    apply((doc) => insertEntry(doc, sectionId, item.id, fresh));
    focusRow(fresh.id);
  };

  const addPart = () => {
    const fresh = newPart();
    apply((doc) => insertPart(doc, item.id, null, fresh));
    focusRow(fresh.id);
  };

  const actions = [
    { label: "Add a priced part (own unit and rate)", icon: FiLayers, onClick: addPart },
    { label: "Add an item below", icon: FiPlus, onClick: addItemBelow },
    { label: "Move item up", icon: FiArrowUp, onClick: () => apply((doc) => moveEntry(doc, item.id, -1)), disabled: isFirst },
    { label: "Move item down", icon: FiArrowDown, onClick: () => apply((doc) => moveEntry(doc, item.id, 1)), disabled: isLast },
    { label: "Delete item", icon: FiTrash2, onClick: () => apply((doc) => removeEntry(doc, item.id)), danger: true },
  ];

  return (
    <>
      <tr data-grid-row data-row-id={item.id} className="group">
        <td className={TD}>
          <EditableText value={item.code} onValue={(v) => set({ code: v }, "code")} label="SOR No." col={0} placeholder="5.1.1" />
        </td>
        <td className={TD}>
          <Computed title="Numbered automatically">{serial ?? ""}</Computed>
        </td>
        <td className={TD}>
          <EditableArea value={item.description} onValue={(v) => set({ description: v }, "description")} label="Item description" col={2} placeholder="Item description, as in the schedule of rates" />
        </td>
        <Empty count={8} />
        <RowActions actions={actions} />
      </tr>

      {item.parts.map((part, i) => (
        <PartRows key={part.id} part={part} itemId={item.id} multiPart={item.parts.length > 1} isFirst={i === 0} isLast={i === item.parts.length - 1} />
      ))}

      {combined && (
        <tr className="bg-stone-50/70">
          <Empty count={2} />
          <td className={TD}>
            <span className="block px-1.5 py-1 text-right text-xs text-stone-500">Total {item.code}</span>
          </td>
          <Empty count={4} />
          <td className={TD}>
            <Computed strong>{fmtQty(combined.qty)}</Computed>
          </td>
          <td className={TD}>
            <span className="block px-1.5 py-1 text-center text-sm">{combined.unit}</span>
          </td>
          <Empty count={2} />
          <td />
        </tr>
      )}
    </>
  );
});
