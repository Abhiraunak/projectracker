
"use client";

import { inputBase } from "./fieldStyles";

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  choices: string[];
  chips?: number;
  placeholder?: string;
  maxLength?: number;
  groupLabel?: string;
  labelledBy?: string;
  size?: "sm" | "md";
}

/** Type anything, or tap a common choice. */
export function ChipInput({
  id,
  value,
  onChange,
  choices,
  chips = 8,
  placeholder,
  maxLength = 40,
  groupLabel = "Pick one",
  labelledBy,
  size = "md",
}: Props) {
  const listId = `${id}-choices`;
  const current = value.trim().toLowerCase();

  const sizeClasses =
    size === "sm"
      ? "text-sm md:w-56"
      : "text-base md:w-64";

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <input
        id={id}
        type="text"
        maxLength={maxLength}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-labelledby={labelledBy}
        className={`${inputBase} ${sizeClasses}`}
      />

      <datalist id={listId}>
        {choices.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div
        className="flex gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0"
        role="group"
        aria-label={labelledBy ? undefined : groupLabel}
        aria-labelledby={labelledBy}
      >
        {choices.slice(0, chips).map((c) => {
          const on = current === c.toLowerCase();

          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(c)}
              className={`shrink-0 rounded-full border px-3 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                size === "sm" ? "text-xs" : "text-sm"
              } ${
                on
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 text-stone-700 hover:border-stone-500"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}
