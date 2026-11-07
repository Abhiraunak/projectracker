import { request } from "@/lib/api";

/*
 * The labour pay week (Monday to Sunday), contract work (area × rate), the month for every contractor, and labour
 * search. Worked out on the server; see labour-weeks.calc.ts there for the rules.
 */

export interface Measure {
  id: string;
  trade: string;
  contractorName: string;
  date: string; // YYYY-MM-DD
  weekStart: string; // its pay week's Monday
  work: string;
  quantity: number;
  unit: string; // sqft, rft, sqm, nos…
  rate: number;
  amount: number; // quantity × rate
  note: string;
  addedBy: string;
  createdAt: string;
  locked?: boolean; // in a settled week: can't change
}

export interface WeekLine {
  key: string;
  trade: string;
  contractorName: string;
  days: number[]; // attendance earned each day, Monday first
  attendance: number;
  contract: number;
  earned: number; // attendance + contract this week
  fromLastWeek: number; // below 0: paid in advance
  toPay: number;
  paid: number;
  left: number; // carried to next week; below 0: paid in advance
  settled: { at: string; by: string } | null;
  payments: { id: string; date: string; amount: number; remark: string }[];
  measures: Measure[];
}

export interface LabourWeek {
  start: string; // Monday
  end: string; // Sunday
  today: string;
  lines: WeekLine[];
  totals: { attendance: number; contract: number; earned: number; fromLastWeek: number; toPay: number; paid: number; left: number };
}

export interface MeasureBook {
  items: Measure[];
  total: number;
  units: string[];
}

export interface MeasureInput {
  trade: string;
  contractorName: string;
  date: string;
  work: string;
  quantity: number;
  unit: string;
  rate: number;
  note: string;
}

export interface LabourMonth {
  month: string;
  weeks: string[]; // the Mondays of the pay weeks touching the month
  lines: { key: string; trade: string; contractorName: string; byWeek: number[]; attendance: number; contract: number; earned: number; paid: number }[];
  totals: { byWeek: number[]; attendance: number; contract: number; earned: number; paid: number };
}

export interface LabourHit {
  kind: "attendance" | "contract" | "payment";
  id: string;
  title: string;
  detail: string;
  trade: string;
  contractorName: string;
  date: string;
  weekStart: string;
  amount: number;
}

export interface SettleInput {
  start: string;
  trade: string;
  contractorName: string;
}

const id = (s: string) => encodeURIComponent(s);
const base = (projectId: string) => `/projects/${id(projectId)}/labour`;
const json = (data: unknown) => JSON.stringify(data);

export const labourWeeksApi = {
  week: (projectId: string, start?: string) => request<LabourWeek>(`${base(projectId)}/week${start ? `?start=${start}` : ""}`),
  settle: (projectId: string, s: SettleInput) => request<{ ok: true }>(`${base(projectId)}/week/settle`, { method: "POST", body: json(s) }),
  reopen: (projectId: string, s: SettleInput) => request<{ ok: true }>(`${base(projectId)}/week/settle`, { method: "DELETE", body: json(s) }),
  measures: (projectId: string) => request<MeasureBook>(`${base(projectId)}/measures`),
  addMeasure: (projectId: string, m: MeasureInput) => request<{ measure: Measure }>(`${base(projectId)}/measures`, { method: "POST", body: json(m) }),
  updateMeasure: (projectId: string, measureId: string, m: MeasureInput) =>
    request<{ measure: Measure }>(`${base(projectId)}/measures/${id(measureId)}`, { method: "PUT", body: json(m) }),
  removeMeasure: (projectId: string, measureId: string) => request<{ ok: true }>(`${base(projectId)}/measures/${id(measureId)}`, { method: "DELETE" }),
  month: (projectId: string, month: string) => request<LabourMonth>(`${base(projectId)}/month?month=${month}`),
  search: (projectId: string, q: string) => request<{ q: string; hits: LabourHit[] }>(`${base(projectId)}/search?q=${encodeURIComponent(q)}`),
};

/* ------------------------------------------- dates (local, Monday weeks) ------------------------------------------- */

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};
export const todayLocal = () => ymd(new Date());
export const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
/** The Monday that starts the pay week of this day */
export const weekStartOf = (s: string) => addDays(s, -((parse(s).getDay() + 6) % 7));
/** "2 – 8 Nov" */
export function weekLabel(start: string) {
  const a = parse(start);
  const b = parse(addDays(start, 6));
  const month = (d: Date) => d.toLocaleDateString("en-IN", { month: "short" });
  return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} ${month(b)}` : `${a.getDate()} ${month(a)} – ${b.getDate()} ${month(b)}`;
}
export const dayLetter = (start: string, i: number) => parse(addDays(start, i)).toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2);
export const dayNumber = (start: string, i: number) => parse(addDays(start, i)).getDate();