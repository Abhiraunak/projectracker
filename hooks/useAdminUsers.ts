"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accessApi, type AccessInput } from "@/lib/accessApi";

export const useAdminUsers = () => useQuery({ queryKey: ["admin", "users"], queryFn: () => accessApi.listUsers() });

export const accessLogKey = ["admin", "access-log"] as const;
export const useAccessLog = () => useQuery({ queryKey: accessLogKey, queryFn: () => accessApi.accessLog(15) });

export function useUpdateUserAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...input }: AccessInput & { userId: string }) => accessApi.updateUserAccess(userId, input),
    // Reload the list and the change log, and your own access too (in case you just changed yourself)
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
        queryClient.invalidateQueries({ queryKey: accessLogKey }),
        queryClient.invalidateQueries({ queryKey: ["access", "me"] }),
      ]),
  });
}