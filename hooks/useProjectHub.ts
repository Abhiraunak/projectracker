"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hubApi } from "@/lib/projects/hub";
import { projectsApi } from "@/lib/api";
import { keys as projectKeys } from "@/hooks/useLabourProjects";

/*
 * Under "projects", so anything that already refreshes the project lists (saving progress, a payment, a status
 * change) refreshes the hub's figures too, with no extra wiring.
 */
export const hubKey = (projectId: string) => ["projects", "hub", projectId] as const;
const HUB_FRESH_MS = 60_000;

export const useProjectHub = (projectId: string) =>
  useQuery({ queryKey: hubKey(projectId), queryFn: () => hubApi.get(projectId), staleTime: HUB_FRESH_MS });

/**
 * Start loading a project before it is opened: called when a finger or the mouse reaches its tile.
 * By the time the tap lands, the hub's data is usually already here, so it opens with no spinner.
 */
export function usePrefetchProject() {
  const qc = useQueryClient();
  return useCallback(
    (projectId: string) => {
      void qc.prefetchQuery({ queryKey: hubKey(projectId), queryFn: () => hubApi.get(projectId), staleTime: HUB_FRESH_MS });
    },
    [qc]
  );
}

/** Warm the full project (work items) that the Progress and Payments sections need */
export function usePrefetchProjectDetail() {
  const qc = useQueryClient();
  return useCallback(
    (projectId: string) => {
      void qc.prefetchQuery({ queryKey: projectKeys.one(projectId), queryFn: () => projectsApi.get(projectId), staleTime: 30_000 });
    },
    [qc]
  );
}

export function useSetProjectDetails(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; firmName: string | null }) => hubApi.setDetails(projectId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }), // the tiles and this hub
  });
}
