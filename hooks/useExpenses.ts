"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { expensesApi, type NewExpense } from "@/lib/projects/expenses";

export const expensesKey = (projectId: string) => ["expenses", projectId] as const;

export const useExpenses = (projectId: string) => useQuery({ queryKey: expensesKey(projectId), queryFn: () => expensesApi.list(projectId), staleTime: 30_000 });

export function useAddExpense(projectId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (e: NewExpense) => expensesApi.add(projectId, e), onSuccess: () => qc.invalidateQueries({ queryKey: expensesKey(projectId) }) });
}

export function useRemoveExpense(projectId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (expenseId: string) => expensesApi.remove(projectId, expenseId), onSuccess: () => qc.invalidateQueries({ queryKey: expensesKey(projectId) }) });
}
