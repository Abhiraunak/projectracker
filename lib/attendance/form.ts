import type { AttendanceBatch, AttendanceManyPayload, AttendancePayload, AttendanceRecord } from "@/lib/attendanceApi";
import { describeDays, shortDay, weekday } from "./days";

/*
 * The attendance entry form as plain data, and everything worked out from it. No React here, so every rule can be
 * unit-tested and reused (the form, the print slip, the day grid all read the same functions).
 */

export interface WorkerRow {
  id: string;
  label: string; // L1, L2… when paid by amount; the labourer's name when paid hourly
  amount: number | ""; // one day
  amounts: Record<string, number | "">; // several days: what this labourer is paid on each day ("YYYY-MM-DD")
  // Paid hourly or by day: rupees for a full day of 8 hours (the hourly sheet shows and takes it per hour), then hours
  // and overtime (one day, or by day when entering several). Paid by day: present = 8 hours, absent = blank.
  dayRate: number | "";
  hours: number | "";
  ot: number | "";
  hoursByDay: Record<string, number | "">;
  otByDay: Record<string, number | "">;
  // A day that differs (paid hourly or by day): its own day rate (the rate changed) and rupees on top (paid extra)
  extra: number | ""; // one day
  rateByDay: Record<string, number | "">;
  extraByDay: Record<string, number | "">;
}

/**
 * "amount" ("Paid monthly"): rupees typed for each labourer, as before.
 * "hourly" ("Paid hourly"): the team's names and rates per hour, hours and overtime each day; hours × rate = pay,
 *          so 8 hours at ₹100 an hour is ₹800.
 * "daily"  ("Paid by day"): present or absent each day × the day rate. Saved as 8 hours at day rate ÷ 8, so the
 *          server, the month sheet and the payments all read it like an hourly day.
 */
export type PayMode = "amount" | "hourly" | "daily";
export const STANDARD_HOURS = 8; // a full day is 8 hours; overtime is paid at the same hourly rate
/** Paid hourly or by day: names, rates and hours rather than typed amounts */
export const byHours = (mode: PayMode) => mode !== "amount";

/** The day rate kept in the form, shown as a rate per hour (₹800 a day → ₹100 an hour) */
export const hourRateOf = (dayRate: number | ""): number | "" => (dayRate === "" ? "" : Math.round((dayRate / STANDARD_HOURS) * 10000) / 10000);
/** A rate per hour typed in the hourly sheet, kept as the day rate (₹100 an hour → ₹800 a day) */
export const dayRateFromHour = (perHour: number | ""): number | "" => (perHour === "" ? "" : perHour * STANDARD_HOURS);

export interface AttendanceForm {
  payMode: PayMode;
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

// A function: every row gets its own by-day objects instead of sharing one
const blankHours = () => ({ dayRate: "" as const, hours: "" as const, ot: "" as const, hoursByDay: {}, otByDay: {}, ...noChanges() });
/** No day with its own rate or an extra amount */
const noChanges = () => ({ extra: "" as const, rateByDay: {}, extraByDay: {} });
export const newWorker = (n: number, mode: PayMode = "amount"): WorkerRow => ({ id: newId(), label: byHours(mode) ? "" : `L${n}`, amount: "", amounts: {}, ...blankHours() });

/** Paid hourly: one row per labourer still on the team, with their day rate, hours empty */
export const fromTeam = (members: { name: string; dayRate: number; active: boolean }[]): WorkerRow[] =>
  members.filter((m) => m.active).map((m) => ({ id: newId(), label: m.name, amount: "", amounts: {}, ...blankHours(), dayRate: m.dayRate }));

/**
 * After the team list changes: new people get a row, changed day rates follow, and someone marked as left loses
 * their row unless hours were already typed for them. Rows are matched by name.
 */
export function mergeTeam(workers: WorkerRow[], members: { name: string; dayRate: number; active: boolean }[]): WorkerRow[] {
  const key = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const byName = new Map(members.map((m) => [key(m.name), m]));
  const typed = (w: WorkerRow) =>
    w.hours !== "" || w.ot !== "" || Object.values(w.hoursByDay).some((v) => v !== "") || Object.values(w.otByDay).some((v) => v !== "");
  const kept = workers
    .filter((w) => w.label.trim() || typed(w)) // blank rows with no name go; the team fills them
    .filter((w) => byName.get(key(w.label))?.active !== false || typed(w))
    .map((w) => {
      const m = byName.get(key(w.label));
      return m ? { ...w, label: m.name, dayRate: m.dayRate } : w;
    });
  const have = new Set(kept.map((w) => key(w.label)));
  const added = fromTeam(members.filter((m) => m.active && !have.has(key(m.name))));
  return [...kept, ...added];
}

/** No amounts or hours typed yet (so filling the rows from the team list loses nothing; names alone may be replaced) */
export const untouched = (workers: WorkerRow[]) =>
  workers.every(
    (w) =>
      w.amount === "" &&
      w.hours === "" &&
      w.ot === "" &&
      w.extra === "" &&
      Object.values(w.extraByDay).every((v) => v === "") &&
      Object.values(w.amounts).every((v) => v === "") &&
      Object.values(w.hoursByDay).every((v) => v === "") &&
      Object.values(w.otByDay).every((v) => v === "")
  );

// A function, not a constant: every reset gets fresh row ids instead of sharing one set
export const emptyForm = (): AttendanceForm => ({
  payMode: "amount",
  trade: "",
  contractorName: "",
  date: todayLocal(),
  days: [],
  workers: [newWorker(1), newWorker(2)],
  extras: "",
  notes: "",
});

/* ---------------------------------------------- totals ---------------------------------------------- */

const round2 = (n: number) => Math.round(n * 100) / 100;
/** Paid hourly: (hours + OT) × rate per hour (the day rate ÷ 8), as the server works it out. 8 h at ₹100/h = ₹800 */
export const payFor = (hours: number, ot: number, dayRate: number) => round2(((hours + ot) * dayRate) / STANDARD_HOURS);

/** Paid hourly: a labourer's hours and overtime on one day (`day` null: a single-day entry) */
export const hoursOn = (w: WorkerRow, day: string | null) => ({
  hours: num(day ? (w.hoursByDay[day] ?? "") : w.hours),
  ot: num(day ? (w.otByDay[day] ?? "") : w.ot),
});

/** Paid hourly or by day: the day rate used on a day (its own rate when it was changed that day) */
export const rateOn = (w: WorkerRow, day: string | null) => {
  const own = day ? (w.rateByDay[day] ?? "") : "";
  return own === "" ? num(w.dayRate) : own;
};
/** Paid hourly or by day: rupees paid on top on a day */
export const extraOn = (w: WorkerRow, day: string | null) => num(day ? (w.extraByDay[day] ?? "") : w.extra);
/** That day has its own rate or an extra amount */
export const dayChanged = (w: WorkerRow, day: string | null) => extraOn(w, day) > 0 || (day !== null && (w.rateByDay[day] ?? "") !== "" && rateOn(w, day) !== num(w.dayRate));

/** What a labourer is paid on one of the chosen days (several-days mode) */
export const dayAmount = (w: WorkerRow, day: string, mode: PayMode = "amount") => {
  if (mode === "amount") return num(w.amounts[day] ?? "");
  const { hours, ot } = hoursOn(w, day);
  return round2(payFor(hours, ot, rateOn(w, day)) + extraOn(w, day));
};
/** Everything paid on one day: each labourer's amount for that day, plus the extras */
export const dayTotal = (workers: WorkerRow[], day: string, extras: number | "", mode: PayMode = "amount") =>
  workers.reduce((sum, w) => sum + dayAmount(w, day, mode), 0) + num(extras);
/** One labourer: the day's amount, or the sum over the chosen days */
export const workerTotal = (w: WorkerRow, days: string[] | null, mode: PayMode = "amount") => {
  if (days) return days.reduce((sum, d) => sum + dayAmount(w, d, mode), 0);
  if (mode === "amount") return num(w.amount);
  const { hours, ot } = hoursOn(w, null);
  return round2(payFor(hours, ot, num(w.dayRate)) + extraOn(w, null));
};
/** Paid hourly: a labourer's hours and overtime over the chosen days (or the one day) */
export const workerHours = (w: WorkerRow, days: string[] | null) =>
  days ? days.reduce((t, d) => ({ hours: t.hours + hoursOn(w, d).hours, ot: t.ot + hoursOn(w, d).ot }), { hours: 0, ot: 0 }) : hoursOn(w, null);

/** Display only: the server recomputes the real totals when saving */
export const formTotal = (f: AttendanceForm, severalDays: boolean) =>
  severalDays
    ? f.days.reduce((sum, d) => sum + dayTotal(f.workers, d, f.extras, f.payMode), 0)
    : f.workers.reduce((sum, w) => sum + workerTotal(w, null, f.payMode), 0) + num(f.extras);

/* --------------------------------------------- changes --------------------------------------------- */

/** Several days: the labourer's first filled-in amount (or hours and OT), copied to every chosen day */
export function sameEveryDay(f: AttendanceForm, id: string): AttendanceForm {
  const firstOf = (by: Record<string, number | "">) => f.days.map((d) => by[d] ?? "").find((v) => v !== "") ?? "";
  const everyDay = (v: number | "") => Object.fromEntries(f.days.map((d) => [d, v]));
  return {
    ...f,
    workers: f.workers.map((w) => {
      if (w.id !== id) return w;
      if (byHours(f.payMode)) {
        // The first day they worked sets both: OT follows the same day as the hours
        const day = f.days.find((d) => (w.hoursByDay[d] ?? "") !== "" || (w.otByDay[d] ?? "") !== "");
        return day ? { ...w, hoursByDay: everyDay(w.hoursByDay[day] ?? ""), otByDay: everyDay(w.otByDay[day] ?? "") } : w;
      }
      return { ...w, amounts: everyDay(firstOf(w.amounts)) };
    }),
  };
}

/** Switching how the team is paid keeps the people; amounts and hours don't carry over (they mean different things) */
export function withPayMode(f: AttendanceForm, mode: PayMode): AttendanceForm {
  if (f.payMode === mode) return f;
  // Hourly ↔ by day: the same team and rates, only the hours start again (a day is 8 hours either way)
  if (byHours(f.payMode) && byHours(mode))
    return { ...f, payMode: mode, workers: f.workers.map((w) => ({ ...w, hours: "", ot: "", hoursByDay: {}, otByDay: {}, ...noChanges() })) };
  const named = (w: WorkerRow, i: number) => (byHours(mode) ? (/^L\d+$/.test(w.label) ? "" : w.label) : w.label || `L${i + 1}`);
  return { ...f, payMode: mode, workers: f.workers.map((w, i) => ({ ...w, label: named(w, i), amount: "", amounts: {}, hours: "", ot: "", hoursByDay: {}, otByDay: {}, ...noChanges() })) };
}

/** Switching to several days starts from the day already chosen, with the amounts already typed on that day */
export function toSeveralDays(f: AttendanceForm): AttendanceForm {
  const days = f.days.length ? f.days : [f.date];
  const first = days[0]!;
  return {
    ...f,
    days,
    workers: f.workers.map((w) => ({
      ...w,
      amounts: w.amounts[first] === undefined ? { ...w.amounts, [first]: w.amount } : w.amounts,
      hoursByDay: w.hoursByDay[first] === undefined ? { ...w.hoursByDay, [first]: w.hours } : w.hoursByDay,
      otByDay: w.otByDay[first] === undefined ? { ...w.otByDay, [first]: w.ot } : w.otByDay,
      extraByDay: w.extraByDay[first] === undefined ? { ...w.extraByDay, [first]: w.extra } : w.extraByDay,
    })),
  };
}

/** Switching back keeps the first chosen day and its amounts */
export function toOneDay(f: AttendanceForm): AttendanceForm {
  const first = f.days[0];
  return {
    ...f,
    date: first ?? f.date,
    workers: first
      ? f.workers.map((w) => ({ ...w, amount: w.amounts[first] ?? w.amount, hours: w.hoursByDay[first] ?? w.hours, ot: w.otByDay[first] ?? w.ot, extra: w.extraByDay[first] ?? w.extra, dayRate: rateOn(w, first) || w.dayRate }))
      : f.workers,
  };
}

/** After saving: keep the trade, contractor and rows for the next entry; clear the amounts */
export const readyForNext = (f: AttendanceForm): AttendanceForm => ({
  ...f,
  workers: f.workers.map((w) => ({ ...w, amount: "", amounts: {}, hours: "", ot: "", hoursByDay: {}, otByDay: {}, ...noChanges() })), // names and day rates stay
  extras: "",
  notes: "",
  days: [], // those days are saved now: choosing them again by mistake would double-count them
});

/** A saved record, loaded back into the form to edit */
const blank = (n: number | null | undefined): number | "" => (n === null || n === undefined || n === 0 ? "" : n);
const dayRateOf = (hourlyRate: number | null | undefined): number | "" => (hourlyRate ? round2(hourlyRate * STANDARD_HOURS) : "");
/** A saved hourly day: the rupees paid above hours × rate (the extra that day), or "" */
const extraIn = (w: { amount: number; hours?: number | null; otHours?: number | null; hourlyRate?: number | null }): number | "" => {
  if (w.hours === null || w.hours === undefined || !w.hourlyRate) return "";
  const extra = round2(w.amount - ((w.hours ?? 0) + (w.otHours ?? 0)) * w.hourlyRate);
  return extra > 0.009 ? extra : "";
};

/** An hourly entry where everyone worked exactly a full day and no OT reads back as "Paid by day" */
const looksDaily = (workers: { hours?: number | null; otHours?: number | null }[]) =>
  workers.length > 0 && workers.every((w) => (w.hours ?? 0) === STANDARD_HOURS && !(w.otHours ?? 0));

export const fromRecord = (r: AttendanceRecord): AttendanceForm => ({
  payMode: r.payMode === "hourly" ? (looksDaily(r.workers) ? "daily" : "hourly") : "amount",
  trade: r.trade,
  contractorName: r.contractorName,
  date: r.date,
  workers: r.workers.map((w) => ({
    id: w.id,
    label: w.label,
    amount: w.amount === 0 ? "" : w.amount,
    amounts: {},
    dayRate: dayRateOf(w.hourlyRate),
    hours: blank(w.hours),
    ot: blank(w.otHours),
    hoursByDay: {},
    otByDay: {},
    ...noChanges(),
    extra: extraIn(w), // paid hourly: whatever was paid above hours × rate
  })),
  extras: r.extras === 0 ? "" : r.extras,
  notes: r.notes,
  days: [],
});

/**
 * Days saved together, loaded back into the form as one several-days entry: the same days, and one row per labourer
 * with what they were paid on each day. Labourers line up by label ("L1" on every day is one row); a label used
 * twice on the same day becomes two rows.
 */
export function fromBatch(batch: AttendanceBatch): AttendanceForm {
  const days = batch.days;
  const first = days[0];
  const rows = new Map<string, WorkerRow>();
  for (const d of days) {
    const seen = new Map<string, number>();
    for (const w of d.workers) {
      const n = (seen.get(w.label) ?? 0) + 1;
      seen.set(w.label, n);
      const key = `${w.label}\u0000${n}`;
      let row = rows.get(key);
      if (!row) {
        row = { id: newId(), label: w.label, amount: "", amounts: {}, ...blankHours() };
        rows.set(key, row);
      }
      row.amounts[d.date] = w.amount === 0 ? "" : w.amount;
      if (w.hours !== null && w.hours !== undefined) row.hoursByDay[d.date] = blank(w.hours);
      if (w.otHours !== null && w.otHours !== undefined) row.otByDay[d.date] = blank(w.otHours);
      if (w.hourlyRate) row.dayRate = dayRateOf(w.hourlyRate); // the latest day's rate
      if (w.hourlyRate) row.rateByDay[d.date] = dayRateOf(w.hourlyRate);
      const extra = extraIn(w);
      if (extra !== "") row.extraByDay[d.date] = extra;
    }
  }
  // A day's own rate is kept only where it differs from the labourer's usual (latest) rate
  for (const row of rows.values()) row.rateByDay = Object.fromEntries(Object.entries(row.rateByDay).filter(([, r]) => r !== row.dayRate));
  return {
    payMode: first?.payMode === "hourly" ? (looksDaily(days.flatMap((d) => d.workers)) ? "daily" : "hourly") : "amount",
    trade: first?.trade ?? "",
    contractorName: first?.contractorName ?? "",
    date: first?.date ?? todayLocal(),
    days: days.map((d) => d.date),
    workers: rows.size ? [...rows.values()] : [newWorker(1)],
    extras: !first || first.extras === 0 ? "" : first.extras,
    notes: first?.notes ?? "",
  };
}

/* ------------------------------------------ checks and saving ------------------------------------------ */

export interface Problem {
  message: string;
  /** The field to put the cursor in */
  focus?: "tradeInput" | "contractorNameInput";
}

/** What is missing before the form can be saved, or null */
export function checkForm(f: AttendanceForm, severalDays: boolean): Problem | null {
  if (!f.contractorName.trim()) return { message: "Please enter a contractor name.", focus: "contractorNameInput" };
  if (byHours(f.payMode)) {
    const daily = f.payMode === "daily";
    const days = severalDays ? f.days : null;
    const worked = f.workers.filter((w) => workerHours(w, days).hours + workerHours(w, days).ot > 0);
    const unnamed = worked.find((w) => !w.label.trim());
    if (unnamed) return { message: "Every labourer who worked needs a name." };
    const noRate = worked.filter((w) => !(num(w.dayRate) > 0));
    if (noRate.length) return { message: `Enter the ${daily ? "day rate" : "rate per hour"} for ${noRate.map((w) => w.label.trim()).join(", ")}.` };
    const names = worked.map((w) => w.label.trim().toLowerCase());
    const twice = names.find((n, i) => names.indexOf(n) !== i);
    if (twice) return { message: `${worked.find((w) => w.label.trim().toLowerCase() === twice)!.label.trim()} is listed twice.` };
    if (!severalDays && worked.length === 0) return { message: daily ? "Mark at least one labourer present." : "Enter the hours for at least one labourer." };
  }
  if (!severalDays) return null;
  if (f.days.length === 0) return { message: "Choose at least one day." };
  const empty = f.days.filter((d) => dayTotal(f.workers, d, f.extras, f.payMode) === 0);
  if (empty.length)
    return {
      message: `Nothing is paid on ${empty.map((d) => `${weekday(d)} ${shortDay(d)}`).join(", ")}. Enter the amounts, or remove ${empty.length === 1 ? "that day" : "those days"}.`,
    };
  return null;
}

/** One day's entry, as the API takes it */
export const toPayload = (f: AttendanceForm, projectId: string): AttendancePayload => ({
  projectId,
  payMode: byHours(f.payMode) ? "hourly" : "amount", // by day is saved as 8 hours at day rate ÷ 8
  contractorName: f.contractorName.trim(),
  trade: f.trade.trim(),
  date: f.date,
  workers:
    byHours(f.payMode)
      ? f.workers
          .filter((w) => w.label.trim()) // a blank row with no name was never filled in
          .map((w) => ({ label: w.label.trim(), amount: 0, dayRate: num(w.dayRate), hours: num(w.hours), otHours: num(w.ot), ...(num(w.extra) > 0 ? { extra: num(w.extra) } : {}) }))
      : f.workers.map((w) => ({ label: w.label.trim() || "Labour", amount: num(w.amount) })),
  extras: num(f.extras),
  notes: f.notes.trim(),
});

/** Several days at once: each labourer's amount on each chosen day */
export function toManyPayload(f: AttendanceForm, projectId: string): AttendanceManyPayload {
  const { date: _one, workers: _same, ...rest } = toPayload(f, projectId);
  const byDay = (v: Record<string, number | "">) => Object.fromEntries(f.days.map((d) => [d, num(v[d] ?? "")]));
  return {
    ...rest,
    projectId,
    dates: f.days,
    workers:
      byHours(f.payMode)
        ? f.workers
            .filter((w) => w.label.trim())
            .map((w) => {
              // Only the days that differ: their own rate, and rupees on top
              const rates = Object.fromEntries(f.days.filter((d) => (w.rateByDay[d] ?? "") !== "" && rateOn(w, d) !== num(w.dayRate)).map((d) => [d, rateOn(w, d)]));
              const extras = Object.fromEntries(f.days.filter((d) => extraOn(w, d) > 0).map((d) => [d, extraOn(w, d)]));
              return {
                label: w.label.trim(),
                amount: 0,
                dayRate: num(w.dayRate),
                hoursByDay: byDay(w.hoursByDay),
                otByDay: byDay(w.otByDay),
                ...(Object.keys(rates).length ? { rateByDay: rates } : {}),
                ...(Object.keys(extras).length ? { extraByDay: extras } : {}),
              };
            })
        : f.workers.map((w) => ({ label: w.label.trim() || "Labour", amount: 0, amounts: Object.fromEntries(f.days.map((d) => [d, dayAmount(w, d)])) })),
  };
}

export const savedManyNote = (count: number, f: AttendanceForm, edited = false) =>
  `${edited ? "Updated" : "Saved"} ${count} ${count === 1 ? "day" : "days"} for ${f.contractorName.trim()}: ${describeDays(f.days)}.`;