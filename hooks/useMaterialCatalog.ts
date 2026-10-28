"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "@/lib/inventory/api";
import type { MaterialInput, VendorInput } from "@/lib/inventory/types";

/** The company's materials and vendors (one list for every project). It rarely changes: cached for five minutes. */
export const useMaterialCatalog = (_projectId?: string) =>
  useQuery({ queryKey: ["materials", "catalog"], queryFn: () => inventoryApi.catalog(), staleTime: 5 * 60_000 });

export function useAddMaterial() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: inventoryApi.addMaterial, onSuccess: () => qc.invalidateQueries({ queryKey: ["materials", "catalog"] }) });
}

export function useAddVendor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: inventoryApi.addVendor, onSuccess: () => qc.invalidateQueries({ queryKey: ["materials", "catalog"] }) });
}

/** Add or edit a material (edit when an id is given). Every project's figures may change: refresh them all. */
export function useSaveMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: MaterialInput }) => (id ? inventoryApi.updateMaterial(id, input) : inventoryApi.addMaterial(input)),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ["materials", "catalog"] }), qc.invalidateQueries({ queryKey: ["inventory"] })]),
  });
}

export function useSaveVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: VendorInput }) => (id ? inventoryApi.updateVendor(id, input) : inventoryApi.addVendor(input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials", "catalog"] }),
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => inventoryApi.deleteVendor(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["materials", "catalog"] }) });
}
