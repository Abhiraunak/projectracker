/** Mirrors the /client and /client-admin APIs */

export type InstalmentKind = "ADVANCE" | "INSTALMENT";
export type InstalmentStatus = "Paid" | "Checking payment" | "Part paid" | "Overdue" | "Due" | "Upcoming";
export type ProofStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PaymentMode = "UPI" | "BANK_TRANSFER" | "CHEQUE" | "CASH" | "OTHER";
export type DelayReason = "MONSOON" | "FESTIVAL" | "NATURAL" | "OTHER";
export type AdvanceStatus = "No advance" | "Waiting for advance" | "Advance paid" | "Started without advance";
export type WorkStatus = "Done" | "Late" | "In progress" | "Not started" | "Starting";

export const MODE_LABEL: Record<PaymentMode, string> = { UPI: "UPI", BANK_TRANSFER: "Bank transfer", CHEQUE: "Cheque", CASH: "Cash", OTHER: "Other" };
export const REASON_LABEL: Record<DelayReason, string> = { MONSOON: "Monsoon", FESTIVAL: "Festival", NATURAL: "Natural causes", OTHER: "Other" };

export interface Proof {
  id: string;
  instalmentId: string;
  amount: number;
  paidOn: string;
  mode: PaymentMode;
  reference: string;
  note: string;
  status: ProofStatus;
  decisionNote: string;
  decidedAt: string | null;
  decidedBy: string | null;
  uploadedBy: string;
  byClient: boolean;
  createdAt: string;
  file: { thumbnailUrl: string | null; openUrl: string; isPdf: boolean } | null;
}

export interface Instalment {
  id: string;
  number: number;
  invoiceNo: string;
  label: string;
  kind: InstalmentKind;
  amount: number;
  taxPercent: number;
  dueDate: string | null;
  dueAtProgress: number | null;
  requestedAt: string | null;
  note: string;
  total: number;
  tax: number;
  paid: number;
  checking: number;
  remaining: number;
  status: InstalmentStatus;
  isDue: boolean;
  dueOn: string | null;
  daysOverdue: number;
  why: string;
  proofs: Proof[];
}

export interface Delay {
  id: string;
  reason: DelayReason;
  title: string;
  note: string;
  fromDate: string;
  days: number;
  tasksMoved: number;
  paymentsMoved: number;
  by: string;
  createdAt: string;
}

export interface Snapshot {
  project: { id: string; title: string; status: "ONGOING" | "COMPLETED" | "ARCHIVED"; projectCost: number | null };
  schedule: { done: number; time: number; start: string | null; finish: string | null; daysLeft: number | null; daysBehind: number };
  works: { id: string; work: string; area: number; progress: number; startDate: string; endDate: string; status: WorkStatus }[];
  instalments: Instalment[];
  payments: { contract: number; paid: number; checking: number; dueNow: number; overdue: number; upcoming: number; overdueCount: number };
  advance: AdvanceStatus;
  advanceOverride: boolean;
  delays: Delay[];
  delayDays: number;
}

export interface ClientPortal extends Snapshot {
  attention: { kind: "advance" | "overdue" | "due" | "rejected" | "delay"; title: string; detail: string; instalmentId: string | null }[];
  generatedAt: string;
}

export interface Invoice {
  company: { name: string; address: string; gstin: string; phone: string; email: string; bank: string };
  billTo: string[];
  project: Snapshot["project"];
  progress: number;
  instalment: Instalment;
  issuedOn: string;
}

export interface ProofInput {
  amount: number;
  paidOn: string;
  mode: PaymentMode;
  reference: string;
  note: string;
}

/* ----------------------------------- admin ----------------------------------- */

export interface ClientOverview {
  generatedAt: string;
  kpis: {
    toCheck: { count: number; amount: number; oldest: string | null };
    overdue: { amount: number; projects: number };
    waitingAdvance: string[];
    received30: number;
    noSchedule: number;
    noClient: number;
  };
  toCheck: (Proof & { project: { id: string; title: string }; invoice: string })[];
  projects: {
    id: string;
    title: string;
    clients: number;
    hasSchedule: boolean;
    contract: number;
    paid: number;
    dueNow: number;
    overdue: number;
    checking: number;
    done: number;
    daysBehind: number;
    advance: AdvanceStatus;
    delayDays: number;
  }[];
}

export interface ClientProject extends Snapshot {
  clients: { id: string; email: string; name: string | null; linkedAt: string }[];
}

export interface InstalmentInput {
  label: string;
  kind: InstalmentKind;
  amount: number;
  taxPercent: number;
  dueDate: string | null;
  dueAtProgress: number | null;
  note: string;
}

export interface DelayInput {
  reason: DelayReason;
  title: string;
  note: string;
  fromDate: string;
  days: number;
}
