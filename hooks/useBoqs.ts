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
  };
}

export function useCreateBoq() {
  const remember = useRemember();
  return useMutation({ mutationFn: (document: BoqDocument) => boqApi.create(document), onSuccess: remember });
}

export function useDuplicateBoq() {
  const remember = useRemember();
  return useMutation({ mutationFn: (id: string) => boqApi.duplicate(id), onSuccess: remember });
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
    },
  });
}
