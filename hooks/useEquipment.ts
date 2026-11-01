"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { equipmentApi, type EquipmentChanges, type NewEquipment, type NewMove } from "@/lib/equipment/api";

/*
 * Every equipment page sits under "equipment", so one refresh after any change reaches the register, each site and
 * each item at once. A move changes two places, so refreshing all of them is simpler than working out which.
 */
export const equipmentKeys = {
  all: ["equipment"] as const,
  register: () => ["equipment", "register"] as const,
  item: (id: string) => ["equipment", "item", id] as const,
  site: (projectId: string) => ["equipment", "site", projectId] as const,
};
const FRESH_MS = 30_000;

export const useEquipmentRegister = (enabled = true) =>
  useQuery({ queryKey: equipmentKeys.register(), queryFn: equipmentApi.register, staleTime: FRESH_MS, enabled });
export const useEquipmentItem = (id: string | null) =>
  useQuery({ queryKey: equipmentKeys.item(id ?? ""), queryFn: () => equipmentApi.get(id!), staleTime: FRESH_MS, enabled: !!id });
export const useSiteEquipment = (projectId: string) =>
  useQuery({ queryKey: equipmentKeys.site(projectId), queryFn: () => equipmentApi.atSite(projectId), staleTime: FRESH_MS });

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: equipmentKeys.all });
    void qc.invalidateQueries({ queryKey: ["projects", "hub"] }); // the hub tiles' "n items here" line
  };
}

export function useAddEquipment() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (body: NewEquipment) => equipmentApi.create(body), onSuccess: refresh });
}
export function useUpdateEquipment() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, body }: { id: string; body: EquipmentChanges }) => equipmentApi.update(id, body), onSuccess: refresh });
}
export function useMoveEquipment() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, body }: { id: string; body: NewMove }) => equipmentApi.move(id, body), onSuccess: refresh });
}
export function useUndoMove() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, moveId }: { id: string; moveId: string }) => equipmentApi.undo(id, moveId), onSuccess: refresh });
}

