"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "@/lib/inventory/api";
import type { ItemMaterialsInput, MovementInput, OrderInput, RecipeInput, RequestInput } from "@/lib/inventory/types";

/** Every query of one project's materials starts with this, so one change can refresh them all */
const root = (projectId: string) => ["inventory", projectId] as const;
export const inventoryKeys = {
  plan: (p: string) => [...root(p), "plan"] as const,
  sync: (p: string) => [...root(p), "sync"] as const,
  importBoqs: (p: string) => [...root(p), "import-boqs"] as const,
  importOutline: (p: string, boqId: string) => [...root(p), "import-outline", boqId] as const,
  stock: (p: string) => [...root(p), "stock"] as const,
  movements: (p: string, params: object) => [...root(p), "movements", params] as const,
  orders: (p: string) => [...root(p), "orders"] as const,
  recipes: ["material-recipes"] as const,
  catalog: ["materials", "catalog"] as const,
};

function useRefreshProject(projectId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: root(projectId) });
}

export const useMaterialPlan = (projectId: string) => useQuery({ queryKey: inventoryKeys.plan(projectId), queryFn: () => inventoryApi.plan(projectId) });

export const useSyncPreview = (projectId: string, enabled: boolean) =>
  useQuery({ queryKey: inventoryKeys.sync(projectId), queryFn: () => inventoryApi.previewSync(projectId), enabled, staleTime: 0, gcTime: 0 });

export function useApplySync(projectId: string) {
  const refresh = useRefreshProject(projectId);
  return useMutation({ mutationFn: () => inventoryApi.applySync(projectId), onSuccess: refresh });
}

/** Import from BOQ: every BOQ (this project's first), then one BOQ's sections and items to tick */
export const useImportableBoqs = (projectId: string, enabled: boolean) =>
  useQuery({ queryKey: inventoryKeys.importBoqs(projectId), queryFn: () => inventoryApi.importableBoqs(projectId), enabled, staleTime: 0 });

export const useImportOutline = (projectId: string, boqId: string | null) =>
  useQuery({ queryKey: inventoryKeys.importOutline(projectId, boqId ?? ""), queryFn: () => inventoryApi.importOutline(projectId, boqId!), enabled: !!boqId, staleTime: 0 });

export function useImportFromBoq(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boqId, partKeys }: { boqId: string; partKeys: string[] }) => inventoryApi.importFromBoq(projectId, boqId, partKeys),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: root(projectId) });
      void qc.invalidateQueries({ queryKey: ["boqs"] }); // a BOQ may have been linked to the project
    },
  });
}

export function useSaveItemMaterials(projectId: string) {
  const refresh = useRefreshProject(projectId);
  return useMutation({ mutationFn: ({ itemId, input }: { itemId: string; input: ItemMaterialsInput }) => inventoryApi.saveItemMaterials(itemId, input), onSuccess: refresh });
}

export const useInventory = (projectId: string) => useQuery({ queryKey: inventoryKeys.stock(projectId), queryFn: () => inventoryApi.inventory(projectId) });

export const useMovements = (projectId: string, params: { materialId?: string; boqItemId?: string; page: number; pageSize: number }) =>
  useQuery({ queryKey: inventoryKeys.movements(projectId, params), queryFn: () => inventoryApi.movements(projectId, params), placeholderData: keepPreviousData });

export function useRecordMovement(projectId: string) {
  const refresh = useRefreshProject(projectId);
  return useMutation({ mutationFn: (input: MovementInput) => inventoryApi.recordMovement(projectId, input), onSuccess: refresh });
}

export const useOrders = (projectId: string) => useQuery({ queryKey: inventoryKeys.orders(projectId), queryFn: () => inventoryApi.orders(projectId) });

export function useSaveOrder(projectId: string) {
  const refresh = useRefreshProject(projectId);
  return useMutation({
    mutationFn: ({ id, materialId, input }: { id?: string; materialId: string; input: OrderInput }) =>
      id ? inventoryApi.updateOrder(id, input) : inventoryApi.createOrder(projectId, { ...input, materialId }),
    onSuccess: refresh,
  });
}

export function useDeleteOrder(projectId: string) {
  const refresh = useRefreshProject(projectId);
  return useMutation({ mutationFn: (id: string) => inventoryApi.deleteOrder(id), onSuccess: refresh });
}

export const useRecipes = () => useQuery({ queryKey: inventoryKeys.recipes, queryFn: () => inventoryApi.recipes(), staleTime: 5 * 60_000 });

export function useSaveRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: RecipeInput }) => (id ? inventoryApi.updateRecipe(id, input) : inventoryApi.createRecipe(input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKeys.recipes }),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => inventoryApi.deleteRecipe(id), onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKeys.recipes }) });
}

/* ------------------------------ cost, alerts, requests ------------------------------ */

export const useMaterialCost = (projectId: string, enabled = true) =>
  useQuery({ queryKey: [...root(projectId), "cost"], queryFn: () => inventoryApi.cost(projectId), enabled });

export const useStockAlerts = (projectId: string) => useQuery({ queryKey: [...root(projectId), "alerts"], queryFn: () => inventoryApi.alerts(projectId) });

/** Alerts are refreshed on the server a moment after each change: look again shortly after */
export function useRefreshAlerts(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => inventoryApi.refreshAlerts(projectId),
    onSuccess: (alerts) => {
      qc.setQueryData([...root(projectId), "alerts"], alerts);
      void qc.invalidateQueries({ queryKey: ["stock-alerts"] });
    },
  });
}

/** Every open alert on every ongoing project, and requests waiting for my approval: the count in the menu */
export function useInventoryBadge(enabled: boolean, canApprove: boolean) {
  const alerts = useQuery({ queryKey: ["stock-alerts"], queryFn: () => inventoryApi.allAlerts(), enabled, refetchInterval: 5 * 60_000, staleTime: 60_000 });
  const pending = useQuery({ queryKey: ["material-requests", "pending"], queryFn: () => inventoryApi.pendingRequests(), enabled: enabled && canApprove, refetchInterval: 5 * 60_000, staleTime: 60_000 });
  return (alerts.data?.length ?? 0) + (pending.data ?? 0);
}

export const useMaterialRequests = (projectId: string, status: "open" | "all") =>
  useQuery({ queryKey: [...root(projectId), "requests", status], queryFn: () => inventoryApi.requests(projectId, status) });

function useRefreshRequests(projectId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: root(projectId) }),
      qc.invalidateQueries({ queryKey: ["material-requests"] }),
      qc.invalidateQueries({ queryKey: ["stock-alerts"] }),
    ]);
}

export function useCreateRequest(projectId: string) {
  const refresh = useRefreshRequests(projectId);
  return useMutation({ mutationFn: (input: RequestInput) => inventoryApi.createRequest(projectId, input), onSuccess: refresh });
}

export function useRequestAction(projectId: string) {
  const refresh = useRefreshRequests(projectId);
  return useMutation({
    mutationFn: (a:
      | { id: string; action: "approve" | "reject" | "cancel"; note: string }
      | { id: string; action: "issue"; quantity?: number; note: string }
      | { id: string; action: "order"; quantity?: number; rate: number; vendorId: string | null; expectedDelivery: string | null; reference: string }) => {
      if (a.action === "issue") return inventoryApi.issueRequest(a.id, { quantity: a.quantity, note: a.note });
      if (a.action === "order") return inventoryApi.orderRequest(a.id, { quantity: a.quantity, rate: a.rate, vendorId: a.vendorId, expectedDelivery: a.expectedDelivery, reference: a.reference });
      return inventoryApi.decideRequest(a.id, a.action, a.note);
    },
    onSuccess: refresh,
  });
}
