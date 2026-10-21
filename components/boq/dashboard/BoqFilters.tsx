"use client";

import React from "react";
import { FiSearch, FiX } from "react-icons/fi";
import type { BoqStatus } from "@/lib/boq/types";

export type StatusFilter = BoqStatus | "ALL";

const OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Drafts" },
  { value: "FINAL", label: "Final" },
];

interface Props {
  search: string;
  onSearch: (value: string) => void;
  status: StatusFilter;
  onStatus: (value: StatusFilter) => void;
}

/** Search by project, part or BOQ number, and show all, drafts or final */
export function BoqFilters({ search, onSearch, status, onStatus }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search project, part or BOQ number"
          aria-label="Search BOQs"
          className="w-full rounded border border-stone-300 py-2 pl-9 pr-9 text-sm focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        />
        {search && (
          <button type="button" onClick={() => onSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:text-stone-700">
            <FiX aria-hidden />
          </button>
        )}
      </div>
      <div role="radiogroup" aria-label="Show" className="inline-flex rounded border border-stone-300 p-0.5">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={status === option.value}
            onClick={() => onStatus(option.value)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              status === option.value ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
