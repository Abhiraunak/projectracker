"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { drawingsApi } from "@/lib/drawingsApi";
import type { DrawingListParams, ProgressCallback, UploadInput } from "@/lib/drawings/types";

const ALL_DRAWINGS = ["drawings"] as const;

/** One page of drawings. The previous page stays visible while the next one loads. */
export const useDrawingList = (params: DrawingListParams) =>
  useQuery({
    queryKey: [...ALL_DRAWINGS, params],
    queryFn: () => drawingsApi.list(params),
    placeholderData: keepPreviousData,
  });

/** Any change to drawings means every cached list could be out of date */
function useRefreshDrawings() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ALL_DRAWINGS });
}

export function useUploadDrawing() {
  const refresh = useRefreshDrawings();
  return useMutation({
    mutationFn: ({ input, onProgress }: { input: UploadInput; onProgress: ProgressCallback }) =>
      drawingsApi.upload(input, onProgress),
    onSuccess: refresh,
  });
}

export function useShareDrawing() {
  const refresh = useRefreshDrawings();
  return useMutation({
    mutationFn: ({ id, userIds }: { id: string; userIds: string[] }) => drawingsApi.share(id, userIds),
    onSuccess: refresh,
  });
}

export function useDeleteDrawing() {
  const refresh = useRefreshDrawings();
  return useMutation({
    mutationFn: (id: string) => drawingsApi.remove(id),
    onSuccess: refresh,
  });
}
