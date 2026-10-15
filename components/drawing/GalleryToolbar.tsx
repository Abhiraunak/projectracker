"use client";

import React from "react";
import { FiSearch } from "react-icons/fi";
import type { DrawingScope } from "@/lib/drawings/types";
import { focusRing, inputBase } from "./styles";

const TABS: { scope: DrawingScope; label: string }[] = [
  { scope: "all", label: "All" },
  { scope: "mine", label: "Mine" },
  { scope: "shared", label: "Shared with me" },
];

interface GalleryToolbarProps {
  scope: DrawingScope;
  search: string;
  onScopeChange: (scope: DrawingScope) => void;
  onSearchChange: (search: string) => void;
}

/** The gallery's controls: which tab, and a search box */
export function GalleryToolbar({ scope, search, onScopeChange, onSearchChange }: GalleryToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div role="group" aria-label="Show drawings" className="flex w-full rounded border border-stone-300 p-0.5 text-sm sm:w-auto">
        {TABS.map((tab) => (
          <button
            key={tab.scope}
            type="button"
            aria-pressed={scope === tab.scope}
            onClick={() => onScopeChange(tab.scope)}
            className={`flex-1 whitespace-nowrap rounded px-3 py-2 font-medium transition-colors sm:flex-none ${focusRing} ${
              scope === tab.scope ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative w-full sm:w-72">
        <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="search"
          aria-label="Search drawings by title"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search drawings"
          className={`${inputBase} pl-9`}
        />
      </div>
    </div>
  );
}
