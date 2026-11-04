"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { materialPaymentsApi, type NewMaterialPayment } from "@/lib/inventory/materialPayments";

/* Under ["inventory", projectId]: a delivery received with a vendor refreshes what that vendor is owed too */
export const materialPaymentsKey = (projectId: string) => ["inventory", projectId, "payments"] as const;

export const useMaterialPayments = (projectId: string) =>
  useQuery({ queryKey: materialPaymentsKey(projectId), queryFn: () => materialPaymentsApi.list(projectId), staleTime: 30_000 });

export function useAddMaterialPayment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (p: NewMaterialPayment) => materialPaymentsApi.add(projectId, p), onSuccess: () => qc.invalidateQueries({ queryKey: materialPaymentsKey(projectId) }) });
}

export function useRemoveMaterialPayment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (paymentId: string) => materialPaymentsApi.remove(projectId, paymentId), onSuccess: () => qc.invalidateQueries({ queryKey: materialPaymentsKey(projectId) }) });
}