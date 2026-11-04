import { ApiError, apiUrl, renewSession, request } from "@/lib/api";

/** One material bought for the project: what, how many, at what rate, and the bill (optional) */
export interface Purchase {
  id: string;
  section: string; // the heading it is listed under ("Flooring"); empty = none
  name: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number; // quantity × rate, worked out on the server
  date: string; // YYYY-MM-DD
  note: string;
  billUrl: string | null;
  billKind: "pdf" | "image" | null;
  addedBy: string;
  createdAt: string;
  /** Deliveries, newest first: on what date how many arrived. `quantity` above is what was ordered. */
  deliveries: Delivery[];
  arrived: number;
  toCome: number;
  extra: number; // arrived beyond what was ordered
  state: "none" | "part" | "all" | "extra";
}

export interface Delivery {
  id: string;
  date: string;
  quantity: number;
  billUrl: string | null;
  billKind: "pdf" | "image" | null;
  addedBy: string;
}

export interface MaterialTotal {
  name: string;
  unit: string;
  quantity: number;
  amount: number;
  entries: number;
}

export interface PurchaseBook {
  items: Purchase[];
  total: number;
  entries: number;
  materials: MaterialTotal[]; // biggest spend first
  names: { name: string; unit: string }[]; // already used on this project, to pick from
  sections: string[]; // headings already used, in the order they were first used
}

export interface PurchaseInput {
  section: string;
  name: string;
  unit: string;
  quantity: number;
  rate: number;
  date: string;
  note: string;
  bill: File | null;
  /** Editing only: drop the saved bill */
  removeBill?: boolean;
}

/** The same sum the server does, for the live total on the form */
export const amountOf = (quantity: number, rate: number) => Math.round(quantity * rate * 100) / 100;

export interface SectionGroup {
  section: string; // "" = entries without a section
  items: Purchase[];
  total: number;
}

const OTHER = "";

/** Entries under their section heading, in the order the sections were first used; those without one come last */
export function groupBySection(items: Purchase[], order: string[]): SectionGroup[] {
  const groups = new Map<string, Purchase[]>();
  const key = (s: string) => s.trim().toLowerCase();
  for (const s of order) groups.set(key(s), []);
  const label = new Map(order.map((s) => [key(s), s]));
  for (const p of items) {
    const k = key(p.section);
    if (!groups.has(k)) groups.set(k, []);
    if (!label.has(k)) label.set(k, p.section.trim());
    groups.get(k)!.push(p);
  }
  return [...groups.entries()]
    .filter(([, list]) => list.length > 0)
    .sort(([a], [b]) => (a === OTHER ? 1 : 0) - (b === OTHER ? 1 : 0))
    .map(([k, list]) => ({ section: label.get(k) ?? OTHER, items: list, total: Math.round(list.reduce((s, p) => s + p.amount, 0) * 100) / 100 }));
}

/** Common units, to tap rather than type */
export const UNITS = ["nos", "bags", "kg", "ton", "cft", "cum", "sqft", "rft", "litre", "trip", "load"];

const id = (s: string) => encodeURIComponent(s);

/** A form, not JSON, because the bill is a file */
async function send(method: "POST" | "PUT", path: string, p: PurchaseInput) {
  const form = new FormData();
  form.append("section", p.section); // text first, file last
  form.append("name", p.name);
  form.append("unit", p.unit);
  form.append("quantity", String(p.quantity));
  form.append("rate", String(p.rate));
  form.append("date", p.date);
  form.append("note", p.note);
  if (p.removeBill) form.append("removeBill", "true");
  if (p.bill) form.append("file", p.bill);
  const res = await fetch(apiUrl(path), { method, body: form, credentials: "include", headers: { "X-Requested-With": "fetch" } });
  const body = (await res.json().catch(() => null)) as { purchase?: Purchase; error?: string; details?: unknown } | null;
  if (!res.ok || !body?.purchase) throw new ApiError(res.status, body?.error ?? "Couldn't save the material", body?.details);
  return body.purchase;
}

/** One material the BOQ needs under one sheet, with the standard rate */
export interface BoqLine {
  section: string;
  materialId: string;
  name: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  added: boolean; // already on the list under this section
}

export interface BoqLineInput {
  section: string;
  name: string;
  unit: string;
  quantity: number;
  rate: number;
}

/** Renews an expired session once, like request() does */
async function withRenew<T>(run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && (await renewSession())) return run();
    throw error;
  }
}

async function sendDelivery(projectId: string, purchaseId: string, d: { date: string; quantity: number; bill: File | null }) {
  const form = new FormData();
  form.append("date", d.date);
  form.append("quantity", String(d.quantity));
  if (d.bill) form.append("file", d.bill);
  const res = await fetch(apiUrl(`/projects/${id(projectId)}/material-purchases/${id(purchaseId)}/deliveries`), { method: "POST", body: form, credentials: "include", headers: { "X-Requested-With": "fetch" } });
  const body = (await res.json().catch(() => null)) as { purchase?: Purchase; error?: string; details?: unknown } | null;
  if (!res.ok || !body?.purchase) throw new ApiError(res.status, body?.error ?? "Couldn't save the delivery", body?.details);
  return body.purchase;
}

export const purchasesApi = {
  addDelivery: (projectId: string, purchaseId: string, d: { date: string; quantity: number; bill: File | null }) => withRenew(() => sendDelivery(projectId, purchaseId, d)),
  removeDelivery: (projectId: string, purchaseId: string, deliveryId: string) =>
    request<{ purchase: Purchase }>(`/projects/${id(projectId)}/material-purchases/${id(purchaseId)}/deliveries/${id(deliveryId)}`, { method: "DELETE" }).then((r) => r.purchase),
  list: (projectId: string) => request<PurchaseBook>(`/projects/${id(projectId)}/material-purchases`),
  add: (projectId: string, p: PurchaseInput) => withRenew(() => send("POST", `/projects/${id(projectId)}/material-purchases`, p)),
  update: (projectId: string, purchaseId: string, p: PurchaseInput) => withRenew(() => send("PUT", `/projects/${id(projectId)}/material-purchases/${id(purchaseId)}`, p)),
  fromBoq: (projectId: string) => request<{ lines: BoqLine[]; boqItems: number }>(`/projects/${id(projectId)}/material-purchases/from-boq`),
  addFromBoq: (projectId: string, body: { date: string; lines: BoqLineInput[] }) =>
    request<{ added: number; total: number }>(`/projects/${id(projectId)}/material-purchases/from-boq`, { method: "POST", body: JSON.stringify(body) }),
  remove: (projectId: string, purchaseId: string) => request<{ ok: true }>(`/projects/${id(projectId)}/material-purchases/${id(purchaseId)}`, { method: "DELETE" }),
};