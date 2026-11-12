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

/** One entry for each chosen day, saved together; with a batchId, days saved together earlier are edited in one go */
export function useSaveAttendanceDays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, data }: { batchId?: string; data: AttendanceManyPayload }) =>
      batchId ? attendanceApi.updateMany(batchId, data) : attendanceApi.createMany(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

/** Saved records, one row per contractor */
export const useRegisters = (projectId: string, q: string) =>
  useQuery({ queryKey: ["attendance", "registers", projectId, q], queryFn: () => attendanceApi.registers(projectId, q || undefined), placeholderData: keepPreviousData, staleTime: 15_000 });

/** Save a contractor's open sheet: its open days are replaced by the days as edited */
export function useSaveSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AttendanceManyPayload & { replaceIds: string[] }) => attendanceApi.saveSheet(data),
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

/** Every day saved together, deleted in one go */
export function useDeleteAttendanceBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => attendanceApi.removeBatch(batchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

/** Per-trade cards, the trades to offer, and each contractor's usual trade. Under "attendance": every save refreshes it. */
export const useAttendanceTrades = (projectId: string) =>
  useQuery({ queryKey: ["attendance", "trades", projectId], queryFn: () => attendanceApi.trades(projectId), staleTime: 30_000 });

/** Put all of a contractor's entries (the ones with no trade yet) under a trade */
export function useSetContractorTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { projectId: string; contractorName: string; trade: string; all?: boolean }) => attendanceApi.setTrade(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

/** A contractor's labourers and day rates (hourly attendance). Under "attendance": saving hourly attendance updates it. */
export const useTeam = (projectId: string, contractor: string) =>
  useQuery({
    queryKey: ["attendance", "team", projectId, contractor.trim().toLowerCase()],
    queryFn: () => attendanceApi.team(projectId, contractor.trim()),
    enabled: contractor.trim().length > 0,
    staleTime: 60_000,
  });

export function useSaveTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof attendanceApi.saveTeam>[0]) => attendanceApi.saveTeam(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

/** One contractor's month sheet and account; keeps the last month on screen while the next loads */
export const useMonthSheet = (projectId: string, month: string, contractor?: string) =>
  useQuery({
    queryKey: ["attendance", "month", projectId, month, contractor?.trim().toLowerCase() ?? ""],
    queryFn: () => attendanceApi.month(projectId, month, contractor?.trim() || undefined),
    placeholderData: keepPreviousData,
  });