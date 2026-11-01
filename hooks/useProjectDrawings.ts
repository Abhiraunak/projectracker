"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectDrawingsApi, type ProjectDrawingInput } from "@/lib/drawings/projectApi";
import type { ProgressCallback } from "@/lib/drawings/types";

/*
 * All under "drawings", so the Drawing page's refreshes and these refresh each other:
 * an upload here shows on the Drawing page, and a delete there disappears here.
 */
export const projectDrawingsKey = (projectId: string) => ["drawings", "project", projectId] as const;
const FRESH_MS = 30_000;

export const useProjectDrawings = (projectId: string) =>
  useQuery({ queryKey: projectDrawingsKey(projectId), queryFn: () => projectDrawingsApi.list(projectId), staleTime: FRESH_MS });

/** A numbered drawing's revisions, newest first. Only fetched when the drawing has more than one. */
export const useDrawingRevisions = (drawingId: string, enabled: boolean) =>
  useQuery({ queryKey: ["drawings", "revisions", drawingId], queryFn: () => projectDrawingsApi.revisions(drawingId), enabled, staleTime: FRESH_MS });

export const useUnassignedDrawings = () =>
  useQuery({ queryKey: ["drawings", "unassigned"], queryFn: () => projectDrawingsApi.unassigned(), staleTime: 0 });

export function useUploadProjectDrawing(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, onProgress }: { input: ProjectDrawingInput; onProgress: ProgressCallback }) => projectDrawingsApi.upload(projectId, input, onProgress),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["drawings"] });
      void qc.invalidateQueries({ queryKey: ["projects", "hub", projectId] }); // the overview's count
    },
  });
}

export function usePlaceDrawing(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ drawingId, number }: { drawingId: string; number: string }) => projectDrawingsApi.place(drawingId, projectId, number),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["drawings"] });
      void qc.invalidateQueries({ queryKey: ["projects", "hub", projectId] });
    },
  });
}
