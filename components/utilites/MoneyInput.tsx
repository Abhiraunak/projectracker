"use client";

import type { InputHTMLAttributes } from "react";
import { inputBase } from "./fieldStyles";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | "";
  onChange: (value: number | "") => void;
  /** Extra classes for the wrapper (width etc.) */
  wrapperClassName?: string;
};

/** A rupee amount: "₹" inside the box, numbers only, empty allowed while typing */
export function MoneyInput({ value, onChange, wrapperClassName = "", className = "", ...rest }: Props) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-stone-400">
        ₹
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        placeholder="0"
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className={`${inputBase} pl-7 tabular-nums ${className}`}
      />
    </div>
  );
}
