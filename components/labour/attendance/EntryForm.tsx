"use client";

import type { FormEvent, RefObject } from "react";
import { FiCornerUpLeft, FiCornerUpRight, FiEdit2, FiSave, FiX } from "react-icons/fi";
import { ChipInput } from "@/components/utilites/ChipInput";
import { fieldLabel, iconBtn, inputBase } from "@/components/utilites/fieldStyles";
import { FormMessage } from "@/components/utilites/FormMessage";
import { MoneyInput } from "@/components/utilites/MoneyInput";
import { describeDays } from "@/lib/attendance/days";
import { rupees } from "@/lib/attendance/form";
import { AttendanceDays } from "../AttendanceDays";
import { LabourDetails } from "./LabourDetails";
import type { AttendanceFormApi } from "./useAttendanceForm";

interface Props {
  api: AttendanceFormApi;
  /** Trades to offer, and each contractor's usual trade (filled in when the contractor is known) */
  choices: string[];
  usual?: Record<string, string>;
  total: number;
  saving: boolean;
  error: string | null;
  savedNote: string | null;
  submitRef: RefObject<HTMLButtonElement | null>;
  onSubmit: (e: FormEvent) => void;
  onCancelEdit: () => void;
}

/** The "New entry" / "Editing entry" card: trade, contractor, day(s), labourers, extras, notes, total, save */
export function EntryForm({ api, choices, usual, total, saving, error, savedNote, submitRef, onSubmit, onCancelEdit }: Props) {
  const { form, update, editingId, severalDays, multiDay } = api;
  const dayCount = severalDays ? form.days.length : 1;

  return (
    <section className={`rounded border ${editingId ? "border-stone-900" : "border-stone-300"}`} aria-label={editingId ? "Edit attendance entry" : "New attendance entry"}>
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          {editingId ? "Editing entry" : "New entry"}
          {editingId && (
            <span className="flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
              <FiEdit2 aria-hidden /> Editing
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={api.undo} title="Undo (Ctrl+Z)" aria-label="Undo" className={iconBtn}>
            <FiCornerUpLeft aria-hidden />
          </button>
          <button type="button" onClick={api.redo} title="Redo (Ctrl+Y)" aria-label="Redo" className={iconBtn}>
            <FiCornerUpRight aria-hidden />
          </button>
          {editingId && (
            <>
              <span className="mx-2 h-4 w-px bg-stone-300" />
              <button
                type="button"
                onClick={onCancelEdit}
                className="flex items-center gap-1 rounded px-1 text-sm font-medium text-stone-500 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              >
                <FiX aria-hidden /> Cancel edit
              </button>
            </>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 p-4 sm:p-6">
        <div>
          <label htmlFor="tradeInput" className={fieldLabel}>
            Trade
          </label>
          <ChipInput id="tradeInput" value={form.trade} onChange={(trade) => update({ trade })} choices={choices} placeholder="e.g. Civil" groupLabel="Pick a trade" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="contractorNameInput" className={fieldLabel}>
              Team head
            </label>
            <input
              id="contractorNameInput"
              type="text"
              required
              maxLength={120}
              value={form.contractorName}
              onChange={(e) => update({ contractorName: e.target.value })}
              // A known contractor brings their usual trade along, when none is chosen yet
              onBlur={(e) => {
                const known = usual?.[e.target.value.trim()];
                if (known && !form.trade.trim()) update({ trade: known });
              }}
              placeholder="e.g. Sundar Lal"
              className={inputBase}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="attendanceDate" className="block text-sm text-stone-500">
                {severalDays ? "Days" : "Date"}
              </label>
              {!editingId && (
                <button
                  type="button"
                  onClick={api.toggleMultiDay}
                  aria-pressed={multiDay}
                  className="rounded px-1 text-sm font-medium text-stone-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  {multiDay ? "Just one day" : "Several days"}
                </button>
              )}
            </div>
            {severalDays ? (
              <p id="attendanceDate" className={`${inputBase} truncate`}>
                {describeDays(form.days)}
              </p>
            ) : (
              <input id="attendanceDate" type="date" required value={form.date} onChange={(e) => update({ date: e.target.value })} className={inputBase} />
            )}
          </div>
        </div>

        {severalDays && (
          <div>
            <AttendanceDays days={form.days} onChange={(days) => update({ days })} />
            <p className="mt-2 text-xs text-stone-500">Enter what each labourer is paid on each day below. Each day is saved as its own entry, which you can edit or delete on its own.</p>
          </div>
        )}

        <LabourDetails api={api} />

        <div className="grid grid-cols-1 gap-4 border-t border-stone-200 pt-6 md:grid-cols-2">
          <div>
            <label htmlFor="attendanceExtras" className={fieldLabel}>
              Extras / additional cost{severalDays ? " (each day)" : ""}
            </label>
            <MoneyInput id="attendanceExtras" value={form.extras} onChange={(extras) => update({ extras })} />
          </div>
          <div>
            <label htmlFor="attendanceNotes" className={fieldLabel}>
              Notes
            </label>
            <input id="attendanceNotes" type="text" maxLength={500} value={form.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="Optional description" className={inputBase} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded border border-stone-300 p-4">
          <span className="text-sm text-stone-500">{severalDays ? `Total for ${dayCount} ${dayCount === 1 ? "day" : "days"}` : "Total entry value"}</span>
          <span className="text-3xl font-semibold tabular-nums">{rupees(total)}</span>
        </div>

        <FormMessage tone="success">{savedNote}</FormMessage>
        <FormMessage tone="error">{error}</FormMessage>

        <div className="flex justify-end">
          <button
            type="submit"
            ref={submitRef}
            disabled={saving}
            className="flex items-center gap-2 rounded bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiSave aria-hidden />
            {saving ? "Saving…" : editingId ? "Update entry" : severalDays ? `Save ${dayCount} ${dayCount === 1 ? "entry" : "entries"} (Ctrl+S)` : "Save entry (Ctrl+S)"}
          </button>
        </div>
      </form>
    </section>
  );
}
