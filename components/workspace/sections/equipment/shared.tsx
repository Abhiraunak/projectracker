"use client";

import type { ReactNode } from "react";
import type { CategoryKey, Condition } from "@/lib/equipment/api";

export const field = "mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 focus:border-stone-900 focus:outline-none";
export const primaryBtn = "min-h-11 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50";
export const quietBtn = "min-h-11 rounded-lg px-4 text-sm font-medium text-stone-600 hover:bg-stone-100";
export const outlineBtn = "inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:border-stone-500";

/** Local date: toISOString() would give yesterday early in the morning in India */
export const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  shuttering: "Shuttering",
  scaffolding: "Scaffolding",
  machinery: "Machinery",
  tools: "Tools",
  other: "Other",
};

export function Label({ text, optional, children }: { text: string; optional?: boolean; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-stone-700">
        {text} {optional && <span className="font-normal text-stone-400">(optional)</span>}
      </span>
      {children}
    </label>
  );
}

/** A row of choices as buttons: quicker than a dropdown on a phone */
export function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="text-sm">
      <legend className="font-medium text-stone-700">{label}</legend>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`min-h-10 rounded-full border px-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              value === o.value ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 text-stone-700 hover:border-stone-500"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "good", label: "Good" },
  { value: "repair", label: "Needs repair" },
  { value: "damaged", label: "Damaged" },
];

export function ConditionBadge({ condition }: { condition: Condition | null }) {
  if (!condition || condition === "good") return null;
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${condition === "damaged" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
      {condition === "damaged" ? "Damaged" : "Needs repair"}
    </span>
  );
}

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const longDate = (ymd: string) => day.format(new Date(`${ymd}T00:00:00Z`));
export const daysSince = (ymd: string) => Math.max(0, Math.round((Date.parse(`${todayLocal()}T00:00:00Z`) - Date.parse(`${ymd}T00:00:00Z`)) / 86_400_000));
