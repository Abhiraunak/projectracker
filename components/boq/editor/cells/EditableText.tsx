"use client";

import React, { memo, type ClipboardEventHandler } from "react";
import { useBoqEdit } from "../editContext";
import { ALIGN, CELL, type Align } from "./cellStyles";

interface Props {
  value: string;
  onValue: (value: string) => void;
  label: string; // read out by screen readers
  col?: number; // spreadsheet column, for arrow-key movement
  align?: Align;
  strong?: boolean;
  placeholder?: string;
  className?: string;
  onPaste?: ClipboardEventHandler<HTMLInputElement>;
}

/** A one-line cell, typed into directly on the page */
export const EditableText = memo(function EditableText({ value, onValue, label, col, align = "left", strong = false, placeholder, className = "", onPaste }: Props) {
  const { readOnly } = useBoqEdit();
  return (
    <input
      type="text"
      value={value}
      readOnly={readOnly}
      onChange={(event) => onValue(event.target.value)}
      onPaste={onPaste}
      aria-label={label}
      placeholder={readOnly ? undefined : placeholder}
      data-cell={col === undefined ? undefined : ""}
      data-col={col}
      className={`${CELL} ${ALIGN[align]} ${strong ? "font-semibold" : ""} ${className}`}
    />
  );
});
