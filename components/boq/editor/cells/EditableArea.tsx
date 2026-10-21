"use client";

import React, { memo, useLayoutEffect, useRef } from "react";
import { useBoqEdit } from "../editContext";
import { CELL } from "./cellStyles";

interface Props {
  value: string;
  onValue: (value: string) => void;
  label: string;
  col?: number;
  strong?: boolean;
  placeholder?: string;
}

/** A cell for long text (item descriptions): grows with what is typed, and Enter adds a new line */
export const EditableArea = memo(function EditableArea({ value, onValue, label, col, strong = false, placeholder }: Props) {
  const { readOnly } = useBoqEdit();
  const ref = useRef<HTMLTextAreaElement>(null);

  // Fit the height to the text, so long descriptions are fully visible, like a wrapped Excel cell
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      readOnly={readOnly}
      onChange={(event) => onValue(event.target.value)}
      aria-label={label}
      placeholder={readOnly ? undefined : placeholder}
      data-cell={col === undefined ? undefined : ""}
      data-col={col}
      className={`${CELL} resize-none overflow-hidden leading-snug ${strong ? "font-semibold" : ""}`}
    />
  );
});
