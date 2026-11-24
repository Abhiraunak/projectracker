"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { estimatesApi, type Estimate, type EstimateSave } from "@/lib/estimates/api";
import { purchasesKey } from "@/hooks/useMaterialPurchases";
import { spendKey } from "@/lib/projects/hub";

export const estimatesKey = (projectId: string) => ["estimates", projectId] as const;
const oneKey = (projectId: string, estimateId: string) => ["estimates", projectId, estimateId] as const;

export const useEstimates = (projectId: string, enabled = true) =>
  useQuery({ queryKey: [...estimatesKey(projectId), "list"], queryFn: () => estimatesApi.list(projectId), staleTime: 15_000, enabled });

export const useEstimate = (projectId: string, estimateId: string) =>
  useQuery({ queryKey: oneKey(projectId, estimateId), queryFn: () => estimatesApi.get(projectId, estimateId), staleTime: 60_000 });

export function useCreateEstimate(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => estimatesApi.create(projectId, name),
    onSuccess: (e: Estimate) => {
      qc.setQueryData(oneKey(projectId, e.id), e);
      void qc.invalidateQueries({ queryKey: [...estimatesKey(projectId), "list"] });
    },
  });
}

/** Saved as people type; the list's totals refresh, the open page keeps what is on screen */
export function useSaveEstimate(projectId: string, estimateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EstimateSave) => estimatesApi.save(projectId, estimateId, body),
    onSuccess: (e: Estimate) => {
      qc.setQueryData(oneKey(projectId, estimateId), e);
      void qc.invalidateQueries({ queryKey: [...estimatesKey(projectId), "list"] });
    },
  });
}

export function useDeleteEstimate(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (estimateId: string) => estimatesApi.remove(projectId, estimateId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: estimatesKey(projectId) }),
  });
}

/** Send to Materials: the Materials tab and the project's totals change too */
export function useSendEstimate(projectId: string, estimateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => estimatesApi.send(projectId, estimateId),
    onSuccess: (r) => {
      qc.setQueryData(oneKey(projectId, estimateId), r.estimate);
      void qc.invalidateQueries({ queryKey: [...estimatesKey(projectId), "list"] });
      void qc.invalidateQueries({ queryKey: purchasesKey(projectId) });
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: spendKey(projectId) }); // the Overview's planned materials
    },
  });
}