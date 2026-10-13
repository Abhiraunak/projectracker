"use client";

import { useQuery } from "@tanstack/react-query";
import { drawingsApi } from "@/lib/drawingsApi";

/** People you can share with, filtered by what the user typed */
export const useAppUsers = (query: string) =>
  useQuery({
    queryKey: ["app-users", query],
    queryFn: () => drawingsApi.searchUsers(query),
    staleTime: 60_000,
  });
