"use client";

import React from "react";
import type { IconType } from "react-icons";
import { useBoqEdit } from "../editContext";

export interface RowAction {
  label: string;
  icon: IconType;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/** The buttons themselves: shown when the row is pointed at or has the cursor (always on touch screens) */
export function ActionButtons({ actions }: { actions: RowAction[] }) {
  return (
    <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
      {actions.map(({ label, icon: Icon, onClick, danger, disabled }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          disabled={disabled}
          title={label}
          aria-label={label}
          className={`rounded p-1.5 text-stone-400 transition-colors focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-30 ${
            danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-stone-100 hover:text-stone-800"
          }`}
        >
          <Icon aria-hidden className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

/** The last cell of a sheet row: its action buttons (nothing when the BOQ is final) */
export function RowActions({ actions }: { actions: RowAction[] }) {
  const { readOnly } = useBoqEdit();
  return (
    <td className="whitespace-nowrap border border-transparent px-1 align-top">{!readOnly && actions.length > 0 && <ActionButtons actions={actions} />}</td>
  );
}

/** A row of "+ Add" buttons under a block (hidden when final) */
export function AddRow({ buttons, indent = false }: { buttons: { label: string; onClick: () => void }[]; indent?: boolean }) {
  const { readOnly } = useBoqEdit();
  if (readOnly) return null;
  return (
    <tr className="print:hidden">
      <td colSpan={12} className="px-1 py-0.5">
        <div className={`flex flex-wrap gap-1 ${indent ? "pl-28" : ""}`}>
          {buttons.map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={b.onClick}
              className="rounded px-2 py-1 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              + {b.label}
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
}
