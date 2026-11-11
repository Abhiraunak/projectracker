"use client";

import type { FormEvent, RefObject } from "react";
import { FiCornerUpLeft, FiCornerUpRight, FiEdit2, FiSave, FiX } from "react-icons/fi";
import { fieldLabel, iconBtn, inputBase } from "@/components/utilites/fieldStyles";
import { FormMessage } from "@/components/utilites/FormMessage";
import { MoneyInput } from "@/components/utilites/MoneyInput";
import { describeDays } from "@/lib/attendance/days";
import { rupees, type PayMode } from "@/lib/attendance/form";
import type { TeamMember } from "@/lib/attendanceApi";
import { AttendanceDays } from "../AttendanceDays";
import { LabourDetails } from "./LabourDetails";
import type { AttendanceFormApi } from "./useAttendanceForm";

interface Props {
  api: AttendanceFormApi;
  projectId: string;
  /** Paid hourly: the contractor's team (names and day rates) */
  team?: TeamMember[];
  /** Trades to offer, and each contractor's usual trade (filled in when the contractor is known) */
  choices: string[];
  usual?: Record<string, string>;
  total: number;
  saving: boolean;
  error: string | null;
  savedNote: string | null;
  submitRef: RefObject<HTMLButtonElement | null>;
  /** Where trades people add are remembered on this device (e.g. per project) */
  tradeStorageKey?: string;
  onSubmit: (e: FormEvent) => void;
  onCancelEdit: () => void;
}

/** The "New entry" / "Editing entry" card: trade, contractor, day(s), labourers, extras, notes, total, save */
export function EntryForm({ api, projectId, team, usual, total, saving, error, savedNote, submitRef, onSubmit, onCancelEdit }: Props) {
  const { form, update, editing, editingBatchId, severalDays, multiDay } = api;
  const dayCount = severalDays ? form.days.length : 1;

  return (
    <section className={`rounded border ${editing ? "border-stone-900" : "border-stone-300"}`} aria-label={editing ? "Edit attendance entry" : "New attendance entry"}>
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          {editingBatchId ? `Editing ${dayCount} days` : editing ? "Editing entry" : "New entry"}
          {editing && (
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
          {editing && (
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
        <PayModeSwitch value={form.payMode} onChange={api.setPayMode} locked={editing} />

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
              // No trade picker: a known contractor still brings their usual trade along (kept out of sight), so their
              // entries, contract work and payments stay on one line
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
              {!editing && (
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
            <p className="mt-2 text-xs text-stone-500">Enter what each labourer is paid on each day below. Each day counts on its own date. Days saved together stay together in Saved records, and open together to edit.</p>
          </div>
        )}

        <LabourDetails api={api} projectId={projectId} team={team} />

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
            {saving ? "Saving…" : editingBatchId ? `Update ${dayCount} ${dayCount === 1 ? "day" : "days"} (Ctrl+S)` : editing ? "Update entry" : severalDays ? `Save ${dayCount} ${dayCount === 1 ? "entry" : "entries"} (Ctrl+S)` : "Save entry (Ctrl+S)"}
          </button>
        </div>
      </form>
    </section>
  );
}

const PAY_MODES: { key: PayMode; label: string; hint: string }[] = [
  { key: "hourly", label: "Paid hourly", hint: "Hours + OT × rate per hour" },
  { key: "daily", label: "Paid by day", hint: "Present / absent × day rate" },
  { key: "amount", label: "Paid monthly", hint: "Type each labourer's amount" },
];

/**
 * How this contractor's team is paid. Paid hourly: hours and overtime × each labourer's rate per hour. Paid by day:
 * tap present or absent; present pays the day rate. Paid monthly: the amounts are typed, as before. A saved entry
 * can move between hourly and by day (both are hours underneath), but not to or from typed amounts.
 */
function PayModeSwitch({ value, onChange, locked }: { value: PayMode; onChange: (mode: PayMode) => void; locked: boolean }) {
  return (
    <div>
      <div role="group" aria-label="How this team is paid" className="grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1 sm:inline-grid sm:min-w-xl">
        {PAY_MODES.map((m) => {
          const on = value === m.key;
          const blocked = locked && !on && (m.key === "amount" || value === "amount");
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={on}
              disabled={blocked}
              onClick={() => onChange(m.key)}
              className={`rounded-md px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:cursor-not-allowed disabled:opacity-40 ${
                on ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <span className="block text-sm font-semibold">{m.label}</span>
              <span className="hidden text-xs text-stone-500 sm:block">{m.hint}</span>
            </button>
          );
        })}
      </div>
      {locked && value === "amount" && <p className="mt-1.5 text-xs text-stone-500">A saved entry keeps how it was paid.</p>}
    </div>
  );
}