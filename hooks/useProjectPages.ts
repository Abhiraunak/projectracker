"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pagesApi } from "@/lib/projects/pages";
import { projectsApi } from "@/lib/api";
import { isFeatureOn } from "@/lib/features";
import { keys as projectKeys } from "@/hooks/useLabourProjects";
import type { SectionKey } from "@/lib/projects/place";
import { projectDrawingsApi } from "@/lib/drawings/projectApi";
import { projectDrawingsKey } from "@/hooks/useProjectDrawings";
import { equipmentKeys } from "@/hooks/useEquipment";
import { equipmentApi } from "@/lib/equipment/api";

/*
 * Keys chosen so existing refreshes reach these pages with no extra wiring:
 *  - progress sits under "projects": saving progress or a payment refreshes it
 *  - the material book sits under "inventory/<project>": any stock entry, order or request refreshes it
 */
export const progressKey = (projectId: string) => ["projects", "progress", projectId] as const;
export const materialBookKey = (projectId: string) => ["inventory", projectId, "book"] as const;
const FRESH_MS = 30_000;

export const useProjectProgress = (projectId: string) =>
  useQuery({ queryKey: progressKey(projectId), queryFn: () => pagesApi.progress(projectId), staleTime: FRESH_MS });

export const useMaterialBook = (projectId: string) =>
  useQuery({ queryKey: materialBookKey(projectId), queryFn: () => pagesApi.materials(projectId), staleTime: FRESH_MS });

/**
 * Start loading what a section shows before it is opened (called when a finger or the mouse reaches its tab or tile).
 * Each section is one request at most, so this is cheap.
 */
export function usePrefetchSection() {
  const qc = useQueryClient();
  return useCallback(
    (section: SectionKey, projectId: string) => {
      const detail = () => qc.prefetchQuery({ queryKey: projectKeys.one(projectId), queryFn: () => projectsApi.get(projectId), staleTime: FRESH_MS });
      if (section === "progress") {
        if (isFeatureOn("progress")) void qc.prefetchQuery({ queryKey: progressKey(projectId), queryFn: () => pagesApi.progress(projectId), staleTime: FRESH_MS });
        else void detail();
      } else if (section === "payments") void detail();
      else if (section === "drawings" && isFeatureOn("drawingsByProject"))
        void qc.prefetchQuery({ queryKey: projectDrawingsKey(projectId), queryFn: () => projectDrawingsApi.list(projectId), staleTime: FRESH_MS });
      else if (section === "materials" && isFeatureOn("materialSheet"))
        void qc.prefetchQuery({ queryKey: materialBookKey(projectId), queryFn: () => pagesApi.materials(projectId), staleTime: FRESH_MS });
      else if (section === "equipment" && isFeatureOn("equipment"))
        void qc.prefetchQuery({ queryKey: equipmentKeys.site(projectId), queryFn: () => equipmentApi.atSite(projectId), staleTime: FRESH_MS });
    },
    [qc]
  );
}
