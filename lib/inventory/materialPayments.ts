import { ApiError, apiUrl, renewSession, request } from "@/lib/api";

export interface MaterialPayment {
  id: string;
  vendorName: string;
  material: { id: string; name: string; unit: string } | null; // what it was for, if given
  date: string;
  amount: number;
  remark: string;
  proofUrl: string | null;
  proofKind: "pdf" | "image" | null;
  addedBy: string;
  createdAt: string;
}

/** One vendor: the value of what they delivered, what was paid, and what is still owed */
export interface VendorLine {
  vendorName: string;
  bought: number;
  paid: number;
  balance: number; // below 0: paid in advance
  lastPaid: string | null;
}

export interface VendorPaymentBook {
  items: MaterialPayment[];
  vendors: VendorLine[];
  totals: { bought: number; paid: number; balance: number };
  vendorNames: string[]; // names already used, to tap on the form
}

export interface NewMaterialPayment {
  vendorName: string;
  materialId: string;
  date: string;
  amount: number;
  remark: string;
  proof: File | null;
}

const id = (s: string) => encodeURIComponent(s);

/** A form, not JSON, because the receipt is a file */
async function send(projectId: string, p: NewMaterialPayment) {
  const form = new FormData();
  form.append("vendorName", p.vendorName); // text first, file last
  form.append("materialId", p.materialId);
  form.append("date", p.date);
  form.append("amount", String(p.amount));
  form.append("remark", p.remark);
  if (p.proof) form.append("file", p.proof);
  const res = await fetch(apiUrl(`/projects/${id(projectId)}/material-payments`), { method: "POST", body: form, credentials: "include", headers: { "X-Requested-With": "fetch" } });
  const body = (await res.json().catch(() => null)) as { payment?: MaterialPayment; error?: string; details?: unknown } | null;
  if (!res.ok || !body?.payment) throw new ApiError(res.status, body?.error ?? "Couldn't save the payment", body?.details);
  return body.payment;
}

export const materialPaymentsApi = {
  list: (projectId: string) => request<VendorPaymentBook>(`/projects/${id(projectId)}/material-payments`),
  async add(projectId: string, p: NewMaterialPayment) {
    try {
      return await send(projectId, p);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && (await renewSession())) return send(projectId, p);
      throw error;
    }
  },
  remove: (projectId: string, paymentId: string) => request<{ ok: true }>(`/projects/${id(projectId)}/material-payments/${id(paymentId)}`, { method: "DELETE" }),
};