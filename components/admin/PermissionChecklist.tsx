"use client";

import React from "react";
import { SECTION_ACCESS, type Permission, type SectionAccess } from "@/lib/access/types";
import { sectionState, toggleSection } from "@/lib/access/sections";

interface Props {
  selected: Set<Permission>;
  /** Replaces the whole set (a section tick adds or removes several permissions at once) */
  onChange: (next: Set<Permission>) => void;
}

const state = sectionState;

/**
 * One tick per workspace section, in the project's order. A tick gives everything that section needs (seeing it,
 * adding, editing, paying); any tick also lets the person see projects. "Partly" marks an older, finer setting:
 * ticking it gives the whole section.
 */
export function PermissionChecklist({ selected, onChange }: Props) {
  const toggle = (s: SectionAccess) => onChange(toggleSection(selected, s));

  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold">Sections this person can use</legend>
      <p className="mb-3 text-xs text-stone-500">One tick gives full use of that section. Any tick also lets them see projects and the Overview, except the site engineer&apos;s diary.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {SECTION_ACCESS.map((s) => {
          const st = state(selected, s);
          return (
            <label
              key={s.key}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${st === "on" ? "border-stone-900 bg-stone-50" : "border-stone-200 hover:bg-stone-50"}`}
            >
              <input
                type="checkbox"
                checked={st === "on"}
                ref={(el) => {
                  if (el) el.indeterminate = st === "part";
                }}
                onChange={() => toggle(s)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-stone-900"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {s.label}
                  {st === "part" && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">Partly</span>}
                </span>
                <span className="block text-xs text-stone-500">{s.help}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}