"use client";

import { useCallback, useState } from "react";
import { FiChevronDown, FiChevronRight, FiLock, FiPrinter } from "react-icons/fi";
import { SearchInput } from "@/components/utilites/SearchInput";
import { useDebounced } from "@/hooks/useDebounced";
import { useRegisters, useWorkItems } from "@/hooks/useAttendance";
import { describeError } from "@/lib/api";
import { attendanceApi, type OpenSheet, type Register } from "@/lib/attendanceApi";
import { rupees } from "@/lib/attendance/form";
import { shortDay } from "@/lib/attendance/days";
import { RegisterPrint } from "./RegisterPrint";
import { workLabel } from "./WorkItemPicker";

const SHOW_DAYS = 10; // chips before "+n more"

/**
 * Saved records, grouped by work item (Flooring, then the next…, General last), and inside each one row per
 * contractor (team head): every day they have under that work item. Days in settled weeks are folded into one grey
 * chip per week (paid and locked); open days are listed one by one. Each heading folds its group away.
 * "Open sheet" opens that contractor's open days of that work item in one grid; "Print" prints that sheet.
 */
export function RegistersPanel({ projectId, projectTitle, onOpen }: { projectId: string; projectTitle?: string; onOpen: (sheet: OpenSheet) => void }) {
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 250);
  const regs = useRegisters(projectId, q);
  const workItems = useWorkItems(projectId); // only for the order of the groups: the project's own order
  const [folded, setFolded] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState<string | null>(null); // "open:<key>" or "print:<key>"
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState<{ open: OpenSheet; register: Register } | null>(null);

  const donePrinting = useCallback(() => setPrinting(null), []); // stable: the print view prints once

  const load = async (r: Register, then: (s: OpenSheet) => void, kind: "open" | "print") => {
    setBusy(`${kind}:${r.key}`);
    setError(null);
    try {
      then(await attendanceApi.sheet(projectId, r.contractorName, r.taskId ?? null));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const items = regs.data?.items ?? [];

  // One group per work item, in the project's order; General (no work item) last
  const order = new Map((workItems.data?.items ?? []).map((w, i) => [w.id, i]));
  const groups = new Map<string, { id: string; title: string; rows: Register[]; total: number }>();
  for (const r of items) {
    const id = r.taskId ?? "general";
    let g = groups.get(id);
    if (!g) groups.set(id, (g = { id, title: workLabel(r), rows: [], total: 0 }));
    g.rows.push(r);
    g.total += r.workTotal ?? 0;
  }
  const rank = (id: string) => (id === "general" ? Number.MAX_SAFE_INTEGER : (order.get(id) ?? Number.MAX_SAFE_INTEGER - 1));
  const grouped = [...groups.values()].sort((a, b) => rank(a.id) - rank(b.id) || a.title.localeCompare(b.title));
  const toggle = (id: string) =>
    setFolded((f) => {
      const next = new Set(f);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section aria-label="Saved records" className="rounded border border-stone-300">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          Saved records
          {regs.data && (
            <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
              {grouped.length} {grouped.length === 1 ? "work item" : "work items"}
            </span>
          )}
        </h2>
        <SearchInput value={search} onChange={setSearch} label="Search contractor or work item" className="w-full sm:w-64" />
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
        <p className="px-4 py-8 text-center text-sm text-stone-500">{q ? "No contractor or work item matches that." : "No attendance yet."}</p>
      ) : (
        <div className={`divide-y divide-stone-300 ${regs.isPlaceholderData ? "opacity-60" : ""}`}>
          {grouped.map((g) => {
            const open = !folded.has(g.id);
            return (
              <div key={g.id}>
                <button
                  type="button"
                  onClick={() => toggle(g.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-2 bg-stone-50 px-4 py-2.5 text-left hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900"
                >
                  {open ? <FiChevronDown aria-hidden className="text-stone-500" /> : <FiChevronRight aria-hidden className="text-stone-500" />}
                  <span className="flex-1 font-semibold text-stone-900">{g.title}</span>
                  <span className="text-xs text-stone-500">
                    {g.rows.length} {g.rows.length === 1 ? "contractor" : "contractors"}
                  </span>
                  <span className="w-24 text-right text-sm font-semibold tabular-nums text-stone-900">{rupees(g.total)}</span>
                </button>
                {open && (
                  <ul className="divide-y divide-stone-200">
                    {g.rows.map((r) => (
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

                        <p className="text-sm font-semibold tabular-nums text-stone-900 md:text-right">
                          <span className="text-xs font-normal text-stone-400 md:hidden">{g.title} </span>
                          {rupees(r.workTotal ?? 0)}
                        </p>
                        <p
                          title="What this contractor is still owed for all their work (pay them in This week)"
                          className={`text-sm tabular-nums md:text-right ${r.toPay > 0 ? "text-stone-600" : "text-green-700"}`}
                        >
                          <span className="text-xs text-stone-400">To pay </span>
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
                            aria-label={`Print ${r.contractorName}'s ${g.title} sheet`}
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
              </div>
            );
          })}
        </div>
      )}

      {printing && <RegisterPrint open={printing.open} register={printing.register} projectTitle={projectTitle} onDone={donePrinting} />}
    </section>
  );
}