import type { AttendanceManyPayload, AttendancePayload, AttendanceRecord } from "@/lib/attendanceApi";
import { describeDays, shortDay, weekday } from "./days";

/*
 * The attendance entry form as plain data, and everything worked out from it. No React here, so every rule can be
 * unit-tested and reused (the form, the print slip, the day grid all read the same functions).
 */

export interface WorkerRow {
  id: string;
  label: string;
  amount: number | ""; // one day
  amounts: Record<string, number | "">; // several days: what this labourer is paid on each day ("YYYY-MM-DD")
}

export interface AttendanceForm {
  trade: string; // "Civil", "Tiles"…: which part of the work this entry pays for
  contractorName: string;
  date: string; // one day
  days: string[]; // several days: one entry is saved for each
  workers: WorkerRow[];
  extras: number | "";
  notes: string;
}

/** Shown until the project's own trades arrive (the server sends the same list, plus any trade the project uses) */
export const DEFAULT_TRADES = ["Civil", "Architecture", "Tiles", "Fabrication", "Plumbing", "Electrical", "Painting", "Carpentry"];

/* ---------------------------------------------- basics ---------------------------------------------- */

// crypto.randomUUID only exists in secure contexts (https / localhost)
export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** Local date, not UTC: toISOString() would give yesterday's date early in the morning in India */
export const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const rupees = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
/** An input's number ("" while empty) as a number */
export const num = (v: number | "") => (v === "" ? 0 : v);
/** An input's text as a number, keeping "" so the box can be empty */
export const toInput = (v: string): number | "" => (v === "" ? "" : Number(v));

/** 31/10/2026 */
export function formatDay(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("en-GB");
}

export const newWorker = (n: number): WorkerRow => ({ id: newId(), label: `L${n}`, amount: "", amounts: {} });

// A function, not a constant: every reset gets fresh row ids instead of sharing one set
export const emptyForm = (): AttendanceForm => ({
  trade: "",
  contractorName: "",
  date: todayLocal(),
  days: [],
  workers: [newWorker(1), newWorker(2)],
  extras: "",
  notes: "",
});

/* ---------------------------------------------- totals ---------------------------------------------- */

/** What a labourer is paid on one of the chosen days (several-days mode) */
export const dayAmount = (w: WorkerRow, day: string) => num(w.amounts[day] ?? "");
/** Everything paid on one day: each labourer's amount for that day, plus the extras */
export const dayTotal = (workers: WorkerRow[], day: string, extras: number | "") => workers.reduce((sum, w) => sum + dayAmount(w, day), 0) + num(extras);
/** One labourer: the day's amount, or the sum over the chosen days */
export const workerTotal = (w: WorkerRow, days: string[] | null) => (days ? days.reduce((sum, d) => sum + dayAmount(w, d), 0) : num(w.amount));

/** Display only: the server recomputes the real totals when saving */
export const formTotal = (f: AttendanceForm, severalDays: boolean) =>
  severalDays ? f.days.reduce((sum, d) => sum + dayTotal(f.workers, d, f.extras), 0) : f.workers.reduce((sum, w) => sum + num(w.amount), 0) + num(f.extras);

/* --------------------------------------------- changes --------------------------------------------- */

/** Several days: the labourer's first filled-in amount, copied to every chosen day */
export function sameEveryDay(f: AttendanceForm, id: string): AttendanceForm {
  return {
    ...f,
    workers: f.workers.map((w) => {
      if (w.id !== id) return w;
      const first = f.days.map((d) => w.amounts[d] ?? "").find((v) => v !== "") ?? "";
      return { ...w, amounts: Object.fromEntries(f.days.map((d) => [d, first])) };
    }),
  };
}

/** Switching to several days starts from the day already chosen, with the amounts already typed on that day */
export function toSeveralDays(f: AttendanceForm): AttendanceForm {
  const days = f.days.length ? f.days : [f.date];
  const first = days[0]!;
  return { ...f, days, workers: f.workers.map((w) => (w.amounts[first] === undefined ? { ...w, amounts: { ...w.amounts, [first]: w.amount } } : w)) };
}

/** Switching back keeps the first chosen day and its amounts */
export function toOneDay(f: AttendanceForm): AttendanceForm {
  const first = f.days[0];
  return { ...f, date: first ?? f.date, workers: first ? f.workers.map((w) => ({ ...w, amount: w.amounts[first] ?? w.amount })) : f.workers };
}

/** After saving: keep the trade, contractor and rows for the next entry; clear the amounts */
export const readyForNext = (f: AttendanceForm): AttendanceForm => ({
  ...f,
  workers: f.workers.map((w) => ({ ...w, amount: "", amounts: {} })),
  extras: "",
  notes: "",
  days: [], // those days are saved now: choosing them again by mistake would double-count them
});

/** A saved record, loaded back into the form to edit */
export const fromRecord = (r: AttendanceRecord): AttendanceForm => ({
  trade: r.trade,
  contractorName: r.contractorName,
  date: r.date,
  workers: r.workers.map((w) => ({ id: w.id, label: w.label, amount: w.amount === 0 ? "" : w.amount, amounts: {} })),
  extras: r.extras === 0 ? "" : r.extras,
  notes: r.notes,
  days: [],
});

/* ------------------------------------------ checks and saving ------------------------------------------ */

export interface Problem {
  message: string;
  /** The field to put the cursor in */
  focus?: "tradeInput" | "contractorNameInput";
}

/** What is missing before the form can be saved, or null */
export function checkForm(f: AttendanceForm, severalDays: boolean): Problem | null {
  if (!f.trade.trim()) return { message: "Choose the trade this entry is for (Civil, Tiles…).", focus: "tradeInput" };
  if (!f.contractorName.trim()) return { message: "Please enter a contractor name.", focus: "contractorNameInput" };
  if (!severalDays) return null;
  if (f.days.length === 0) return { message: "Choose at least one day." };
  const empty = f.days.filter((d) => dayTotal(f.workers, d, f.extras) === 0);
  if (empty.length)
    return {
      message: `Nothing is paid on ${empty.map((d) => `${weekday(d)} ${shortDay(d)}`).join(", ")}. Enter the amounts, or remove ${empty.length === 1 ? "that day" : "those days"}.`,
    };
  return null;
}

/** One day's entry, as the API takes it */
export const toPayload = (f: AttendanceForm, projectId: string): AttendancePayload => ({
  projectId,
  contractorName: f.contractorName.trim(),
  trade: f.trade.trim(),
  date: f.date,
  workers: f.workers.map((w) => ({ label: w.label.trim() || "Labour", amount: num(w.amount) })),
  extras: num(f.extras),
  notes: f.notes.trim(),
});

/** Several days at once: each labourer's amount on each chosen day */
export function toManyPayload(f: AttendanceForm, projectId: string): AttendanceManyPayload {
  const { date: _one, workers: _same, ...rest } = toPayload(f, projectId);
  return {
    ...rest,
    projectId,
    dates: f.days,
    workers: f.workers.map((w) => ({ label: w.label.trim() || "Labour", amount: 0, amounts: Object.fromEntries(f.days.map((d) => [d, dayAmount(w, d)])) })),
  };
}

export const savedManyNote = (count: number, f: AttendanceForm) => `Saved ${count} entries for ${f.contractorName.trim()}: ${describeDays(f.days)}.`;
