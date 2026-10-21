"use client";

import React, { memo, useEffect, useRef, useState, type ClipboardEventHandler } from "react";
import { fmtDim } from "@/lib/boq/format";
import { parseNumber } from "@/lib/boq/tsv";
import { useBoqEdit } from "../editContext";
import { CELL } from "./cellStyles";

interface Props {
  value: number | null;
  onValue: (value: number | null) => void;
  label: string;
  col?: number;
  placeholder?: string;
  strong?: boolean;
  onPaste?: ClipboardEventHandler<HTMLInputElement>;
}

/**
 * A number cell. While typing it keeps exactly what was typed ("1." or "0.0"), so nothing jumps under the cursor;
 * every valid number is applied at once, so totals update live. Commas are allowed (1,23,456.50).
 */
export const EditableNumber = memo(function EditableNumber({ value, onValue, label, col, placeholder, strong = false, onPaste }: Props) {
  const { readOnly } = useBoqEdit();
  const [text, setText] = useState(fmtDim(value));
  const focused = useRef(false);
  const textRef = useRef(text);
  textRef.current = text;

  // Show outside changes (undo, paste, another cell's edit) unless they're just what is being typed
  useEffect(() => {
    if (!focused.current || parseNumber(textRef.current) !== value) setText(fmtDim(value));
  }, [value]);

  const handleChange = (next: string) => {
    setText(next);
    if (next.trim() === "") return onValue(null);
    const parsed = parseNumber(next);
    if (parsed !== null) onValue(parsed);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      readOnly={readOnly}
      onChange={(event) => handleChange(event.target.value)}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        setText(fmtDim(value)); // tidy up ("1." becomes "1")
      }}
      onPaste={onPaste}
      aria-label={label}
      placeholder={readOnly ? undefined : placeholder}
      data-cell={col === undefined ? undefined : ""}
      data-col={col}
      className={`${CELL} text-right tabular-nums ${strong ? "font-semibold" : ""}`}
    />
  );
});
