"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { equipmentApi, type EquipmentChanges, type NewEquipment, type NewHireChange, type NewMove } from "@/lib/equipment/api";

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
    void qc.invalidateQueries({ queryKey: ["attendance", "spend"] }); // every site's spending (hire moves with the item)
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
/** Attach (a file) or take off (null) an item's bill */
export function useEquipmentBill() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File | null }): Promise<void> => {
      if (file) await equipmentApi.setBill(id, file);
      else await equipmentApi.removeBill(id);
    },
    onSuccess: refresh,
  });
}
/** Archive an item (hidden, counted nowhere) or restore it */
export function useArchiveEquipment() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, archive }: { id: string; archive: boolean }) => equipmentApi.archive(id, archive), onSuccess: refresh });
}
/** Delete an archived item for good, with its moves and hire changes */
export function useDeleteEquipment() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => equipmentApi.remove(id), onSuccess: refresh });
}
export function useMoveEquipment() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, body }: { id: string; body: NewMove }) => equipmentApi.move(id, body), onSuccess: refresh });
}
export function useUndoMove() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, moveId }: { id: string; moveId: string }) => equipmentApi.undo(id, moveId), onSuccess: refresh });
}


/** A hired item's cost changed: log a new rate or a one-off amount, or remove one; hire figures everywhere refresh */
export function useAddHireChange() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, body }: { id: string; body: NewHireChange }) => equipmentApi.addHireChange(id, body), onSuccess: refresh });
}
export function useRemoveHireChange() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, changeId }: { id: string; changeId: string }) => equipmentApi.removeHireChange(id, changeId), onSuccess: refresh });
}