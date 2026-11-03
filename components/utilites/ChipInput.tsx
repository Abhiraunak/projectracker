"use client";

import { inputBase } from "./fieldStyles";

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Suggestions: the first `chips` show as one-tap buttons; all of them are offered while typing */
  choices: string[];
  chips?: number;
  placeholder?: string;
  maxLength?: number;
  groupLabel?: string;
}

/** Type anything, or tap a common choice. Used for the trade ("Civil", "Tiles"…); fits any short label. */
export function ChipInput({ id, value, onChange, choices, chips = 8, placeholder, maxLength = 40, groupLabel = "Pick one" }: Props) {
  const listId = `${id}-choices`;
  const current = value.trim().toLowerCase();
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <input id={id} type="text" maxLength={maxLength} list={listId} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputBase} md:w-56`} />
      <datalist id={listId}>
        {choices.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div className="flex gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0" role="group" aria-label={groupLabel}>
        {choices.slice(0, chips).map((c) => {
          const on = current === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(c)}
              className={`shrink-0 rounded-full border px-3 py-1 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                on ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 text-stone-700 hover:border-stone-500"
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
