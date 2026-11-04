"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { HTMLAttributes, KeyboardEvent } from "react";
import { FiCheck, FiPlus, FiX } from "react-icons/fi";

/**
 * Pick one of a few short choices by tapping, or add your own.
 *
 * Every prop is optional, so any caller keeps working:
 *   <ChipInput value={trade} onChange={setTrade} choices={["Civil", "Tiles"]} />
 *   <ChipInput id="tradeInput" labelledBy="tradeLabel" noun="trade" value={t} onChange={setT} choices={list} storageKey="k" />
 *   <ChipInput value={unit} onChange={setUnit} options={[{ value: "nos", label: "Numbers" }]} allowCustom={false} />
 */
export type ChipChoice = string | { value: string; label?: string };

export interface ChipInputProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** Id of the group, so a form can move the cursor here; made up when left out */
  id?: string;
  /** The picked choice ("" or null/undefined = none) */
  value?: string | null;
  /** Called with the new choice, or "" when it is un-picked */
  onChange?: (value: string) => void;
  /** The ready-made choices, in order: plain text, or { value, label } */
  choices?: readonly ChipChoice[];
  /** Same as `choices` (older name) */
  options?: readonly ChipChoice[];
  /** Let people add their own choice ("+ Add trade"); on by default */
  allowCustom?: boolean;
  /** "trade" → "+ Add trade" */
  noun?: string;
  /** Remember choices people add here, on this device (e.g. per project) */
  storageKey?: string;
  maxLength?: number;
  /** Id of a visible label for the group (screen readers) */
  labelledBy?: string;
  /** A label for screen readers when there is no visible one; defaults to "Pick a <noun>" */
  label?: string;
  /** "sm" for tight spots like a table row */
  size?: "md" | "sm";
  /** Tapping the picked chip again un-picks it; on by default */
  allowClear?: boolean;
  disabled?: boolean;
  /** Placeholder of the "add your own" box; defaults to "New <noun>" */
  placeholder?: string;
  /** Told when someone adds or removes their own choice */
  onAdd?: (value: string) => void;
  onRemove?: (value: string) => void;
}

const clean = (s: string) => s.trim().replace(/\s+/g, " ");
const same = (a: string, b: string) => clean(a).toLowerCase() === clean(b).toLowerCase();
const asChoice = (c: ChipChoice) => (typeof c === "string" ? { value: c, label: c } : { value: c.value, label: c.label ?? c.value });

function readSaved(key?: string): string[] {
  if (!key || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}
function writeSaved(key: string | undefined, list: string[]) {
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* storage blocked: the choice still works for now */
  }
}

/**
 * All choices show as chips that wrap onto new lines, so there is no dropdown and nothing to scroll.
 * "+ Add trade" turns into a small box in the same row: type, press Enter (or ✓), and the new choice is picked and
 * kept as a chip. Choices people added can be removed with ×.
 */
export function ChipInput({
  id: givenId,
  value,
  onChange,
  choices,
  options,
  allowCustom = true,
  noun = "option",
  storageKey,
  maxLength = 40,
  labelledBy,
  label,
  size = "md",
  allowClear = true,
  disabled = false,
  placeholder,
  onAdd,
  onRemove,
  className = "",
  ...rest
}: ChipInputProps) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const current = value ?? "";
  const pick = (v: string) => onChange?.(v);
  const [added, setAdded] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Read after the first render: the server doesn't have the browser's storage
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setAdded(readSaved(storageKey)), [storageKey]);
  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  // Ready-made first, then ones people added, then the current value if it's from elsewhere (an old entry)
  const all = useMemo(() => {
    const list: { value: string; label: string; custom: boolean }[] = [];
    const push = (v: string, l: string, custom: boolean) => {
      const val = clean(v);
      if (val && !list.some((c) => same(c.value, val))) list.push({ value: val, label: clean(l) || val, custom });
    };
    (choices ?? options ?? []).forEach((c) => {
      const { value: v, label: l } = asChoice(c);
      push(v, l, false);
    });
    added.forEach((c) => push(c, c, true));
    push(current, current, false);
    return list;
  }, [choices, options, added, current]);

  const save = (list: string[]) => {
    setAdded(list);
    writeSaved(storageKey, list);
  };

  const commit = () => {
    const text = clean(draft);
    if (text) {
      const existing = all.find((c) => same(c.value, text) || same(c.label, text));
      if (existing) pick(existing.value);
      else {
        save([...added, text]);
        onAdd?.(text);
        pick(text);
      }
    }
    setDraft("");
    setAdding(false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // don't submit the form
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft("");
      setAdding(false);
    }
  };

  const remove = (v: string) => {
    save(added.filter((c) => !same(c, v)));
    onRemove?.(v);
    if (same(current, v)) pick("");
  };

  const h = size === "sm" ? "min-h-8 text-xs" : "min-h-9 text-sm";
  const chip = `inline-flex ${h} items-center gap-1 rounded-full border px-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50`;

  return (
    <div
      {...rest}
      id={id}
      tabIndex={-1}
      role="group"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : (label ?? `Pick ${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`)}
      aria-disabled={disabled || undefined}
      className={`flex flex-wrap items-center gap-1.5 focus:outline-none ${className}`}
    >
      {all.map((c) => {
        const on = same(current, c.value);
        const tone = on ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-500";
        return (
          <span key={c.value} className="inline-flex">
            <button
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => pick(on ? (allowClear ? "" : c.value) : c.value)}
              className={`${chip} ${tone} ${c.custom ? "rounded-r-none border-r-0 pr-1.5" : ""}`}
            >
              {c.label}
            </button>
            {c.custom && (
              // Its own button beside the chip (a button can't sit inside another), styled as the chip's end
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(c.value)}
                aria-label={`Remove ${c.label}`}
                title={`Remove ${c.label}`}
                className={`-ml-px inline-flex ${h} items-center rounded-r-full border border-l-0 pl-0.5 pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50 ${
                  on ? "border-stone-900 bg-stone-900 text-stone-300 hover:text-white" : "border-stone-300 bg-white text-stone-400 hover:text-stone-900"
                }`}
              >
                <FiX aria-hidden />
              </button>
            )}
          </span>
        );
      })}

      {allowCustom &&
        !disabled &&
        (adding ? (
          <span className={`inline-flex ${h} items-center gap-1 rounded-full border border-stone-900 bg-white pl-3 pr-1`}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              onBlur={() => (draft.trim() ? commit() : setAdding(false))}
              maxLength={maxLength}
              aria-label={`New ${noun}`}
              placeholder={placeholder ?? `New ${noun}`}
              className="w-28 bg-transparent text-stone-900 placeholder:text-stone-400 focus:outline-none"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()} // keep the box focused so the click adds instead of closing
              onClick={commit}
              disabled={!draft.trim()}
              aria-label={`Add ${noun}`}
              className="rounded-full p-1 text-stone-700 hover:bg-stone-100 disabled:text-stone-300"
            >
              <FiCheck aria-hidden />
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className={`${chip} border-dashed border-stone-300 text-stone-500 hover:border-stone-500 hover:text-stone-900`}>
            <FiPlus aria-hidden /> Add {noun}
          </button>
        ))}
    </div>
  );
}

export default ChipInput;