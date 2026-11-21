"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { labourSimpleApi as api, type MeasureInput, type SaveDayInput } from "@/lib/labour/simple";
import { labourApi, type NewPayment } from "@/lib/projects/labour";

/* Every key starts with "labour-simple", so one refresh after a change reaches every tab */
const k = (p: string, ...rest: (string | null | undefined)[]) => ["labour-simple", p, ...rest] as const;

/** After any change: every Labour tab, and the money figures elsewhere (Overview, project cards, Expenditure) */
export function useLabourRefresh(projectId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["labour-simple", projectId] });
    void qc.invalidateQueries({ queryKey: ["attendance"] });
    void qc.invalidateQueries({ queryKey: ["projects"] });
  };
}

export const useWorks = (p: string) => useQuery({ queryKey: k(p, "works"), queryFn: () => api.works(p), staleTime: 15_000 });
export const usePeople = (p: string) => useQuery({ queryKey: k(p, "people"), queryFn: () => api.people(p), staleTime: 30_000 });
export const useDay = (p: string, date: string, contractor: string, taskId: string | null) =>
  useQuery({ queryKey: k(p, "day", date, contractor.toLowerCase(), taskId ?? ""), queryFn: () => api.day(p, date, contractor, taskId), enabled: !!contractor, staleTime: 5_000 });
export const useDayTotals = (p: string, from: string, to: string, taskId: string | null, contractor?: string) =>
  useQuery({ queryKey: k(p, "days", from, to, taskId ?? "", contractor ?? ""), queryFn: () => api.days(p, from, to, taskId, contractor), staleTime: 10_000 });
export const useRecords = (p: string, from: string, to: string, taskId?: string | null) =>
  useQuery({ queryKey: k(p, "records", from, to, taskId === undefined ? "*" : (taskId ?? "")), queryFn: () => api.records(p, from, to, taskId), enabled: from <= to, staleTime: 10_000 });
export const useStatement = (p: string, person: string, from: string, to: string) =>
  useQuery({ queryKey: k(p, "statement", person.toLowerCase(), from, to), queryFn: () => api.statement(p, person, from, to), enabled: !!person && from <= to, staleTime: 10_000 });
export const useSubcontract = (p: string) => useQuery({ queryKey: k(p, "subcontract"), queryFn: () => api.subcontract(p), staleTime: 15_000 });
export const useRates = (p: string, from: string, to: string) =>
  useQuery({ queryKey: k(p, "rates", from, to), queryFn: () => api.rates(p, from, to), enabled: from <= to, staleTime: 10_000 });
export const useComparison = (p: string, taskId: string | null, from: string, to: string) =>
  useQuery({ queryKey: k(p, "compare", taskId, from, to), queryFn: () => api.compare(p, taskId!, from, to), enabled: !!taskId && from <= to, staleTime: 10_000 });

/** Saving a day happens as people type; the other tabs refresh once it is in */
export function useSaveDay(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: (body: SaveDayInput) => api.saveDay(p, body), onSuccess: refresh });
}

/** Copy one saved day's crew to other days (already marked days are skipped) */
export function useCopyDay(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({
    mutationFn: (body: { date: string; contractorName: string; taskId: string | null; dates: string[] }) => api.copyDay(p, body),
    onSuccess: refresh,
  });
}

export function useAddWork(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: (title: string) => api.addWork(p, title), onSuccess: refresh });
}
export function useRenameWork(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: ({ id, title }: { id: string; title: string }) => api.renameWork(p, id, title), onSuccess: refresh });
}
export function useSetWorkRate(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: ({ id, ...body }: { id: string; quantity: number; contractorRate: number }) => api.setWorkRate(p, id, body), onSuccess: refresh });
}
export function useSetQuantity(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: ({ id, quantity }: { id: string; quantity: number }) => api.setQuantity(p, id, quantity), onSuccess: refresh });
}

export function useAddPayment(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: (body: NewPayment) => labourApi.addPayment(p, body), onSuccess: refresh });
}
export function useUpdatePayment(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; contractorName: string; date: string; amount: number; remark: string }) => api.updatePayment(p, id, body),
    onSuccess: refresh,
  });
}
export function useRemovePayment(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: (id: string) => labourApi.removePayment(p, id), onSuccess: refresh });
}

export function useSaveMeasure(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: ({ id, body }: { id?: string; body: MeasureInput }) => (id ? api.updateMeasure(p, id, body) : api.addMeasure(p, body)), onSuccess: refresh });
}
export function useRemoveMeasure(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: (id: string) => api.removeMeasure(p, id), onSuccess: refresh });
}

export function useSaveQuote(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({
    mutationFn: async ({ id, taskId, body }: { id?: string; taskId: string; body: { name: string; rate: number; unit: string } }): Promise<void> => {
      if (id) await api.updateQuote(p, id, body);
      else await api.addQuote(p, taskId, body);
    },
    onSuccess: refresh,
  });
}
export function useRemoveQuote(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: (id: string) => api.removeQuote(p, id), onSuccess: refresh });
}