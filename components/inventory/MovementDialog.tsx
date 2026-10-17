"use client";

import React, { useId, useState } from "react";
import { describeError } from "@/lib/api";
import { formatQty } from "@/lib/materials/format";
import { pendingQty } from "@/lib/materials/procurement";
import { MOVEMENT_RULES, emptyInventoryItem, requiresNote, validateMovement } from "@/lib/materials/stock";
import type { InventoryItem, MovementInput, MovementType, Requirement, WorkItemRef } from "@/lib/materials/types";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { useMaterialCatalog } from "@/hooks/useMaterialCatalog";
import { useRecordMovement } from "@/hooks/useInventory";
import { Field } from "@/components/materials/Field";
import { buttonPrimary, buttonSecondary, inputBase } from "../drawing/styles";


export interface MovementTarget {
  materialId: string | null; // pre-selected material, if opened from a row
}

interface Props {
  target: MovementTarget | null;
  onClose: () => void;
  projectId: string;
  workItems: WorkItemRef[];
  inventory: InventoryItem[];
  requirements: Requirement[];
}

/** Record stock arriving, being used, reserved, released or corrected */
export function MovementDialog({ target, onClose, ...rest }: Props) {
  return (
    <ModalDialog open={!!target} onClose={onClose} label="Record stock movement" size="md">
      {target && <MovementForm initialMaterialId={target.materialId ?? ""} onClose={onClose} {...rest} />}
    </ModalDialog>
  );
}

function MovementForm({ initialMaterialId, onClose, projectId, workItems, inventory, requirements }: Omit<Props, "target"> & { initialMaterialId: string }) {
  const id = useId();
  const catalog = useMaterialCatalog();
  const record = useRecordMovement(projectId);

  const [type, setType] = useState<MovementType>("RECEIVED");
  const [materialId, setMaterialId] = useState(initialMaterialId);
  const [quantity, setQuantity] = useState("");
  const [taskId, setTaskId] = useState("");
  const [requirementId, setRequirementId] = useState("");
  const [note, setNote] = useState("");
  const [serverProblem, setServerProblem] = useState<string | null>(null);

  const rule = MOVEMENT_RULES[type];
  const material = catalog.data?.materials.find((m) => m.id === materialId);
  const item = material ? (inventory.find((i) => i.material.id === materialId) ?? emptyInventoryItem(material)) : null;
  const openOrders = requirements.filter((r) => r.material.id === materialId && pendingQty(r) > 0);

  const input: MovementInput = {
    materialId,
    type,
    quantity: Number(quantity),
    taskId: rule.needsTask ? taskId || null : null,
    taskName: workItems.find((w) => w.id === taskId)?.name,
    requirementId: type === "RECEIVED" ? requirementId || null : null,
    note,
  };

  // Live check against the current stock, so the user sees the problem before pressing Save
  const problem = item && quantity !== "" ? validateMovement(item, input) : null;
  const canSave = !!item && quantity !== "" && !problem && !record.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    try {
      await record.mutateAsync(input);
      onClose();
    } catch (error) {
      setServerProblem(describeError(error));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader title="Record stock movement" subtitle={rule.help} onClose={onClose} locked={record.isPending} />
      <div className="space-y-4 p-4 sm:p-5">
        <Field id={`${id}-type`} label="What happened?">
          <select id={`${id}-type`} value={type} onChange={(e) => { setType(e.target.value as MovementType); setServerProblem(null); }} className={inputBase}>
            {(Object.keys(MOVEMENT_RULES) as MovementType[]).map((value) => (
              <option key={value} value={value}>{MOVEMENT_RULES[value].label}</option>
            ))}
          </select>
        </Field>

        <Field
          id={`${id}-material`}
          label="Material"
          hint={item ? `In store: ${formatQty(item.onHand, item.material.unit)}. Available: ${formatQty(item.available, item.material.unit)}.` : undefined}
        >
          <select id={`${id}-material`} value={materialId} onChange={(e) => { setMaterialId(e.target.value); setRequirementId(""); }} disabled={catalog.isPending} className={inputBase}>
            <option value="">{catalog.isPending ? "Loading materials…" : "Choose material"}</option>
            {catalog.data?.materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
            ))}
          </select>
        </Field>

        <Field id={`${id}-qty`} label={`Quantity${material ? ` (${material.unit})` : ""}`} error={problem}>
          <input id={`${id}-qty`} type="number" inputMode="decimal" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputBase} tabular-nums`} />
        </Field>

        {rule.needsTask && (
          <Field id={`${id}-task`} label="Work item">
            <select id={`${id}-task`} value={taskId} onChange={(e) => setTaskId(e.target.value)} className={inputBase}>
              <option value="">Choose work item</option>
              {workItems.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </Field>
        )}

        {type === "RECEIVED" && openOrders.length > 0 && (
          <Field id={`${id}-order`} label="Against which order? (optional)" hint="Choosing one updates its received quantity.">
            <select id={`${id}-order`} value={requirementId} onChange={(e) => setRequirementId(e.target.value)} className={inputBase}>
              <option value="">Not linked to an order</option>
              {openOrders.map((r) => (
                <option key={r.id} value={r.id}>{r.task.name}: {formatQty(pendingQty(r), r.material.unit)} pending</option>
              ))}
            </select>
          </Field>
        )}

        <Field id={`${id}-note`} label={requiresNote(type) ? "Note (required)" : "Note (optional)"} hint={type === "RECEIVED" ? "For example the challan number." : undefined}>
          <input id={`${id}-note`} type="text" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} className={inputBase} />
        </Field>

        {serverProblem && <p role="alert" className="text-sm text-red-700">{serverProblem}</p>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={record.isPending} className={buttonSecondary}>Cancel</button>
          <button type="submit" disabled={!canSave} className={buttonPrimary}>{record.isPending ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </form>
  );
}
