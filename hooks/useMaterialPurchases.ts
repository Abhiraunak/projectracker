"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { purchasesApi, type BoqLineInput, type PurchaseInput } from "@/lib/inventory/purchases";

/* Under ["inventory", projectId], like the rest of the project's materials */
export const purchasesKey = (projectId: string) => ["inventory", projectId, "purchases"] as const;

export const useMaterialPurchases = (projectId: string, enabled = true) =>
  useQuery({ queryKey: purchasesKey(projectId), queryFn: () => purchasesApi.list(projectId), staleTime: 30_000, enabled });

/** After any change: this list, and the project cards, the project page and Expenditure (their "spent" includes materials) */
function useRefresh(projectId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: purchasesKey(projectId) });
    void qc.invalidateQueries({ queryKey: ["projects"] });
  };
}

export function useSavePurchase(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: PurchaseInput }) => (id ? purchasesApi.update(projectId, id, input) : purchasesApi.add(projectId, input)),
    onSuccess: refresh,
  });
}

export function useRemovePurchase(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({ mutationFn: (purchaseId: string) => purchasesApi.remove(projectId, purchaseId), onSuccess: refresh });
}

/** The BOQ's materials to pick from (always fetched fresh when the dialog opens) */
export const useBoqMaterials = (projectId: string) =>
  useQuery({ queryKey: [...purchasesKey(projectId), "from-boq"], queryFn: () => purchasesApi.fromBoq(projectId), staleTime: 0 });

export function useAddFromBoq(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({ mutationFn: (body: { date: string; lines: BoqLineInput[] }) => purchasesApi.addFromBoq(projectId, body), onSuccess: refresh });
}

/** Log a delivery (date, how many arrived, bill) or delete one; both refresh the list */
export function useAddDelivery(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({
    mutationFn: ({ purchaseId, ...d }: { purchaseId: string; date: string; quantity: number; bill: File | null }) => purchasesApi.addDelivery(projectId, purchaseId, d),
    onSuccess: refresh,
  });
}

export function useRemoveDelivery(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({
    mutationFn: ({ purchaseId, deliveryId }: { purchaseId: string; deliveryId: string }) => purchasesApi.removeDelivery(projectId, purchaseId, deliveryId),
    onSuccess: refresh,
  });
}