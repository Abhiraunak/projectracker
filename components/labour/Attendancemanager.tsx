"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FiAlertCircle,
  FiCommand,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiEdit2,
  FiPlus,
  FiPrinter,
  FiSave,
  FiSearch,
  FiTrash2,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { Heading } from "@/components/utilites/Label";
import { describeError } from "@/lib/api";
import type { AttendancePayload, AttendanceRecord } from "@/lib/attendanceApi";
import { useAttendanceList, useDeleteAttendance, useSaveAttendance } from "@/hooks/useAttendance";
import { Pagination } from "./Pagination";

/* -------------------------------------------------------------------------- */
/*  Types & helpers                                                           */
/* -------------------------------------------------------------------------- */

interface WorkerRow {
  id: string;
  label: string;
  amount: number | "";
}

interface FormState {
  contractorName: string;
  date: string;
  workers: WorkerRow[];
  extras: number | "";
  notes: string;
}

const PAGE_SIZE = 5;

// crypto.randomUUID only exists in secure contexts (https / localhost)
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** Local date, not UTC: toISOString() would give yesterday's date early in the morning in India */
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// A function, not a constant: every reset gets fresh row ids instead of sharing one set
const createDefaultForm = (): FormState => ({
  contractorName: "",
  date: todayLocal(),
  workers: [
    { id: newId(), label: "L1", amount: "" },
    { id: newId(), label: "L2", amount: "" },
  ],
  extras: "",
  notes: "",
});

const rupees = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const num = (v: number | "") => (v === "" ? 0 : v);
const toInput = (v: string): number | "" => (v === "" ? "" : Number(v));

function formatDay(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("en-GB");
}

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const inputBase =
  "w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 " +
  "focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20";

const iconBtn =
  "rounded p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900";

/* -------------------------------------------------------------------------- */
/*  Print slip                                                                */
/*  Rendered into <body> and shown only when printing. While printing, every  */
/*  other part of the page is hidden, so only this slip comes out on paper.   */
/* -------------------------------------------------------------------------- */

const PRINT_CSS = `
  @page { margin: 16mm; }
  @media print {
    /* Hide the whole app (sidebar, header, tabs, everything) except the slip */
    body > *:not(#attendance-print-root) { display: none !important; }

    /* App shells often lock the page to screen height, which would clip a long slip */
    html, body {
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }

    /* Always black on white, even if the app is in dark mode */
    #attendance-print-root {
      display: block !important;
      position: static !important;
      background: #fff !important;
      color: #000 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    #attendance-print-root * { color: #000 !important; }
  }
`;

function PrintSlip({ title, form, total }: { title: string; form: FormState; total: number }) {
  // Only rows that actually have an amount, so empty rows don't print
  const rows = form.workers.filter((w) => num(w.amount) > 0);
  const extras = num(form.extras);

  return createPortal(
    <div id="attendance-print-root" className="hidden text-black">
      <h1 className="text-2xl font-bold">{title}</h1>

      <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="font-semibold">Contractor:</dt>
          <dd>{form.contractorName.trim() || "-"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold">Date:</dt>
          <dd>{formatDay(form.date)}</dd>
        </div>
      </dl>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="w-12 py-2 pr-2 font-semibold">No.</th>
            <th className="py-2 font-semibold">Labourer</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-3 text-center">
                No amounts entered
              </td>
            </tr>
          ) : (
            rows.map((w, i) => (
              <tr key={w.id} className="border-b border-stone-300">
                <td className="py-2 pr-2">{i + 1}</td>
                <td className="py-2">{w.label.trim() || "Labour"}</td>
                <td className="py-2 text-right tabular-nums">{rupees(num(w.amount))}</td>
              </tr>
            ))
          )}
          {extras > 0 && (
            <tr className="border-b border-stone-300">
              <td />
              <td className="py-2">Extras / additional cost</td>
              <td className="py-2 text-right tabular-nums">{rupees(extras)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black">
            <td />
            <td className="py-3 text-base font-bold">Total</td>
            <td className="py-3 text-right text-base font-bold tabular-nums">{rupees(total)}</td>
          </tr>
        </tfoot>
      </table>

      {form.notes.trim() && (
        <p className="mt-6 text-sm">
          <span className="font-semibold">Notes:</span> {form.notes.trim()}
        </p>
      )}
    </div>,
    document.body
  );
}

/* -------------------------------------------------------------------------- */
/*  Undo / redo engine                                                        */
/* -------------------------------------------------------------------------- */

function useFormHistory<T>(init: () => T) {
  const [initial] = useState(init);
  const [formData, setFormData] = useState<T>(initial);
  const pastRef = useRef<T[]>([initial]);
  const futureRef = useRef<T[]>([]);
  const isUndoRedoAction = useRef(false);
  const stateRef = useRef<T>(initial);

  // Snapshot after the user pauses typing for 300ms
  useEffect(() => {
    stateRef.current = formData;
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const past = pastRef.current;
      if (JSON.stringify(formData) !== JSON.stringify(past[past.length - 1])) {
        past.push(formData);
        futureRef.current = [];
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formData]);

  const undo = useCallback(() => {
    const past = pastRef.current;
    const current = stateRef.current;
    // Capture typing that hasn't been snapshotted yet, so undo steps back one edit at a time
    if (JSON.stringify(current) !== JSON.stringify(past[past.length - 1])) {
      past.push(current);
      futureRef.current = [];
    }
    if (past.length > 1) {
      isUndoRedoAction.current = true;
      futureRef.current.push(past.pop()!);
      setFormData(past[past.length - 1]!);
    }
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (next) {
      isUndoRedoAction.current = true;
      pastRef.current.push(next);
      setFormData(next);
    }
  }, []);

  const resetHistory = useCallback((state: T) => {
    setFormData(state);
    pastRef.current = [state];
    futureRef.current = [];
  }, []);

  return { formData, setFormData, undo, redo, resetHistory };
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function AttendanceManager({ projectId }: { projectId: string }) {
  const { formData, setFormData, undo, redo, resetHistory } = useFormHistory(createDefaultForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [printTitle, setPrintTitle] = useState(""); // optional, only used for printing
  const [mounted, setMounted] = useState(false); // the print slip needs document.body
  const query = useDebounced(search.trim(), 300);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  // Records, search and pagination all come from the server
  const list = useAttendanceList({ projectId, q: query || undefined, page, pageSize: PAGE_SIZE });
  const save = useSaveAttendance();
  const remove = useDeleteAttendance();

  useEffect(() => setPage(1), [query]); // new search starts on page 1

  // After deleting the last row of the last page, step back instead of showing an empty page
  useEffect(() => {
    if (list.data && page > list.data.totalPages) setPage(list.data.totalPages);
  }, [list.data, page]);

  /* ----------------------------- Shortcuts ------------------------------ */

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        submitBtnRef.current?.click();
      } else if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  /* ---------------------------- Form handlers --------------------------- */

  const addWorker = (autoFocus = false, focusField: "label" | "amount" = "label", focusIndex = 0) => {
    setFormData((prev) => ({
      ...prev,
      workers: [...prev.workers, { id: newId(), label: `L${prev.workers.length + 1}`, amount: "" }],
    }));
    if (autoFocus) {
      setTimeout(() => {
        const el = document.getElementById(`worker-${focusIndex}-${focusField}`) as HTMLInputElement | null;
        el?.focus();
        el?.select();
      }, 50);
    }
  };

  const removeWorker = (id: string) =>
    setFormData((prev) => ({ ...prev, workers: prev.workers.filter((w) => w.id !== id) }));

  const changeWorker = (id: string, patch: Partial<WorkerRow>) =>
    setFormData((prev) => ({ ...prev, workers: prev.workers.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));

  // Arrow keys / Enter move through the grid; Enter on the last row adds a new one
  const handleGridNavigation = (e: React.KeyboardEvent, index: number, field: "label" | "amount") => {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      const next = document.getElementById(`worker-${index + 1}-${field}`) as HTMLInputElement | null;
      if (next) {
        next.focus();
        next.select();
      } else if (e.key === "Enter" && index === formData.workers.length - 1) {
        addWorker(true, field, index + 1);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = document.getElementById(`worker-${index - 1}-${field}`) as HTMLInputElement | null;
      prev?.focus();
      prev?.select();
    }
  };

  // Display only: the server recomputes the real total when saving
  const formTotal = formData.workers.reduce((sum, w) => sum + num(w.amount), 0) + num(formData.extras);

  /* -------------------------------- Print -------------------------------- */

  // A title typed by the user wins; otherwise "Payment details: <contractor name>"
  const contractor = formData.contractorName.trim();
  const defaultTitle = contractor ? `Payment details: ${contractor}` : "Payment details";
  const slipTitle = printTitle.trim() || defaultTitle;

  const handlePrint = () => {
    // Browsers use the page title as the default PDF file name
    const previous = document.title;
    document.title = slipTitle;
    window.addEventListener("afterprint", () => (document.title = previous), { once: true });
    window.print();
  };

  /* ------------------------------ Submit etc. ----------------------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contractorName.trim()) {
      setFormError("Please enter a contractor name.");
      document.getElementById("contractorNameInput")?.focus();
      return;
    }
    setFormError(null);

    const payload: AttendancePayload = {
      projectId,
      contractorName: formData.contractorName.trim(),
      date: formData.date,
      workers: formData.workers.map((w) => ({ label: w.label.trim() || "Labour", amount: num(w.amount) })),
      extras: num(formData.extras),
      notes: formData.notes.trim(),
    };

    try {
      await save.mutateAsync({ id: editingId ?? undefined, data: payload });
    } catch (err) {
      setFormError(describeError(err));
      return;
    }

    // Keep the contractor and rows for the next entry, clear amounts. This also clears undo history.
    resetHistory({
      ...formData,
      workers: formData.workers.map((w) => ({ ...w, amount: "" })),
      extras: "",
      notes: "",
    });
    setEditingId(null);
    setPrintTitle("");
    setSearch("");
    setPage(1);
    document.getElementById("contractorNameInput")?.focus();
  };

  const handleEditRecord = (r: AttendanceRecord) => {
    resetHistory({
      contractorName: r.contractorName,
      date: r.date,
      workers: r.workers.map((w) => ({ id: w.id, label: w.label, amount: w.amount === 0 ? "" : w.amount })),
      extras: r.extras === 0 ? "" : r.extras,
      notes: r.notes,
    });
    setEditingId(r.id);
    setFormError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormError(null);
    setPrintTitle("");
    resetHistory(createDefaultForm());
  };

  const handleDelete = (r: AttendanceRecord) => {
    if (!window.confirm(`Delete the entry for ${r.contractorName} on ${formatDay(r.date)}?`)) return;
    setListError(null);
    remove.mutate(r.id, {
      onSuccess: () => {
        if (editingId === r.id) cancelEdit();
      },
      onError: (err) => setListError(describeError(err)),
    });
  };

  /* ------------------------------- Render ------------------------------- */

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <style>{PRINT_CSS}</style>
      {mounted && <PrintSlip title={slipTitle} form={formData} total={formTotal} />}

      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Heading>Labour attendance</Heading>
          <p className="mt-1 text-sm text-stone-500">Track and update daily contractor payments</p>
          <p className="mt-2 hidden items-center gap-2 text-xs text-stone-500 md:flex">
            <FiCommand aria-hidden />
            <span>
              <kbd className="rounded border border-stone-300 px-1">↓</kbd> or{" "}
              <kbd className="rounded border border-stone-300 px-1">Enter</kbd> to move,{" "}
              <kbd className="rounded border border-stone-300 px-1">Ctrl</kbd>+
              <kbd className="rounded border border-stone-300 px-1">S</kbd> to save
            </span>
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-auto">
          <div className="sm:w-72">
            <label htmlFor="printTitle" className="mb-1.5 block text-sm text-stone-500">
              Print title (optional)
            </label>
            <input
              id="printTitle"
              type="text"
              maxLength={80}
              value={printTitle}
              onChange={(e) => setPrintTitle(e.target.value)}
              placeholder={defaultTitle}
              className={inputBase}
            />
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <FiPrinter aria-hidden /> Print slip
          </button>
        </div>
      </div>

      {/* ================================ Form ================================ */}
      <section
        className={`rounded border ${editingId ? "border-stone-900" : "border-stone-300"}`}
        aria-label={editingId ? "Edit attendance entry" : "New attendance entry"}
      >
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
            <button type="button" onClick={undo} title="Undo (Ctrl+Z)" aria-label="Undo" className={iconBtn}>
              <FiCornerUpLeft aria-hidden />
            </button>
            <button type="button" onClick={redo} title="Redo (Ctrl+Y)" aria-label="Redo" className={iconBtn}>
              <FiCornerUpRight aria-hidden />
            </button>
            {editingId && (
              <>
                <span className="mx-2 h-4 w-px bg-stone-300" />
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex items-center gap-1 rounded px-1 text-sm font-medium text-stone-500 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                >
                  <FiX aria-hidden /> Cancel edit
                </button>
              </>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="contractorNameInput" className="mb-1.5 block text-sm text-stone-500">
                Contractor name
              </label>
              <input
                id="contractorNameInput"
                type="text"
                required
                maxLength={120}
                value={formData.contractorName}
                onChange={(e) => setFormData((prev) => ({ ...prev, contractorName: e.target.value }))}
                placeholder="e.g. Sundar Lal"
                className={inputBase}
              />
            </div>
            <div>
              <label htmlFor="attendanceDate" className="mb-1.5 block text-sm text-stone-500">
                Date
              </label>
              <input
                id="attendanceDate"
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                className={inputBase}
              />
            </div>
          </div>

          <fieldset className="rounded border border-stone-300 p-4">
            <legend className="sr-only">Labour details</legend>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FiUsers aria-hidden className="text-stone-500" /> Labour details
              </h3>
              <button
                type="button"
                onClick={() => addWorker(true, "label", formData.workers.length)}
                className="flex items-center gap-1 rounded px-1 text-sm font-medium text-stone-700 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              >
                <FiPlus aria-hidden /> Add labourer
              </button>
            </div>

            <div className="space-y-3">
              {formData.workers.map((worker, index) => (
                <div key={worker.id} className="flex items-center gap-3">
                  <input
                    id={`worker-${index}-label`}
                    type="text"
                    maxLength={40}
                    aria-label={`Labourer ${index + 1} label`}
                    value={worker.label}
                    onKeyDown={(e) => handleGridNavigation(e, index, "label")}
                    onChange={(e) => changeWorker(worker.id, { label: e.target.value })}
                    placeholder="Label (e.g. L1)"
                    className={`${inputBase} min-w-0 flex-1`}
                  />
                  <div className="relative w-36 shrink-0 sm:w-44">
                    <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-stone-400">
                      ₹
                    </span>
                    <input
                      id={`worker-${index}-amount`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      aria-label={`Labourer ${index + 1} amount`}
                      value={worker.amount}
                      onKeyDown={(e) => handleGridNavigation(e, index, "amount")}
                      onChange={(e) => changeWorker(worker.id, { amount: toInput(e.target.value) })}
                      placeholder="0"
                      className={`${inputBase} w-full pl-7 tabular-nums`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWorker(worker.id)}
                    disabled={formData.workers.length === 1}
                    aria-label={`Remove labourer ${index + 1}`}
                    className="shrink-0 rounded p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FiTrash2 aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 border-t border-stone-200 pt-6 md:grid-cols-2">
            <div>
              <label htmlFor="attendanceExtras" className="mb-1.5 block text-sm text-stone-500">
                Extras / additional cost
              </label>
              <div className="relative">
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-stone-400">
                  ₹
                </span>
                <input
                  id="attendanceExtras"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={formData.extras}
                  onChange={(e) => setFormData((prev) => ({ ...prev, extras: toInput(e.target.value) }))}
                  placeholder="0"
                  className={`${inputBase} pl-7 tabular-nums`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="attendanceNotes" className="mb-1.5 block text-sm text-stone-500">
                Notes
              </label>
              <input
                id="attendanceNotes"
                type="text"
                maxLength={500}
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional description"
                className={inputBase}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded border border-stone-300 p-4">
            <span className="text-sm text-stone-500">Total entry value</span>
            <span className="text-3xl font-semibold tabular-nums">{rupees(formTotal)}</span>
          </div>

          {formError && (
            <p role="alert" className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <FiAlertCircle aria-hidden className="mt-0.5 shrink-0" />
              {formError}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              ref={submitBtnRef}
              disabled={save.isPending}
              className="flex items-center gap-2 rounded bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiSave aria-hidden />
              {save.isPending ? "Saving…" : editingId ? "Update entry" : "Save entry (Ctrl+S)"}
            </button>
          </div>
        </form>
      </section>

      {/* ============================== Saved records ============================== */}
      <section aria-label="Saved attendance" className="rounded border border-stone-300">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Saved records</h2>
            {list.data && (
              <span className="rounded bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600">
                {list.data.total} {list.data.total === 1 ? "entry" : "entries"}
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              aria-label="Search contractor or notes"
              placeholder="Search contractor or notes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputBase} pl-9 pr-8`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:text-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              >
                <FiX aria-hidden />
              </button>
            )}
          </div>
        </div>

        {listError && (
          <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {listError}
          </p>
        )}

        {list.isPending ? (
          <div aria-busy="true" className="m-4 h-48 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />
        ) : list.isError ? (
          <div role="alert" className="m-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{describeError(list.error)}</p>
            <button type="button" onClick={() => list.refetch()} className="mt-2 font-medium underline">
              Try again
            </button>
          </div>
        ) : list.data.total === 0 ? (
          <p className="p-10 text-center text-sm text-stone-500">
            {query ? (
              <>
                No results for &ldquo;<span className="font-semibold text-stone-700">{query}</span>&rdquo;.
              </>
            ) : (
              "No entries yet. Fill in the form above and save."
            )}
          </p>
        ) : (
          <>
            <div className={`overflow-x-auto transition-opacity ${list.isPlaceholderData ? "opacity-60" : ""}`}>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-stone-200 text-stone-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Date</th>
                    <th scope="col" className="px-4 py-3 font-medium">Contractor</th>
                    <th scope="col" className="px-4 py-3 font-medium">Labourers</th>
                    <th scope="col" className="px-4 py-3 font-medium">Notes</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {list.data.items.map((r) => (
                    <tr key={r.id} className="hover:bg-stone-50">
                      <td className="whitespace-nowrap px-4 py-3 text-stone-600">{formatDay(r.date)}</td>
                      <td className="px-4 py-3 font-medium">{r.contractorName}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.workers.map((w) => (
                            <span key={w.id} className="rounded border border-stone-200 px-2 py-0.5 text-xs text-stone-600">
                              {w.label}: {rupees(w.amount)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-stone-500" title={r.notes}>
                        {r.notes || "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{rupees(r.totalAmount)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleEditRecord(r)}
                          aria-label={`Edit entry for ${r.contractorName} on ${formatDay(r.date)}`}
                          className={iconBtn}
                        >
                          <FiEdit2 aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          aria-label={`Delete entry for ${r.contractorName} on ${formatDay(r.date)}`}
                          className={`${iconBtn} hover:bg-red-50 hover:text-red-600`}
                        >
                          <FiTrash2 aria-hidden />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={list.data.totalPages}
              total={list.data.total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}