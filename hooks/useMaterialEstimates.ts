"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { estimatesApi, type EstimateInput } from "@/lib/inventory/estimates";

/*
 * Under ["inventory", projectId] like every other materials query: adding, changing or removing one refreshes the
 * tiles, the sheets, the stock tab and the cost tab together (they all count it as needed).
 */
export const estimatesKey = (projectId: string) => ["inventory", projectId, "estimates"] as const;

export const useMaterialEstimates = (projectId: string) =>
  useQuery({ queryKey: estimatesKey(projectId), queryFn: () => estimatesApi.list(projectId), staleTime: 30_000 });

function useRefresh(projectId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([qc.invalidateQueries({ queryKey: ["inventory", projectId] }), qc.invalidateQueries({ queryKey: ["materials", "catalog"] })]);
}

export function useSaveEstimate(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: EstimateInput }) => (id ? estimatesApi.update(projectId, id, input) : estimatesApi.add(projectId, input)),
    onSuccess: refresh,
  });
}

export function useDeleteEstimate(projectId: string) {
  const refresh = useRefresh(projectId);
  return useMutation({ mutationFn: (estimateId: string) => estimatesApi.remove(projectId, estimateId), onSuccess: refresh });
}