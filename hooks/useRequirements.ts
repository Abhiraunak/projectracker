"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { procurementApi } from "@/lib/materials/procurementApi";
import type { OrderUpdate, RequirementInput } from "@/lib/materials/types";
import { useRefreshMaterials } from "./useRefreshMaterials";

export const useRequirements = (projectId: string) =>
  useQuery({ queryKey: ["requirements", projectId], queryFn: () => procurementApi.listRequirements(projectId) });

export function useCreateRequirement(projectId: string) {
  const refresh = useRefreshMaterials();
  return useMutation({
    mutationFn: (input: RequirementInput) => procurementApi.createRequirement(projectId, input),
    onSuccess: refresh,
  });
}

export function useUpdateOrder() {
  const refresh = useRefreshMaterials();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: OrderUpdate }) => procurementApi.updateOrder(id, update),
    onSuccess: refresh,
  });
}

export function useDeleteRequirement() {
  const refresh = useRefreshMaterials();
  return useMutation({
    mutationFn: (id: string) => procurementApi.deleteRequirement(id),
    onSuccess: refresh,
  });
}
