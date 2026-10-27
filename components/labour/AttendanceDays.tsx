"use client";

import React, { useState } from "react";
import { FiCalendar, FiPlus, FiX } from "react-icons/fi";
import { addDay, daysBetween, describeDays, MAX_DAYS, removeDay, shortDay, weekday } from "@/lib/attendance/days";

const input =
  "w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20";
const smallBtn =
  "flex items-center gap-1 rounded border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-40";

interface Props {
  days: string[];
  onChange: (days: string[]) => void;
}

/**
 * The days one entry covers: fill a range (From / To, optionally without Sundays), then add or remove single days.
 * Each chosen day becomes its own saved entry with the same labour and amounts.
 */
export function AttendanceDays({ days, onChange }: Props) {
  const [from, setFrom] = useState(days[0] ?? "");
  const [to, setTo] = useState(days[days.length - 1] ?? "");
  const [skipSundays, setSkipSundays] = useState(false);
  const [extra, setExtra] = useState("");

  const range = daysBetween(from, to, skipSundays);
  const full = days.length >= MAX_DAYS;

  return (
    <div className="space-y-3 rounded border border-stone-300 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block text-sm text-stone-500">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${input} mt-1.5`} />
        </label>
        <label className="block text-sm text-stone-500">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${input} mt-1.5`} />
        </label>
        <button type="button" onClick={() => onChange(range)} disabled={range.length === 0} className={smallBtn}>
          <FiCalendar aria-hidden /> Use {range.length || ""} {range.length === 1 ? "day" : "days"}
        </button>
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" checked={skipSundays} onChange={(e) => setSkipSundays(e.target.checked)} className="h-4 w-4 accent-stone-900" />
        Leave out Sundays
      </label>

      <div className="border-t border-stone-200 pt-3">
        <p className="mb-2 text-sm font-medium" aria-live="polite">
          {describeDays(days)}
        </p>
        {days.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Chosen days">
            {days.map((day) => (
              <li key={day} className="flex items-center gap-1 rounded border border-stone-300 bg-stone-50 py-1 pl-2 pr-1 text-xs">
                <span className="text-stone-500">{weekday(day)}</span> {shortDay(day)}
                <button
                  type="button"
                  onClick={() => onChange(removeDay(days, day))}
                  aria-label={`Remove ${shortDay(day, true)}`}
                  className="rounded p-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <FiX aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex gap-2">
          <input type="date" value={extra} onChange={(e) => setExtra(e.target.value)} aria-label="Another day to add" className={`${input} max-w-48`} />
          <button
            type="button"
            onClick={() => {
              onChange(addDay(days, extra));
              setExtra("");
            }}
            disabled={!extra || full || days.includes(extra)}
            className={smallBtn}
          >
            <FiPlus aria-hidden /> Add day
          </button>
        </div>
        {full && <p className="mt-2 text-xs text-stone-500">At most {MAX_DAYS} days in one entry.</p>}
      </div>
    </div>
  );
}
