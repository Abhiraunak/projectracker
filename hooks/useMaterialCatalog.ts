"use client";

import { useQuery } from "@tanstack/react-query";
import { procurementApi } from "@/lib/materials/procurementApi";

/** The materials and vendors people can pick from. It rarely changes, so it is cached for five minutes. */
export const useMaterialCatalog = () =>
  useQuery({ queryKey: ["materials", "catalog"], queryFn: () => procurementApi.catalog(), staleTime: 5 * 60_000 });
