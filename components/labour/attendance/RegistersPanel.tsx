"use client";

import { useCallback, useState } from "react";
import { FiLock, FiPrinter } from "react-icons/fi";
import { SearchInput } from "@/components/utilites/SearchInput";
import { useDebounced } from "@/hooks/useDebounced";
import { useRegisters } from "@/hooks/useAttendance";
import { describeError } from "@/lib/api";
import { attendanceApi, type OpenSheet, type Register } from "@/lib/attendanceApi";
import { rupees } from "@/lib/attendance/form";
import { shortDay } from "@/lib/attendance/days";
import { RegisterPrint } from "./RegisterPrint";

const SHOW_DAYS = 10; // chips before "+n more"

/**
 * Saved records, one row per contractor (team head): every day they have attendance in one place. Days in settled
 * weeks are folded into one grey chip per week (paid and locked); open days are listed one by one.
 * "Open sheet" opens all open days in one grid to change or carry on; "Print" prints that sheet with page numbers.
 */
export function RegistersPanel({ projectId, projectTitle, onOpen }: { projectId: string; projectTitle?: string; onOpen: (sheet: OpenSheet) => void }) {
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 250);
  const regs = useRegisters(projectId, q);
  const [busy, setBusy] = useState<string | null>(null); // "open:<key>" or "print:<key>"
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState<{ open: OpenSheet; register: Register } | null>(null);

  const donePrinting = useCallback(() => setPrinting(null), []); // stable: the print view prints once

  const load = async (r: Register, then: (s: OpenSheet) => void, kind: "open" | "print") => {
    setBusy(`${kind}:${r.key}`);
    setError(null);
    try {
      then(await attendanceApi.sheet(projectId, r.contractorName));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const items = regs.data?.items ?? [];

  return (
    <section aria-label="Saved records" className="rounded border border-stone-300">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          Saved records
          {regs.data && (
            <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
              {items.length} {items.length === 1 ? "contractor" : "contractors"}
            </span>
          )}
        </h2>
        <SearchInput value={search} onChange={setSearch} label="Search contractor" className="w-full sm:w-64" />
      </div>

      {error && (
        <p role="alert" className="mx-4 mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {regs.isPending ? (
        <div aria-busy="true" className="m-4 h-24 animate-pulse rounded bg-stone-100" />
      ) : regs.isError ? (
        <p className="px-4 py-6 text-sm text-red-700">{describeError(regs.error)}</p>
      ) : items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-stone-500">{q ? "No contractor matches that." : "No attendance yet."}</p>
      ) : (
        <ul className={`divide-y divide-stone-200 ${regs.isPlaceholderData ? "opacity-60" : ""}`}>
          {items.map((r) => (
            <li key={r.key} className="grid gap-3 px-4 py-3.5 md:grid-cols-[10rem_minmax(0,1fr)_7rem_8rem_auto] md:items-center">
              <p className="font-semibold text-stone-900">{r.contractorName}</p>

              <div className="flex min-w-0 flex-wrap gap-1">
                {r.settledWeeks.map((w) => (
                  <span key={w.start} title={`Settled and paid: ${rupees(w.total)}`} className="inline-flex items-center gap-1 rounded border border-dashed border-stone-300 bg-stone-50 px-1.5 py-0.5 text-xs text-stone-400">
                    <FiLock aria-hidden className="text-[10px]" />
                    {shortDay(w.start)}–{shortDay(w.end)}
                  </span>
                ))}
                {r.openDays.slice(-SHOW_DAYS).map((d) => (
                  <span key={d.date} title={rupees(d.total)} className="rounded border border-stone-300 px-1.5 py-0.5 text-xs text-stone-700">
                    {shortDay(d.date)}
                  </span>
                ))}
                {r.openDays.length > SHOW_DAYS && <span className="px-1 py-0.5 text-xs text-stone-500">+{r.openDays.length - SHOW_DAYS} more</span>}
                {r.openDays.length === 0 && <span className="text-xs text-stone-500">No open days: all settled</span>}
              </div>

              <p className="text-sm tabular-nums text-stone-600 md:text-right">
                <span className="text-xs text-stone-400 md:hidden">Earned </span>
                {rupees(r.earned)}
              </p>
              <p className={`text-sm font-semibold tabular-nums md:text-right ${r.toPay > 0 ? "text-stone-900" : "text-green-700"}`}>
                <span className="text-xs font-normal text-stone-400 md:hidden">Still to pay </span>
                {r.toPay < 0 ? `${rupees(-r.toPay)} advance` : rupees(r.toPay)}
              </p>

              <div className="flex gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => void load(r, onOpen, "open")}
                  disabled={busy !== null}
                  className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-stone-900 px-3 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60 md:flex-none"
                >
                  {busy === `open:${r.key}` ? "Opening…" : r.openDays.length ? "Open sheet" : "New sheet"}
                </button>
                <button
                  type="button"
                  onClick={() => void load(r, (open) => setPrinting({ open, register: r }), "print")}
                  disabled={busy !== null || r.openDays.length === 0}
                  aria-label={`Print ${r.contractorName}'s sheet`}
                  title={r.openDays.length ? "Print the open days" : "Nothing open to print"}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-3 text-sm font-medium text-stone-800 hover:border-stone-900 disabled:opacity-40"
                >
                  <FiPrinter aria-hidden /> {busy === `print:${r.key}` ? "…" : "Print"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {printing && <RegisterPrint open={printing.open} register={printing.register} projectTitle={projectTitle} onDone={donePrinting} />}
    </section>
  );
}