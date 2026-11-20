"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { purchasesApi, type DeliveryInput, type PurchaseInput } from "@/lib/inventory/purchases";
import { spendKey } from "@/lib/projects/hub";

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
    void qc.invalidateQueries({ queryKey: spendKey(projectId) }); // the Overview's Materials figure
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


/** Log a delivery (date, how many arrived, the rate paid, bill) or delete one; both refresh the list */
export function useAddDelivery(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({
    mutationFn: ({ purchaseId, ...d }: { purchaseId: string } & DeliveryInput) => purchasesApi.addDelivery(projectId, purchaseId, d),
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

/** The Material estimate's lines for "From estimate" (only fetched while that dialog is open) */
export const useEstimateLines = (projectId: string, enabled: boolean) =>
  useQuery({ queryKey: [...purchasesKey(projectId), "estimate"], queryFn: () => purchasesApi.estimate(projectId), enabled, staleTime: 15_000 });

/** Bring chosen estimate lines in as materials */
export function useImportFromEstimate(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({
    mutationFn: ({ boqId, partIds }: { boqId: string; partIds: string[] }) => purchasesApi.importFromEstimate(projectId, boqId, partIds),
    onSuccess: refresh,
  });
}