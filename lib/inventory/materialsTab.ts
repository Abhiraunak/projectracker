import { ApiError, apiUrl, renewSession, request } from "@/lib/api";

/** Received and issued per month, oldest month first (same order as `months`) */
export interface Series {
  received: number[];
  issued: number[];
}

export interface TabMaterial {
  id: string;
  name: string;
  unit: string;
  rate: number;
  section: string;
  alsoIn: string[];
  needed: number;
  inStock: number;
  issued: number;
  received: number;
  lastIssued: string | null;
  low: boolean;
}

export interface MaterialsOverview {
  months: string[]; // "2026-11"
  chart: { all: Series; byMaterial: Record<string, Series> }; // all: by value (₹); byMaterial: by quantity
  totals: { receivedThisMonth: number; issuedThisMonth: number; stockValue: number };
  sections: { name: string; materials: TabMaterial[] }[];
}

export interface LogEntry {
  id: string;
  type: "RECEIVED" | "ISSUED" | "RESERVED" | "RELEASED" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
  quantity: number;
  date: string;
  note: string;
  vendorName: string;
  billUrl: string | null;
  boqItem: { id: string; code: string; title: string } | null;
  by: string;
}

export interface MaterialDetail {
  material: { id: string; name: string; unit: string; rate: number; minStock: number };
  needed: number;
  inStock: number;
  issued: number;
  received: number;
  lastIssued: string | null;
  stillNeeded: number;
  toOrder: number;
  months: string[];
  chart: Series; // by quantity
  needs: { id: string; section: string; label: string; estimateId: string | null; required: number; issued: number }[];
  log: LogEntry[];
}

export type MoveKind = "RECEIVED" | "ISSUED" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
export interface QuickMove {
  materialId: string;
  type: MoveKind;
  quantity: number;
  date: string;
  note: string;
  vendorName?: string;
  bill?: File | null;
}

const id = (s: string) => encodeURIComponent(s);

/** A form, not JSON, because a bill photo may come with a delivery */
async function sendMove(projectId: string, m: QuickMove) {
  const form = new FormData();
  form.append("materialId", m.materialId); // text first, file last
  form.append("type", m.type);
  form.append("quantity", String(m.quantity));
  form.append("date", m.date);
  form.append("note", m.note);
  form.append("vendorName", m.vendorName ?? "");
  if (m.bill) form.append("file", m.bill);
  const res = await fetch(apiUrl(`/projects/${id(projectId)}/materials-tab/moves`), { method: "POST", body: form, credentials: "include", headers: { "X-Requested-With": "fetch" } });
  const body = (await res.json().catch(() => null)) as { movement?: unknown; error?: string; details?: unknown } | null;
  if (!res.ok || !body?.movement) throw new ApiError(res.status, body?.error ?? "Couldn't save it", body?.details);
  return body.movement;
}

export const materialsTabApi = {
  overview: (projectId: string) => request<MaterialsOverview>(`/projects/${id(projectId)}/materials-tab`),
  detail: (projectId: string, materialId: string) => request<MaterialDetail>(`/projects/${id(projectId)}/materials-tab/${id(materialId)}`),
  async move(projectId: string, m: QuickMove) {
    try {
      return await sendMove(projectId, m);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && (await renewSession())) return sendMove(projectId, m);
      throw error;
    }
  },
};

/** "2026-11" → "Nov" (and "Nov 26" when the months cross a year) */
export const monthLabel = (month: string, withYear = false) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1, 1));
  return d.toLocaleDateString("en-IN", { month: "short", ...(withYear ? { year: "2-digit" } : {}), timeZone: "UTC" });
};

/** 12,000 · 47.4 · 0.19 */
export const qty = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: n < 10 ? 3 : n < 1000 ? 2 : 0 });