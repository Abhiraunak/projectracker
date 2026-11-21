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

/** Archive a material (off the list, counted nowhere) or restore it */
export function useArchivePurchase(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({ mutationFn: ({ purchaseId, archived }: { purchaseId: string; archived: boolean }) => purchasesApi.archive(projectId, purchaseId, archived), onSuccess: refresh });
}

/** Delete archived materials for good, one or many, in one all-or-nothing request */
export function useRemovePurchases(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({ mutationFn: (ids: string[]) => purchasesApi.removeMany(projectId, ids), onSettled: refresh });
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

/** Correct a delivery: date, how many, rate or amount */
export function useUpdateDelivery(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({
    mutationFn: ({ purchaseId, deliveryId, ...d }: { purchaseId: string; deliveryId: string } & Omit<DeliveryInput, "bill">) => purchasesApi.updateDelivery(projectId, purchaseId, deliveryId, d),
    onSuccess: refresh,
  });
}

/** Archive a delivery (it stops counting) or restore it */
export function useArchiveDelivery(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({
    mutationFn: ({ purchaseId, deliveryId, archived }: { purchaseId: string; deliveryId: string; archived: boolean }) => purchasesApi.archiveDelivery(projectId, purchaseId, deliveryId, archived),
    onSuccess: refresh,
  });
}

/** Delete an archived delivery for good */
export function useRemoveDelivery(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({
    mutationFn: ({ purchaseId, deliveryId }: { purchaseId: string; deliveryId: string }) => purchasesApi.removeDelivery(projectId, purchaseId, deliveryId),
    onSuccess: refresh,
  });
}

/**
 * Delete several archived deliveries for good, one after another with the same call as a single delete (no new
 * server route). Stops at the first that fails; the list refreshes either way, showing what is left.
 */
export function useRemoveDeliveries(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({
    mutationFn: async ({ purchaseId, deliveryIds }: { purchaseId: string; deliveryIds: string[] }) => {
      for (const deliveryId of deliveryIds) await purchasesApi.removeDelivery(projectId, purchaseId, deliveryId);
    },
    onSettled: refresh,
  });
}

/** The Material estimate's lines for "From estimate" (only fetched while that dialog is open) */
export const useEstimateLines = (projectId: string, enabled: boolean) =>
  useQuery({ queryKey: [...purchasesKey(projectId), "estimate"], queryFn: () => purchasesApi.estimate(projectId), enabled, staleTime: 15_000 });

/** Bring chosen estimate lines in as materials */
export function useImportFromEstimate(projectId: string) {
  const refresh = useRefresh(projectId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boqId, partIds }: { boqId: string; partIds: string[] }) => purchasesApi.importFromEstimate(projectId, boqId, partIds),
    onSuccess: () => {
      refresh();
      void qc.invalidateQueries({ queryKey: ["estimates", projectId] }); // the lines brought in now show "in Materials" there
    },
  });
}