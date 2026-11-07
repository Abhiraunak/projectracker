"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { boqApi, type BoqListQuery } from "@/lib/boq/api";
import type { BoqDocument, BoqRecord, BoqStatus } from "@/lib/boq/types";

export const boqKeys = {
  all: ["boqs"] as const,
  list: (query: BoqListQuery) => ["boqs", query] as const,
  one: (id: string) => ["boq", id] as const,
};

/** One page of the dashboard; the previous page stays visible while the next loads */
export const useBoqList = (query: BoqListQuery) =>
  useQuery({ queryKey: boqKeys.list(query), queryFn: () => boqApi.list(query), placeholderData: keepPreviousData });

/** One BOQ. The editor keeps its own copy once loaded, so it is never refetched behind its back. */
export const useBoq = (id: string) =>
  useQuery({ queryKey: boqKeys.one(id), queryFn: () => boqApi.get(id), staleTime: Infinity, refetchOnWindowFocus: false });

function useRemember() {
  const queryClient = useQueryClient();
  return (boq: BoqRecord) => {
    queryClient.setQueryData(boqKeys.one(boq.id), boq);
    void queryClient.invalidateQueries({ queryKey: boqKeys.all });
    if (boq.project) void queryClient.invalidateQueries({ queryKey: ["projects"] }); // the project's tile and hub list its BOQs
  };
}

/** `projectId`: the new BOQ belongs to that project from the start (made inside the project workspace) */
export function useCreateBoq(projectId: string | null = null) {
  const remember = useRemember();
  return useMutation({ mutationFn: (document: BoqDocument) => boqApi.create(document, projectId), onSuccess: remember });
}

/** `projectId`: the copy stays in that project (copied inside the project workspace); otherwise it has no project */
export function useDuplicateBoq(projectId: string | null = null) {
  const remember = useRemember();
  return useMutation({
    mutationFn: async (id: string) => {
      const copy = await boqApi.duplicate(id);
      return projectId ? boqApi.setProject(copy.id, projectId) : copy;
    },
    onSuccess: remember,
  });
}

export function useSaveBoq(id: string) {
  const remember = useRemember();
  return useMutation({
    mutationFn: (input: { document: BoqDocument; version: number; status: BoqStatus }) => boqApi.save(id, input),
    onSuccess: remember,
  });
}

export function useDeleteBoq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boqApi.remove(id),
    onSuccess: (_result: void, id: string) => {
      queryClient.removeQueries({ queryKey: boqKeys.one(id) });
      void queryClient.invalidateQueries({ queryKey: boqKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

/** Moves a BOQ to a project (or to none). Its items reach the project's materials on the next "Sync from BOQ". */
export function useSetBoqProject(id: string) {
  const remember = useRemember();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string | null) => boqApi.setProject(id, projectId),
    onSuccess: (boq) => {
      remember(boq);
      void queryClient.invalidateQueries({ queryKey: ["inventory"] }); // the material plans show a sync is due
    },
  });
}