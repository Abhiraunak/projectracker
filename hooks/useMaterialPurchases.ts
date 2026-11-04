"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { purchasesApi, type PurchaseInput } from "@/lib/inventory/purchases";

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