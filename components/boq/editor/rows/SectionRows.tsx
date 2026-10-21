"use client";

import React, { memo } from "react";
import { FiArrowDown, FiArrowUp, FiTrash2 } from "react-icons/fi";
import { newItem, newLabel } from "@/lib/boq/factory";
import { insertEntry, moveEntry, moveSection, removeEntry, removeSection, updateEntry, updateSection } from "@/lib/boq/operations";
import type { Label, Section } from "@/lib/boq/types";
import { TD } from "../cells/cellStyles";
import { EditableText } from "../cells/EditableText";
import { focusRow, useBoqEdit } from "../editContext";
import { ItemRows } from "./ItemRows";
import { AddRow, RowActions } from "./RowActions";

/** A bold sub-heading between items, like "P.C.C." or "R.C.C." */
const LabelRow = memo(function LabelRow({ label, isFirst, isLast }: { label: Label; isFirst: boolean; isLast: boolean }) {
  const { apply } = useBoqEdit();
  return (
    <tr data-grid-row data-row-id={label.id} className="group">
      <td className={TD} />
      <td className={TD} />
      <td className={TD} colSpan={9}>
        <EditableText
          value={label.text}
          onValue={(v) => apply((doc) => updateEntry(doc, label.id, { text: v }), `label:${label.id}`)}
          label="Sub-heading"
          col={2}
          strong
          className="underline decoration-stone-300 underline-offset-4"
          placeholder="Sub-heading, e.g. P.C.C."
        />
      </td>
      <RowActions
        actions={[
          { label: "Move up", icon: FiArrowUp, onClick: () => apply((doc) => moveEntry(doc, label.id, -1)), disabled: isFirst },
          { label: "Move down", icon: FiArrowDown, onClick: () => apply((doc) => moveEntry(doc, label.id, 1)), disabled: isLast },
          { label: "Delete sub-heading", icon: FiTrash2, onClick: () => apply((doc) => removeEntry(doc, label.id)), danger: true },
        ]}
      />
    </tr>
  );
});

interface Props {
  section: Section;
  serials: Map<string, number>;
  isFirst: boolean;
  isLast: boolean;
}

/** A section ("5.1 EARTHWORK") with its items and sub-headings */
export const SectionRows = memo(function SectionRows({ section, serials, isFirst, isLast }: Props) {
  const { apply } = useBoqEdit();
  const set = (patch: Partial<Section>, field: string) => apply((doc) => updateSection(doc, section.id, patch), `section:${section.id}:${field}`);

  const add = (kind: "item" | "label") => {
    const fresh = kind === "item" ? newItem() : newLabel();
    apply((doc) => insertEntry(doc, section.id, null, fresh));
    focusRow(fresh.id);
  };

  return (
    <>
      <tr data-grid-row data-row-id={section.id} className="group bg-stone-100/80">
        <td className={TD}>
          <EditableText value={section.code} onValue={(v) => set({ code: v }, "code")} label="Section code" col={0} strong placeholder="5.1" />
        </td>
        <td className={TD} />
        <td className={TD} colSpan={9}>
          <EditableText value={section.title} onValue={(v) => set({ title: v }, "title")} label="Section title" col={2} strong placeholder="SECTION, e.g. EARTHWORK" />
        </td>
        <RowActions
          actions={[
            { label: "Move section up", icon: FiArrowUp, onClick: () => apply((doc) => moveSection(doc, section.id, -1)), disabled: isFirst },
            { label: "Move section down", icon: FiArrowDown, onClick: () => apply((doc) => moveSection(doc, section.id, 1)), disabled: isLast },
            { label: "Delete section (Ctrl+Z to undo)", icon: FiTrash2, onClick: () => apply((doc) => removeSection(doc, section.id)), danger: true },
          ]}
        />
      </tr>

      {section.entries.map((entry, i) =>
        entry.kind === "label" ? (
          <LabelRow key={entry.id} label={entry} isFirst={i === 0} isLast={i === section.entries.length - 1} />
        ) : (
          <ItemRows key={entry.id} item={entry} serial={serials.get(entry.id)} sectionId={section.id} isFirst={i === 0} isLast={i === section.entries.length - 1} />
        )
      )}

      <AddRow
        buttons={[
          { label: "Item", onClick: () => add("item") },
          { label: "Sub-heading", onClick: () => add("label") },
        ]}
      />
    </>
  );
});
