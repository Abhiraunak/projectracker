import { request } from "@/lib/api";

/* ---------------------- GET /projects/:id/progress ---------------------- */

export type Pace = "done" | "ahead" | "on_track" | "behind" | "not_started" | "late";

export interface ProjectProgress {
  today: string;
  cost: { budget: number; budgetIsSet: boolean; labourUsed: number; materialUsed: number; used: number; left: number; usedPct: number; likelyFinal: number };
  time: {
    start: string | null;
    end: string | null;
    totalDays: number;
    daysUsed: number;
    daysLeft: number | null;
    timePct: number;
    workPct: number;
    pace: Pace;
    gap: number;
  };
  rows: { id: string; work: string; start: string; end: string; progress: number; expected: number; pace: Pace; agreed: number; paid: number }[];
}

/* -------------------- GET /projects/:id/materials ---------------------- */

export type OrderState = "received" | "part" | "waiting" | "late";

export interface MaterialTile {
  key: string;
  label: string;
  materials: number;
  budget: number;
  spent: number;
  quantity: { unit: string; required: number; utilised: number; received: number } | null;
  toOrder: number;
  lateOrders: number;
  arriving: number;
}

export interface SheetMaterial {
  material: { id: string; name: string; unit: string };
  rate: number;
  required: number;
  budget: number;
  ordered: number;
  received: number;
  utilised: number;
  inStore: number;
  pendingDelivery: number;
  pendingOrder: number;
  spent: number;
  averageRate: number | null;
  vendors: string[];
  orders: {
    id: string;
    number: number;
    vendor: string | null;
    quantity: number;
    receivedQty: number;
    rate: number;
    amount: number;
    expectedDelivery: string | null;
    reference: string;
    createdAt: string;
    state: OrderState;
  }[];
}

export interface MaterialBook {
  tiles: MaterialTile[];
  sheets: Record<string, { key: string; label: string; materials: SheetMaterial[] }>;
}

const id = (projectId: string) => encodeURIComponent(projectId);

export const pagesApi = {
  progress: (projectId: string) => request<ProjectProgress>(`/projects/${id(projectId)}/progress`),
  materials: (projectId: string) => request<MaterialBook>(`/projects/${id(projectId)}/materials`),
};

/** Quantities the Indian way, up to 3 decimals: 29,000 · 12.5 */
const qty = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });
export const quantity = (value: number, unit?: string) => `${qty.format(value)}${unit ? ` ${unit}` : ""}`;
