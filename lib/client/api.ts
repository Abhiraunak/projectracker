import { ApiError, apiUrl, renewSession, request } from "@/lib/api";
import type { ClientOverview, ClientPortal, ClientProject, DelayInput, InstalmentInput, Invoice, Proof, ProofInput } from "./types";

const json = (data: unknown) => JSON.stringify(data);

/**
 * Sends a payment screenshot with its details. Not through request(): that sets a JSON content type,
 * and a file has to go as multipart (the browser sets that header itself, with the boundary).
 */
async function upload(instalmentId: string, input: ProofInput, file: File, isRetry = false): Promise<Proof> {
  const form = new FormData();
  form.set("amount", String(input.amount));
  form.set("paidOn", input.paidOn);
  form.set("mode", input.mode);
  form.set("reference", input.reference);
  form.set("note", input.note);
  form.set("file", file); // file last, after the fields
  const res = await fetch(apiUrl(`/client/instalments/${instalmentId}/proofs`), {
    method: "POST",
    body: form,
    credentials: "include",
    headers: { "X-Requested-With": "fetch" },
  });
  if (res.status === 401 && !isRetry && (await renewSession())) return upload(instalmentId, input, file, true);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.error ?? "The upload didn't go through", body?.details);
  return body.proof as Proof;
}

/** What a client account uses */
export const clientApi = {
  projects: () => request<{ projects: { id: string; title: string; status: string }[] }>("/client/projects").then((r) => r.projects),
  portal: (projectId: string) => request<ClientPortal>(`/client/projects/${projectId}`),
  invoice: (instalmentId: string) => request<Invoice>(`/client/invoices/${instalmentId}`),
  sendProof: upload,
};

/** The admin's Clients page */
export const clientAdminApi = {
  overview: () => request<ClientOverview>("/client-admin/overview"),
  project: (projectId: string) => request<ClientProject>(`/client-admin/projects/${projectId}`),
  addClient: (projectId: string, input: { email: string; name: string }) =>
    request<{ userId: string; email: string; password: string | null; isNew: boolean }>(`/client-admin/projects/${projectId}/clients`, { method: "POST", body: json(input) }),
  removeClient: (projectId: string, userId: string) => request<void>(`/client-admin/projects/${projectId}/clients/${userId}`, { method: "DELETE" }),
  resetPassword: (userId: string) => request<{ email: string; password: string }>(`/client-admin/clients/${userId}/reset-password`, { method: "POST" }),
  addInstalment: (projectId: string, input: InstalmentInput) =>
    request<{ id: string; invoiceNo: string }>(`/client-admin/projects/${projectId}/instalments`, { method: "POST", body: json(input) }),
  updateInstalment: (id: string, patch: Partial<InstalmentInput>) => request<void>(`/client-admin/instalments/${id}`, { method: "PATCH", body: json(patch) }),
  deleteInstalment: (id: string) => request<void>(`/client-admin/instalments/${id}`, { method: "DELETE" }),
  requestPayment: (id: string) => request<void>(`/client-admin/instalments/${id}/request`, { method: "POST" }),
  recordPayment: (id: string, input: ProofInput) => request<{ proof: Proof }>(`/client-admin/instalments/${id}/payments`, { method: "POST", body: json(input) }),
  approve: (proofId: string, note: string) => request<{ proof: Proof }>(`/client-admin/proofs/${proofId}/approve`, { method: "POST", body: json({ note }) }),
  reject: (proofId: string, note: string) => request<{ proof: Proof }>(`/client-admin/proofs/${proofId}/reject`, { method: "POST", body: json({ note }) }),
  setAdvance: (projectId: string, override: boolean) => request<void>(`/client-admin/projects/${projectId}/advance`, { method: "PATCH", body: json({ override }) }),
  addDelay: (projectId: string, input: DelayInput) =>
    request<{ id: string; tasksMoved: number; paymentsMoved: number }>(`/client-admin/projects/${projectId}/delays`, { method: "POST", body: json(input) }),
};
