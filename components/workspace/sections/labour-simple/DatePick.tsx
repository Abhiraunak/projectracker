"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { addDays, longDay, mono, parse, todayYmd, ymd } from "./shared";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** The six weeks (Monday first) that show a month */
function weeksOf(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = addDays(ymd(first), -((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/**
 * A date field in the app's own look (the browser's date box can't be styled): a button with the date, and a month
 * under it. ‹ › change the month, Today jumps to today. Keyboard: ← → ↑ ↓ move a day or a week, Enter picks, Esc closes.
 */
export function DatePick({
  value,
  onChange,
  label,
  className = "",
  size = "md",
  align = "left",
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  className?: string;
  size?: "md" | "sm";
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: 0, m: 0 }); // the month shown, set when it opens
  const [focus, setFocus] = useState(""); // the day the keyboard is on
  const box = useRef<HTMLDivElement>(null);
  const gridId = useId();
  const today = todayYmd();

  // close when clicking anywhere else
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const show = () => {
    const d = parse(value || today);
    setView({ y: d.getFullYear(), m: d.getMonth() });
    setFocus(value || today);
    setOpen(true);
  };
  const pick = (d: string) => {
    onChange(d);
    setOpen(false);
  };
  const moveMonth = (n: number) => setView((v) => ({ y: v.y + Math.floor((v.m + n) / 12), m: (((v.m + n) % 12) + 12) % 12 }));
  const moveFocus = (n: number) => {
    const next = addDays(focus || today, n);
    const d = parse(next);
    setFocus(next);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const onKey = (e: KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        show();
      }
      return;
    }
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in step) {
      e.preventDefault();
      moveFocus(step[e.key]!);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(focus || today);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const tall = size === "sm" ? "h-10 text-sm" : "h-11 text-base";
  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={`${label}: ${value ? longDay(value) : "not set"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={gridId}
        onClick={() => {
          if (open) setOpen(false);
          else show();
        }}
        onKeyDown={onKey}
        className={`flex w-full items-center gap-2 rounded-lg border bg-white px-3 text-left text-[#111111] ${tall} ${mono.motion} ${mono.ring} ${
          open ? "border-[#111111]" : "border-[#DADAD7] hover:border-[#8C8C8C]"
        }`}
      >
        <FiCalendar aria-hidden className="shrink-0 text-[#666666]" />
        <span className={`min-w-0 flex-1 truncate tabular-nums ${value ? "" : "text-[#8C8C8C]"}`}>{value ? longDay(value) : "Pick a date"}</span>
      </button>

      {open && (
        <div
          id={gridId}
          role="dialog"
          aria-label={label}
          className={`absolute top-full z-40 mt-1.5 w-74 rounded-xl border border-[#E8E8E6] bg-white p-3 shadow-[0_8px_24px_rgba(17,17,17,0.12)] ${align === "right" ? "right-0" : "left-0"}`}
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => moveMonth(-1)} onMouseDown={(e) => e.preventDefault()} className={mono.icon} aria-label="Month before">
              <FiChevronLeft aria-hidden />
            </button>
            <span className="text-sm font-semibold text-[#111111]">
              {MONTHS.at(view.m)} {view.y}
            </span>
            <button type="button" onClick={() => moveMonth(1)} onMouseDown={(e) => e.preventDefault()} className={mono.icon} aria-label="Next month">
              <FiChevronRight aria-hidden />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center" role="grid">
            {DAYS.map((d) => (
              <span key={d} className="pb-1 text-[11px] font-medium text-[#8C8C8C]">
                {d}
              </span>
            ))}
            {weeksOf(view.y, view.m).map((d) => {
              const inMonth = parse(d).getMonth() === view.m;
              const chosen = d === value;
              const kb = d === focus;
              return (
                <button
                  key={d}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // keep focus on the field
                  onClick={() => pick(d)}
                  aria-label={longDay(d)}
                  aria-pressed={chosen}
                  className={`h-9 rounded-lg text-sm tabular-nums ${mono.motion} ${
                    chosen
                      ? "bg-[#111111] font-semibold text-white"
                      : `${kb ? "bg-[#F1F1EF]" : ""} ${inMonth ? "text-[#111111]" : "text-[#B0B0AD]"} hover:bg-[#F1F1EF] ${d === today ? "font-semibold ring-1 ring-inset ring-[#378ADD]" : ""}`
                  }`}
                >
                  {Number(d.slice(8))}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-[#EFEFED] pt-2">
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(today)} className="rounded-lg px-2 py-1 text-sm font-medium text-[#185FA5] hover:bg-[#E6F1FB]">
              Today
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-sm text-[#666666] hover:bg-[#F1F1EF]">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}