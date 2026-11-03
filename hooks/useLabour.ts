"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { labourApi, type NewPayment } from "@/lib/projects/labour";

/*
 * Both keys start with "attendance": saving or editing attendance already refreshes everything under that key, so
 * the donut and each contractor's "earned" follow straight away.
 */
export const labourSummaryKey = (projectId: string) => ["attendance", "labour-summary", projectId] as const;
export const paymentsKey = (projectId: string) => ["attendance", "contractor-payments", projectId] as const;

export const useLabourSummary = (projectId: string) =>
  useQuery({ queryKey: labourSummaryKey(projectId), queryFn: () => labourApi.summary(projectId), staleTime: 30_000 });

export const usePayments = (projectId: string) =>
  useQuery({ queryKey: paymentsKey(projectId), queryFn: () => labourApi.payments(projectId), staleTime: 30_000 });

function useRefresh(projectId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([qc.invalidateQueries({ queryKey: paymentsKey(projectId) }), qc.invalidateQueries({ queryKey: labourSummaryKey(projectId) })]);
}

export function useAddPayment(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({ mutationFn: (p: NewPayment) => labourApi.addPayment(projectId, p), onSuccess: refresh });
}

export function useRemovePayment(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({ mutationFn: (paymentId: string) => labourApi.removePayment(projectId, paymentId), onSuccess: refresh });
}