import { request } from "@/lib/api";
import type { BoqDocument, BoqRecord, BoqStatus, BoqSummary } from "./types";

export interface BoqListQuery {
  q?: string;
  status?: BoqStatus;
  page: number;
  pageSize: number;
}

export interface BoqStats {
  count: number;
  drafts: number;
  finals: number;
  totalValue: number; // all BOQs' grand totals added up
  updatedThisWeek: number;
}

export interface BoqListPage {
  items: BoqSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  stats: BoqStats;
}

const json = (data: unknown) => JSON.stringify(data);

export const boqApi = {
  list: ({ q, status, page, pageSize }: BoqListQuery) => {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (q) query.set("q", q);
    if (status) query.set("status", status);
    return request<BoqListPage>(`/boqs?${query}`);
  },

  get: (id: string) => request<{ boq: BoqRecord }>(`/boqs/${id}`).then((r) => r.boq),

  create: (document: BoqDocument) =>
    request<{ boq: BoqRecord }>("/boqs", { method: "POST", body: json({ document }) }).then((r) => r.boq),

  duplicate: (id: string) => request<{ boq: BoqRecord }>(`/boqs/${id}/duplicate`, { method: "POST" }).then((r) => r.boq),

  /** Refused with 409 if someone else saved first (version is old), or if the BOQ is final */
  save: (id: string, input: { document: BoqDocument; version: number; status: BoqStatus }) =>
    request<{ boq: BoqRecord }>(`/boqs/${id}`, { method: "PUT", body: json(input) }).then((r) => r.boq),

  remove: (id: string) => request<void>(`/boqs/${id}`, { method: "DELETE" }),
};
