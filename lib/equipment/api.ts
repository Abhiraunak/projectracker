import { request } from "@/lib/api";


export type CategoryKey = "shuttering" | "scaffolding" | "machinery" | "tools" | "other";
export type MoveKind = "add" | "move" | "write_off";
export type Condition = "good" | "repair" | "damaged";

export interface Category {
  key: CategoryKey;
  label: string;
}

interface ItemDetails {
  id: string;
  name: string;
  category: CategoryKey;
  unit: string;
  code: string | null;
  ownership: "owned" | "hired";
  hireRate: number | null;
  hirePer: "day" | "month";
  supplier: string | null;
  serviceDue: string | null;
  notes: string;
  retired: boolean;
  updatedAt: string;
}

export interface SitePlace {
  projectId: string;
  title: string;
  qty: number;
}

/** A row of the register: how many in all, in the yard, and at each site */
export interface RegisterItem extends ItemDetails {
  total: number;
  yard: number;
  sites: SitePlace[];
}

export interface Register {
  categories: Category[];
  projects: { id: string; title: string }[];
  items: RegisterItem[];
}

export interface HistoryEntry {
  id: string;
  kind: MoveKind;
  from: { projectId: string; title: string } | null; // null: the yard
  to: { projectId: string; title: string } | null;
  quantity: number;
  date: string;
  condition: Condition;
  note: string;
  by: string;
  createdAt: string;
}

export interface EquipmentDetail extends RegisterItem {
  addedBy: string;
  use: { projectId: string | null; title: string; unitDays: number; charge: number; chargeThisMonth: number }[];
  history: HistoryEntry[];
}

/** What is at one site now */
export interface SiteItem extends ItemDetails {
  here: number;
  since: string | null;
  condition: Condition | null;
  unitDays: number;
  hireSoFar: number;
  hireThisMonth: number;
}

export interface SiteEquipment {
  categories: Category[];
  items: SiteItem[];
  earlier: { id: string; name: string; unit: string; category: CategoryKey; unitDays: number; hireSoFar: number; hireThisMonth: number }[];
  totals: { items: number; hireSoFar: number; hireThisMonth: number; serviceDue: number };
}

export interface NewEquipment {
  name: string;
  category: CategoryKey;
  unit: string;
  code: string | null;
  ownership: "owned" | "hired";
  hireRate: number | null;
  hirePer: "day" | "month";
  supplier: string | null;
  serviceDue: string | null;
  notes: string;
  quantity: number;
  to: string | null; // null: the yard
  date: string;
}

export type EquipmentChanges = Partial<Omit<NewEquipment, "quantity" | "to" | "date">> & { retired?: boolean };

export interface NewMove {
  kind: MoveKind;
  from: string | null;
  to: string | null;
  quantity: number;
  date: string;
  condition: Condition;
  note: string;
}

const enc = encodeURIComponent;

export const equipmentApi = {
  register: () => request<Register>("/equipment"),
  get: (id: string) => request<EquipmentDetail>(`/equipment/${enc(id)}`),
  atSite: (projectId: string) => request<SiteEquipment>(`/projects/${enc(projectId)}/equipment`),
  create: (body: NewEquipment) => request<{ id: string }>("/equipment", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: EquipmentChanges) => request<{ id: string }>(`/equipment/${enc(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  move: (id: string, body: NewMove) => request<{ id: string }>(`/equipment/${enc(id)}/moves`, { method: "POST", body: JSON.stringify(body) }),
  undo: (id: string, moveId: string) => request<{ ok: true }>(`/equipment/${enc(id)}/moves/${enc(moveId)}`, { method: "DELETE" }),
};

/* ---------------------------------------- formatting ---------------------------------------- */

export const qty = (n: number) => (Number.isInteger(n) ? n.toLocaleString("en-IN") : n.toLocaleString("en-IN", { maximumFractionDigits: 2 }));
export const CONDITION_LABEL: Record<Condition, string> = { good: "Good", repair: "Needs repair", damaged: "Damaged" };
export const hireLabel = (i: { ownership: "owned" | "hired"; hireRate: number | null; hirePer: "day" | "month"; unit: string }) =>
  i.ownership === "owned" ? "Owned" : i.hireRate ? `Hired · ₹${i.hireRate.toLocaleString("en-IN")} per ${i.unit === "nos" ? "piece" : i.unit} a ${i.hirePer}` : "Hired";
