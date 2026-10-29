"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/dashboard/api";
import type { Period } from "@/lib/dashboard/types";

/** The admin dashboard's figures. Switching period keeps the old figures on screen until the new ones arrive. */
export const useAdminOverview = (period: Period, enabled = true) =>
  useQuery({
    queryKey: ["dashboard", "admin", period],
    queryFn: () => dashboardApi.adminOverview(period),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // approvals and alerts come in all day
    enabled,
  });