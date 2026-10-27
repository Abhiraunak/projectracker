"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceApi, type AttendanceListParams, type AttendanceManyPayload, type AttendancePayload } from "@/lib/attendanceApi";

/** keepPreviousData: the old page stays on screen while the next one loads (no flicker when paging) */
export const useAttendanceList = (params: AttendanceListParams) =>
  useQuery({
    queryKey: ["attendance", params],
    queryFn: () => attendanceApi.list(params),
    placeholderData: keepPreviousData,
  });

export function useSaveAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: AttendancePayload }) =>
      id ? attendanceApi.update(id, data) : attendanceApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }), // refreshes the manager and the recent list
  });
}

/** One entry for each chosen day, saved together */
export function useSaveAttendanceDays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AttendanceManyPayload) => attendanceApi.createMany(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useDeleteAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => attendanceApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}
