"use client";

import React, { useMemo, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { Heading } from "@/components/utilites/Label";
import { sortByUrgency } from "@/lib/materials/stock";
import type { WorkItemRef } from "@/lib/materials/types";
import { useInventory } from "@/hooks/useInventory";
import { useRequirements } from "@/hooks/useRequirements";
import { useDialogState } from "@/hooks/useDialogState";
import { QueryError } from "@/components/materials/QueryError";
import { InventoryList } from "./InventoryList";
import { InventorySummary } from "./InventorySummary";
import { MovementDialog, type MovementTarget } from "./MovementDialog";
import { MovementHistory } from "./MovementHistory";
import { ShortageAlert } from "./ShortageAlert";
import { buttonPrimary } from "../drawing/styles";

interface Props {
  projectId: string;
  workItems: WorkItemRef[];
}

/** Stock on hand, reserved, consumed and short, plus the log of every movement */
export function InventoryTracking({ projectId, workItems }: Props) {
  const inventory = useInventory(projectId);
  const requirements = useRequirements(projectId); // the dialog links received stock to open orders
  const recording = useDialogState<MovementTarget>();
  const [historyMaterialId, setHistoryMaterialId] = useState("");

  const items = useMemo(() => sortByUrgency(inventory.data ?? []), [inventory.data]);
  const materials = useMemo(() => items.map((item) => item.material), [items]);

  const showHistoryFor = (materialId: string) => {
    setHistoryMaterialId(materialId);
    document.getElementById("stock-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Heading>Inventory</Heading>
          <p className="mt-1 text-sm text-stone-500">What is in the store, what is set aside, what has been used, and what is running short.</p>
        </div>
        <button type="button" onClick={() => recording.open({ materialId: null })} className={buttonPrimary}>
          <FiPlus aria-hidden /> Record stock
        </button>
      </header>

      {inventory.isPending && <div aria-busy="true" className="h-64 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />}
      {inventory.isError && <QueryError error={inventory.error} onRetry={() => inventory.refetch()} />}

      {inventory.data && (
        <>
          <ShortageAlert items={items} />
          <InventorySummary items={items} />

          {items.length === 0 ? (
            <div className="rounded border border-dashed border-stone-300 px-6 py-12 text-center">
              <p className="font-semibold">No stock recorded yet</p>
              <p className="mt-1 text-sm text-stone-500">Record the first delivery, or add material requirements, to start tracking.</p>
            </div>
          ) : (
            <InventoryList items={items} onRecord={(materialId) => recording.open({ materialId })} onHistory={showHistoryFor} />
          )}

          <MovementHistory projectId={projectId} materials={materials} materialId={historyMaterialId} onMaterialChange={setHistoryMaterialId} />
        </>
      )}

      <MovementDialog
        target={recording.value}
        onClose={recording.close}
        projectId={projectId}
        workItems={workItems}
        inventory={inventory.data ?? []}
        requirements={requirements.data ?? []}
      />
    </div>
  );
}
