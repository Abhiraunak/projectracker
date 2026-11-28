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
  /** Archived entries: count nowhere; restore them or delete them for good */
  archived?: Expense[];
  byCategory: Record<ExpenseCategory, Totals>;
}

export interface NewExpense {
  category: ExpenseCategory;
  date: string;
  amount: number;
  purpose: string;
  remark: string;
  bill: File | null;
  /** Editing: take the current bill off (ignored when a new file is chosen) */
  removeBill?: boolean;
}

const id = (s: string) => encodeURIComponent(s);

/** A form, not JSON, because the bill is a file */
async function send(projectId: string, e: NewExpense, expenseId?: string) {
  const form = new FormData();
  form.append("category", e.category); // text first, file last
  form.append("date", e.date);
  form.append("amount", String(e.amount));
  form.append("purpose", e.purpose);
  form.append("remark", e.remark);
  if (expenseId && e.removeBill && !e.bill) form.append("removeBill", "true");
  if (e.bill) form.append("file", e.bill);
  const path = expenseId ? `/projects/${id(projectId)}/expenses/${id(expenseId)}` : `/projects/${id(projectId)}/expenses`;
  const res = await fetch(apiUrl(path), { method: expenseId ? "PUT" : "POST", body: form, credentials: "include", headers: { "X-Requested-With": "fetch" } });
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
  /** Change an entry: its figures, and attach, replace or remove the bill */
  async update(projectId: string, expenseId: string, e: NewExpense) {
    try {
      return await send(projectId, e, expenseId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && (await renewSession())) return send(projectId, e, expenseId);
      throw error;
    }
  },
  archive: (projectId: string, expenseId: string, archive: boolean) =>
    request<{ ok: true }>(`/projects/${id(projectId)}/expenses/${id(expenseId)}/${archive ? "archive" : "restore"}`, { method: "POST" }),
  remove: (projectId: string, expenseId: string) => request<{ ok: true }>(`/projects/${id(projectId)}/expenses/${id(expenseId)}`, { method: "DELETE" }),
};