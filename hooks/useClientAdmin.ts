"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientAdminApi } from "@/lib/client/api";
import type { DelayInput, InstalmentInput, ProofInput } from "@/lib/client/types";

const keys = {
  overview: ["client-admin", "overview"] as const,
  project: (id: string) => ["client-admin", "project", id] as const,
};

export const useClientOverview = () =>
  useQuery({ queryKey: keys.overview, queryFn: clientAdminApi.overview, staleTime: 30_000, refetchInterval: 2 * 60_000, placeholderData: keepPreviousData });

export const useClientProject = (projectId: string | null) =>
  useQuery({ queryKey: keys.project(projectId ?? ""), queryFn: () => clientAdminApi.project(projectId!), enabled: !!projectId, placeholderData: keepPreviousData });

/** Every change here moves money or dates: refresh this page, the admin dashboard and the projects (their dates may move) */
function useRefresh() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["client-admin"] }),
      qc.invalidateQueries({ queryKey: ["dashboard"] }),
      qc.invalidateQueries({ queryKey: ["projects"] }),
      qc.invalidateQueries({ queryKey: ["project"] }),
    ]);
}

const useAction = <V, R>(fn: (v: V) => Promise<R>) => {
  const refresh = useRefresh();
  return useMutation({ mutationFn: fn, onSuccess: refresh });
};

export const useDecideProof = () =>
  useAction(({ id, approve, note }: { id: string; approve: boolean; note: string }) => (approve ? clientAdminApi.approve(id, note) : clientAdminApi.reject(id, note)));
export const useAddClient = (projectId: string) => useAction((input: { email: string; name: string }) => clientAdminApi.addClient(projectId, input));
export const useRemoveClient = (projectId: string) => useAction((userId: string) => clientAdminApi.removeClient(projectId, userId));
export const useResetClientPassword = () => useAction((userId: string) => clientAdminApi.resetPassword(userId));
export const useSaveInstalment = (projectId: string) =>
  useAction(({ id, input }: { id: string | null; input: InstalmentInput }): Promise<unknown> => (id ? clientAdminApi.updateInstalment(id, input) : clientAdminApi.addInstalment(projectId, input)));
export const useDeleteInstalment = () => useAction((id: string) => clientAdminApi.deleteInstalment(id));
export const useRequestPayment = () => useAction((id: string) => clientAdminApi.requestPayment(id));
export const useRecordPayment = () => useAction(({ id, input }: { id: string; input: ProofInput }) => clientAdminApi.recordPayment(id, input));
export const useSetAdvance = (projectId: string) => useAction((override: boolean) => clientAdminApi.setAdvance(projectId, override));
export const useAddDelay = (projectId: string) => useAction((input: DelayInput) => clientAdminApi.addDelay(projectId, input));
