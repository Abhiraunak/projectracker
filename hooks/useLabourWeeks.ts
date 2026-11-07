"use client";

import { useQuery, useQueryClient, useMutation, keepPreviousData } from "@tanstack/react-query";
import { labourWeeksApi, type MeasureInput, type SettleInput } from "@/lib/projects/labourWeeks";

/*
 * Every key starts with "attendance": saving attendance or a payment already refreshes everything under it, so the
 * week, the month and the contract work follow straight away.
 */
const keys = {
    week: (projectId: string, start: string) => ["attendance", "labour-week", projectId, start] as const,
    measures: (projectId: string) => ["attendance", "labour-measures", projectId] as const,
    month: (projectId: string, month: string) => ["attendance", "labour-month", projectId, month] as const,
    search: (projectId: string, q: string) => ["attendance", "labour-search", projectId, q] as const,
};

export const useLabourWeek = (projectId: string, start: string) =>
    useQuery({ queryKey: keys.week(projectId, start), queryFn: () => labourWeeksApi.week(projectId, start), staleTime: 20_000, placeholderData: keepPreviousData });

export const useMeasures = (projectId: string) =>
    useQuery({ queryKey: keys.measures(projectId), queryFn: () => labourWeeksApi.measures(projectId), staleTime: 30_000 });

export const useLabourMonth = (projectId: string, month: string) =>
    useQuery({ queryKey: keys.month(projectId, month), queryFn: () => labourWeeksApi.month(projectId, month), staleTime: 30_000, placeholderData: keepPreviousData });

export const useLabourSearch = (projectId: string, q: string) =>
    useQuery({ queryKey: keys.search(projectId, q), queryFn: () => labourWeeksApi.search(projectId, q), enabled: q.trim().length >= 2, staleTime: 15_000 });

/** Labour money changed: the week, month, contract work, payments and the donut all read it */
function useRefreshLabour() {
    const qc = useQueryClient();
    return () => qc.invalidateQueries({ queryKey: ["attendance"] });
}

export function useSettleWeek(projectId: string) {
    const refresh = useRefreshLabour();
    return useMutation({
        mutationFn: ({ reopen, ...s }: SettleInput & { reopen?: boolean }) => (reopen ? labourWeeksApi.reopen(projectId, s) : labourWeeksApi.settle(projectId, s)),
        onSettled: refresh,
    });
}

export function useSaveMeasure(projectId: string) {
    const refresh = useRefreshLabour();
    return useMutation({
        mutationFn: ({ id, data }: { id?: string; data: MeasureInput }) => (id ? labourWeeksApi.updateMeasure(projectId, id, data) : labourWeeksApi.addMeasure(projectId, data)),
        onSuccess: refresh,
    });
}

export function useRemoveMeasure(projectId: string) {
    const refresh = useRefreshLabour();
    return useMutation({ mutationFn: (measureId: string) => labourWeeksApi.removeMeasure(projectId, measureId), onSuccess: refresh });
}