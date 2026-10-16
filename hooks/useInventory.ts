"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { inventoryApi } from "@/lib/materials/inventoryApi";
import type { MovementInput, MovementQuery } from "@/lib/materials/types";
import { useRefreshMaterials } from "./useRefreshMaterials";

export const useInventory = (projectId: string) =>
  useQuery({ queryKey: ["inventory", projectId], queryFn: () => inventoryApi.listInventory(projectId) });

/** One page of the stock log. The previous page stays visible while the next one loads. */
export const useMovements = (projectId: string, query: MovementQuery) =>
  useQuery({
    queryKey: ["movements", projectId, query],
    queryFn: () => inventoryApi.listMovements(projectId, query),
    placeholderData: keepPreviousData,
  });

export function useRecordMovement(projectId: string) {
  const refresh = useRefreshMaterials();
  return useMutation({
    mutationFn: (input: MovementInput) => inventoryApi.recordMovement(projectId, input),
    onSuccess: refresh,
  });
}
