"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { labourSimpleApi as api, type ArchivedPick, type BillInput, type BillPaymentInput, type MeasureInput, type PeriodPaymentInput, type SaveDayInput, type SubPaymentInput } from "@/lib/labour/simple";
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

/** Saving a day (the Save button); the other tabs refresh once it is in */
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

/** "Paid for a period" in the Attendance tab (also counted in the Payments tab) */
export const usePeriodPayments = (p: string) => useQuery({ queryKey: k(p, "period-payments"), queryFn: () => api.periodPayments(p), staleTime: 10_000 });
export function useSavePeriodPayment(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: PeriodPaymentInput }) => (id ? api.updatePeriodPayment(p, id, body) : api.addPeriodPayment(p, body)),
    onSuccess: refresh,
  });
}
export function useRemovePeriodPayment(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: (id: string) => api.removePeriodPayment(p, id), onSuccess: refresh });
}

export function useSaveMeasure(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: MeasureInput }): Promise<void> => {
      if (id) await api.updateMeasure(p, id, body);
      else await api.addMeasure(p, body);
    },
    onSuccess: refresh,
  });
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

/* ------------------------------------------------ team heads and individuals ------------------------------------------------ */

export const useTeam = (p: string) => useQuery({ queryKey: k(p, "team"), queryFn: () => api.team(p), staleTime: 10_000 });
export const usePerson = (p: string, name: string) =>
  useQuery({ queryKey: k(p, "person", name.toLowerCase()), queryFn: () => api.person(p, name), enabled: !!name, staleTime: 10_000 });
export const useArchived = (p: string) => useQuery({ queryKey: k(p, "archived"), queryFn: () => api.archived(p), staleTime: 10_000 });

/** Archive (or restore) a whole person with their days and payments */
export function useArchivePerson(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: ({ name, archive }: { name: string; archive: boolean }) => api.archivePerson(p, name, archive), onSuccess: refresh });
}
/** Archive (or restore) one payment, a team head's or a subcontractor's */
export function useArchivePayment(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: ({ id, archive }: { id: string; archive: boolean }) => api.archivePayment(p, id, archive), onSuccess: refresh });
}
/** Delete for good what was archived (ticked in Archived) */
export function useDeleteArchived(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: (body: ArchivedPick) => api.deleteArchived(p, body), onSuccess: refresh });
}

/* ------------------------------------------------ subcontract ------------------------------------------------ */

export function useProgress(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({
    mutationFn: ({ id, progressId, body }: { id: string; progressId?: string; body: { date: string; done: number } }) =>
      progressId ? api.updateProgress(p, progressId, body) : api.addProgress(p, id, body),
    onSuccess: refresh,
  });
}
export function useSaveSubPayment(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: SubPaymentInput }): Promise<void> => {
      if (id) await api.updateSubPayment(p, id, body);
      else await api.addSubPayment(p, body);
    },
    onSuccess: refresh,
  });
}
export function useArchiveMeasure(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: ({ id, archive }: { id: string; archive: boolean }) => api.archiveMeasure(p, id, archive), onSuccess: refresh });
}
export function useArchiveSubcontractor(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: ({ name, archive }: { name: string; archive: boolean }) => api.archiveSubcontractor(p, name, archive), onSuccess: refresh });
}

/* ------------------------------------------------ bills ------------------------------------------------ */

/** Add (or change) a bill: a period's amount for a team head or person */
export function useSaveBill(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: BillInput }): Promise<void> => {
      if (id) await api.updateBill(p, id, body);
      else await api.addBill(p, body);
    },
    onSuccess: refresh,
  });
}
/** Archive (or restore) a bill with the payments made against it */
export function useArchiveBill(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: ({ id, archive }: { id: string; archive: boolean }) => api.archiveBill(p, id, archive), onSuccess: refresh });
}
/** Pay against a bill on a day (or change such a payment) */
export function useSaveBillPayment(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: BillPaymentInput }): Promise<void> => {
      if (id) await api.updateBillPayment(p, id, body);
      else await api.addBillPayment(p, body);
    },
    onSuccess: refresh,
  });
}
/** An older entry (a period's amount saved as a payment) becomes a bill with nothing paid yet */
export function usePaymentToBill(p: string) {
  const refresh = useLabourRefresh(p);
  return useMutation({ mutationFn: (id: string) => api.paymentToBill(p, id), onSuccess: refresh });
}