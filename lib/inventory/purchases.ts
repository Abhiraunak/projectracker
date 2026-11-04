import { ApiError, apiUrl, renewSession, request } from "@/lib/api";

/** One material bought for the project: what, how many, at what rate, and the bill (optional) */
export interface Purchase {
  id: string;
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
}

export interface PurchaseInput {
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

/** Common units, to tap rather than type */
export const UNITS = ["nos", "bags", "kg", "ton", "cft", "cum", "sqft", "rft", "litre", "trip", "load"];

const id = (s: string) => encodeURIComponent(s);

/** A form, not JSON, because the bill is a file */
async function send(method: "POST" | "PUT", path: string, p: PurchaseInput) {
  const form = new FormData();
  form.append("name", p.name); // text first, file last
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

/** Renews an expired session once, like request() does */
async function withRenew<T>(run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && (await renewSession())) return run();
    throw error;
  }
}

export const purchasesApi = {
  list: (projectId: string) => request<PurchaseBook>(`/projects/${id(projectId)}/material-purchases`),
  add: (projectId: string, p: PurchaseInput) => withRenew(() => send("POST", `/projects/${id(projectId)}/material-purchases`, p)),
  update: (projectId: string, purchaseId: string, p: PurchaseInput) => withRenew(() => send("PUT", `/projects/${id(projectId)}/material-purchases/${id(purchaseId)}`, p)),
  remove: (projectId: string, purchaseId: string) => request<{ ok: true }>(`/projects/${id(projectId)}/material-purchases/${id(purchaseId)}`, { method: "DELETE" }),
};