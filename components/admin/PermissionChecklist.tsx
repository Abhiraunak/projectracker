"use client";

import React from "react";
import { PERMISSION_GROUPS, type Permission } from "@/lib/access/types";

interface Props {
  selected: Set<Permission>;
  onToggle: (permission: Permission) => void;
}

/** Every permission, grouped, each with a plain-words explanation */
export function PermissionChecklist({ selected, onToggle }: Props) {
  return (
    <div className="space-y-5">
      {PERMISSION_GROUPS.map((group) => (
        <fieldset key={group.title}>
          <legend className="mb-2 text-sm font-semibold">{group.title}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((item) => (
              <label key={item.key} className="flex cursor-pointer items-start gap-3 rounded border border-stone-200 p-3 transition-colors hover:bg-stone-50">
                <input
                  type="checkbox"
                  checked={selected.has(item.key)}
                  onChange={() => onToggle(item.key)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-stone-900"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-stone-500">{item.help}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
