import { request } from "@/lib/api";

/* The simple Labour section: attendance by work (hours, OT), payments by person and dates, subcontract work, and
   rate comparison against subcontractor quotes. Adding and deleting payments use lib/projects/labour.ts. */

export interface Worker {
  name: string;
  hours: number;
  otHours: number;
  rate: number; // ₹ per hour
  otRate: number; // ₹ per OT hour
  /** An older day saved as an amount only (no hours): that amount; null otherwise */
  fixed: number | null;
  amount: number;
}
export interface Day {
  workers: Worker[];
  /** Extra amounts saved on an older day (kept when the day is changed); 0 for new days */
  extras?: number;
  total: number;
  /** The last day before this one for the same contractor and work ("Same as yesterday") */
  last: { date: string; workers: Worker[] } | null;
}
export interface Work {
  id: string;
  title: string;
  quantity: number;
  cost: number;
}
export interface RecordRow {
  date: string;
  contractorName: string;
  taskId: string | null;
  work: string;
  workers: number;
  hours: number;
  otHours: number;
  amount: number;
}
export interface Payment {
  id: string;
  date: string;
  amount: number;
  remark: string;
  contractorName: string;
  receiptUrl: string | null;
}
export interface Statement {
  person: string;
  from: string;
  to: string;
  earned: number;
  paid: number;
  balance: number;
  days: { date: string; work: string; hours: number; otHours: number; amount: number }[];
  contract: { date: string; work: string; quantity: number; unit: string; rate: number; amount: number }[];
  payments: Payment[];
  allTime: { earned: number; paid: number; balance: number };
}
export interface Measure {
  id: string;
  contractorName: string;
  date: string;
  work: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  note: string;
}
export type MeasureInput = Omit<Measure, "id" | "amount">;
export interface Subcontract {
  items: Measure[];
  people: { name: string; done: number; paid: number; toPay: number }[];
  totals: { done: number; paid: number; toPay: number };
}
export interface Quote {
  id: string;
  name: string;
  rate: number;
  unit: string;
  paid: number;
}
export interface Comparison {
  work: { id: string; title: string };
  quantity: number;
  inHouse: { cost: number; workerDays: number; hours: number; otHours: number };
  quotes: Quote[];
}
/** One row of the Rate comparison table */
export interface RateRow {
  id: string;
  title: string;
  quantity: number; // done, kept on the work item
  contractorRate: number; // ₹ per unit a contractor would charge, kept on the work item
  labourCost: number; // what our own labour cost on this work (attendance, hours and OT) between the dates
  days: number; // saved attendance entries counted
}

/** "Paid for a period" (Attendance tab): a name, the days it covers and the amount */
export interface PeriodPayment {
  id: string;
  name: string;
  from: string;
  to: string;
  amount: number;
}
export type PeriodPaymentInput = Omit<PeriodPayment, "id">;

export interface SaveDayInput {
  date: string;
  contractorName: string;
  taskId: string | null;
  workers: { name: string; hours: number; otHours: number; rate: number; otRate: number; fixed: number | null }[];
  forward: boolean;
}

const enc = encodeURIComponent;
const base = (p: string) => `/projects/${enc(p)}/labour-simple`;
const qs = (o: Record<string, string | undefined>) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${enc(v!)}`)
    .join("&");
const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const labourSimpleApi = {
  day: (p: string, date: string, contractor: string, taskId: string | null) => request<Day>(`${base(p)}/day?${qs({ date, contractor, taskId: taskId ?? "" })}`),
  saveDay: (p: string, body: SaveDayInput) => request<Day>(`${base(p)}/day`, json("PUT", body)),
  copyDay: (p: string, body: { date: string; contractorName: string; taskId: string | null; dates: string[] }) =>
    request<{ added: string[]; skipped: string[]; perDay: number }>(`${base(p)}/copy`, json("POST", body)),
  days: (p: string, from: string, to: string, taskId: string | null, contractor?: string) =>
    request<{ days: { date: string; total: number }[] }>(`${base(p)}/days?${qs({ from, to, taskId: taskId ?? "", contractor })}`),
  records: (p: string, from: string, to: string, taskId?: string | null) =>
    request<{ items: RecordRow[]; total: number }>(`${base(p)}/records?${qs({ from, to, taskId: taskId === undefined ? undefined : (taskId ?? "") })}`),
  people: (p: string) => request<{ contractors: string[]; everyone: string[] }>(`${base(p)}/people`),
  works: (p: string) => request<{ items: Work[]; general: number }>(`${base(p)}/works`),
  addWork: (p: string, title: string) => request<{ item: { id: string; title: string } }>(`${base(p)}/works`, json("POST", { title })),
  renameWork: (p: string, id: string, title: string) => request<{ ok: true }>(`${base(p)}/works/${enc(id)}`, json("PATCH", { title })),
  setQuantity: (p: string, id: string, quantity: number) => request<{ ok: true }>(`${base(p)}/works/${enc(id)}/quantity`, json("PUT", { quantity })),
  statement: (p: string, person: string, from: string, to: string) => request<Statement>(`${base(p)}/statement?${qs({ person, from, to })}`),
  updatePayment: (p: string, id: string, body: { contractorName: string; date: string; amount: number; remark: string }) =>
    request<{ ok: true }>(`${base(p)}/payments/${enc(id)}`, json("PUT", body)),
  periodPayments: (p: string) => request<{ items: PeriodPayment[]; total: number }>(`${base(p)}/period-payments`),
  addPeriodPayment: (p: string, body: PeriodPaymentInput) => request<{ item: PeriodPayment }>(`${base(p)}/period-payments`, json("POST", body)),
  updatePeriodPayment: (p: string, id: string, body: PeriodPaymentInput) => request<{ item: PeriodPayment }>(`${base(p)}/period-payments/${enc(id)}`, json("PUT", body)),
  removePeriodPayment: (p: string, id: string) => request<{ ok: true }>(`${base(p)}/period-payments/${enc(id)}`, { method: "DELETE" }),
  subcontract: (p: string) => request<Subcontract>(`${base(p)}/subcontract`),
  addMeasure: (p: string, body: MeasureInput) => request<{ item: Measure }>(`${base(p)}/subcontract`, json("POST", body)),
  updateMeasure: (p: string, id: string, body: MeasureInput) => request<{ item: Measure }>(`${base(p)}/subcontract/${enc(id)}`, json("PUT", body)),
  removeMeasure: (p: string, id: string) => request<{ ok: true }>(`${base(p)}/subcontract/${enc(id)}`, { method: "DELETE" }),
  rates: (p: string, from: string, to: string) => request<{ items: RateRow[] }>(`${base(p)}/rates?${qs({ from, to })}`),
  setWorkRate: (p: string, id: string, body: { quantity: number; contractorRate: number }) => request<{ ok: true }>(`${base(p)}/works/${enc(id)}/rate`, json("PUT", body)),
  compare: (p: string, taskId: string, from: string, to: string) => request<Comparison>(`${base(p)}/compare?${qs({ taskId, from, to })}`),
  addQuote: (p: string, taskId: string, body: { name: string; rate: number; unit: string }) => request<{ id: string }>(`${base(p)}/works/${enc(taskId)}/quotes`, json("POST", body)),
  updateQuote: (p: string, id: string, body: { name: string; rate: number; unit: string }) => request<{ ok: true }>(`${base(p)}/quotes/${enc(id)}`, json("PUT", body)),
  removeQuote: (p: string, id: string) => request<{ ok: true }>(`${base(p)}/quotes/${enc(id)}`, { method: "DELETE" }),
};