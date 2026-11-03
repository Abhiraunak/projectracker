"use client";

import { FiSearch, FiX } from "react-icons/fi";
import { inputBase } from "./fieldStyles";

/** A search box with a magnifier and a clear button */
export function SearchInput({ value, onChange, label, className = "" }: { value: string; onChange: (v: string) => void; label: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
      <input type="search" aria-label={label} placeholder={label} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputBase} pl-9 pr-8`} />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:text-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
        >
          <FiX aria-hidden />
        </button>
      )}
    </div>
  );
}
