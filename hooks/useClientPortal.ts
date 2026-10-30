"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientApi } from "@/lib/client/api";
import type { ProofInput } from "@/lib/client/types";

export const clientKeys = {
  projects: ["client", "projects"] as const,
  portal: (projectId: string) => ["client", "portal", projectId] as const,
  invoice: (id: string) => ["client", "invoice", id] as const,
};

export const useClientProjects = () => useQuery({ queryKey: clientKeys.projects, queryFn: clientApi.projects, staleTime: 5 * 60_000 });

export const useClientPortal = (projectId: string | null) =>
  useQuery({
    queryKey: clientKeys.portal(projectId ?? ""),
    queryFn: () => clientApi.portal(projectId!),
    enabled: !!projectId,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // an approved payment shows up without a reload
  });

export const useInvoice = (id: string) => useQuery({ queryKey: clientKeys.invoice(id), queryFn: () => clientApi.invoice(id) });

export function useSendProof(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instalmentId, input, file }: { instalmentId: string; input: ProofInput; file: File }) => clientApi.sendProof(instalmentId, input, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientKeys.portal(projectId) }),
  });
}
