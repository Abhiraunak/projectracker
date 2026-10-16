"use client";

import { useCallback, useState } from "react";
import { DEFAULT_FILTERS, type RequirementFilters } from "@/lib/materials/procurement";

/** The choices made in the requirements toolbar */
export function useRequirementFilters() {
  const [filters, setFilters] = useState<RequirementFilters>(DEFAULT_FILTERS);
  const change = useCallback((patch: Partial<RequirementFilters>) => setFilters((prev) => ({ ...prev, ...patch })), []);
  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  return { filters, change, reset, isFiltered };
}
