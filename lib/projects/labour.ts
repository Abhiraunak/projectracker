import { ApiError, apiUrl, renewSession, request } from "@/lib/api";

/** The labour page's donut: labour cost by trade (from attendance) plus General expenditure */
export interface LabourSummary {
  trades: { trade: string; cost: number; contractors: number }[]; // biggest first; trade "" = not set
  labour: number;
  generalExpenses: number;
  total: number; // labour + general expenses
  paid: number; // paid to contractors so far
  toPay: number; // labour - paid; below 0: paid in advance
}

export interface ContractorPayment {
  id: string;
  trade: string;
  contractorName: string;
  date: string; // YYYY-MM-DD
  amount: number;
  remark: string;
  proofUrl: string | null; // opens the receipt (photo or PDF); null when none was attached
  proofKind: "pdf" | "image" | null;
  addedBy: string;
  createdAt: string;
}

/** One contractor in one trade: what attendance says they earned, what was paid, what is still owed */
export interface ContractorLedger {
  trade: string;
  contractorName: string;
  earned: number;
  paid: number;
  balance: number; // below 0: paid in advance
  lastPaid: string | null;
}

export interface PaymentBook {
  items: ContractorPayment[];
  contractors: ContractorLedger[];
  totals: { earned: number; paid: number; balance: number };
  trades: string[]; // to offer on the form
}

export interface NewPayment {
  trade: string;
  contractorName: string;
  date: string;
  amount: number;
  remark: string;
  proof: File | null;
}

const id = (s: string) => encodeURIComponent(s);

/** A form, not JSON, because the receipt is a file */
async function send(projectId: string, p: NewPayment) {
  const form = new FormData();
  form.append("trade", p.trade); // text first, file last
  form.append("contractorName", p.contractorName);
  form.append("date", p.date);
  form.append("amount", String(p.amount));
  form.append("remark", p.remark);
  if (p.proof) form.append("file", p.proof);
  const res = await fetch(apiUrl(`/projects/${id(projectId)}/contractor-payments`), {
    method: "POST",
    body: form,
    credentials: "include",
    headers: { "X-Requested-With": "fetch" },
  });
  const body = (await res.json().catch(() => null)) as { payment?: ContractorPayment; error?: string; details?: unknown } | null;
  if (!res.ok || !body?.payment) throw new ApiError(res.status, body?.error ?? "Couldn't save the payment", body?.details);
  return body.payment;
}

export const labourApi = {
  summary: (projectId: string) => request<LabourSummary>(`/projects/${id(projectId)}/labour-summary`),
  payments: (projectId: string) => request<PaymentBook>(`/projects/${id(projectId)}/contractor-payments`),
  async addPayment(projectId: string, p: NewPayment) {
    try {
      return await send(projectId, p);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && (await renewSession())) return send(projectId, p);
      throw error;
    }
  },
  removePayment: (projectId: string, paymentId: string) =>
    request<{ ok: true }>(`/projects/${id(projectId)}/contractor-payments/${id(paymentId)}`, { method: "DELETE" }),
};