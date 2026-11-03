"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { materialsTabApi, type QuickMove } from "@/lib/inventory/materialsTab";

/* Under ["inventory", projectId] like every materials query: a receipt or an issue refreshes the list, the graph,
   the material's page and the full inventory screen together. */
export const materialsTabKey = (projectId: string) => ["inventory", projectId, "tab"] as const;

export const useMaterialsOverview = (projectId: string) =>
  useQuery({ queryKey: materialsTabKey(projectId), queryFn: () => materialsTabApi.overview(projectId), staleTime: 30_000 });

export const useMaterialDetail = (projectId: string, materialId: string | null) =>
  useQuery({
    queryKey: [...materialsTabKey(projectId), "detail", materialId ?? ""],
    queryFn: () => materialsTabApi.detail(projectId, materialId!),
    enabled: !!materialId,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

export function useQuickMove(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (m: QuickMove) => materialsTabApi.move(projectId, m),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory", projectId] }),
  });
}