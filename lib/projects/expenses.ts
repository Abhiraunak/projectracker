import { ApiError, apiUrl, renewSession, request } from "@/lib/api";

export type ExpenseCategory = "general" | "labour" | "material";

/** The three sections of Expenditure, in order */
export const EXPENSE_SECTIONS: { key: ExpenseCategory; label: string; example: string }[] = [
  { key: "general", label: "General", example: "e.g. Tractor hire, diesel, tea" },
  { key: "labour", label: "Labour", example: "e.g. Mason advance, helper wages" },
  { key: "material", label: "Material", example: "e.g. Sand 2 trolleys, cement 10 bags" },
];

export interface Expense {
  id: string;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  amount: number;
  purpose: string;
  remark: string;
  billUrl: string | null; // opens the bill (photo or PDF); null when none was added
  addedBy: string;
  createdAt: string;
}

interface Totals {
  total: number;
  thisMonth: number;
}

export interface ExpenseBook extends Totals {
  items: Expense[];
  byCategory: Record<ExpenseCategory, Totals>;
}

export interface NewExpense {
  category: ExpenseCategory;
  date: string;
  amount: number;
  purpose: string;
  remark: string;
  bill: File | null;
}

const id = (s: string) => encodeURIComponent(s);

/** A form, not JSON, because the bill is a file */
async function send(projectId: string, e: NewExpense) {
  const form = new FormData();
  form.append("category", e.category); // text first, file last
  form.append("date", e.date);
  form.append("amount", String(e.amount));
  form.append("purpose", e.purpose);
  form.append("remark", e.remark);
  if (e.bill) form.append("file", e.bill);
  const res = await fetch(apiUrl(`/projects/${id(projectId)}/expenses`), { method: "POST", body: form, credentials: "include", headers: { "X-Requested-With": "fetch" } });
  const body = (await res.json().catch(() => null)) as { expense?: Expense; error?: string; details?: unknown } | null;
  if (!res.ok || !body?.expense) throw new ApiError(res.status, body?.error ?? "Couldn't save the entry", body?.details);
  return body.expense;
}

export const expensesApi = {
  list: (projectId: string) => request<ExpenseBook>(`/projects/${id(projectId)}/expenses`),
  async add(projectId: string, e: NewExpense) {
    try {
      return await send(projectId, e);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && (await renewSession())) return send(projectId, e);
      throw error;
    }
  },
  remove: (projectId: string, expenseId: string) => request<{ ok: true }>(`/projects/${id(projectId)}/expenses/${id(expenseId)}`, { method: "DELETE" }),
};
