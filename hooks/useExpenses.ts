"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { expensesApi, type NewExpense } from "@/lib/projects/expenses";
import { labourSummaryKey } from "./useLabour";

export const expensesKey = (projectId: string) => ["expenses", projectId] as const;

/** The list, and the labour page's donut (its grey slice is the General expenditure) */
const refresh = (qc: ReturnType<typeof useQueryClient>, projectId: string) =>
  Promise.all([qc.invalidateQueries({ queryKey: expensesKey(projectId) }), qc.invalidateQueries({ queryKey: labourSummaryKey(projectId) })]);

export const useExpenses = (projectId: string) => useQuery({ queryKey: expensesKey(projectId), queryFn: () => expensesApi.list(projectId), staleTime: 30_000 });

export function useAddExpense(projectId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (e: NewExpense) => expensesApi.add(projectId, e), onSuccess: () => refresh(qc, projectId) });
}

export function useRemoveExpense(projectId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (expenseId: string) => expensesApi.remove(projectId, expenseId), onSuccess: () => refresh(qc, projectId) });
}