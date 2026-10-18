"use client";

import React, { useId, useState } from "react";
import { describeError } from "@/lib/api";
import { formatQty } from "@/lib/materials/format";
import { totalRequired } from "@/lib/materials/procurement";
import type { WorkItemRef } from "@/lib/materials/types";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { useCreateRequirement } from "@/hooks/useRequirements";
import { useMaterialCatalog } from "@/hooks/useMaterialCatalog";
import { Field } from "@/components/materials/Field";
import { buttonPrimary, buttonSecondary, inputBase } from "../drawing/styles";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  workItems: WorkItemRef[];
}

export function RequirementDialog({ open, onClose, projectId, workItems }: Props) {
  return (
    <ModalDialog open={open} onClose={onClose} label="Add material requirement" size="md">
      <RequirementForm onClose={onClose} projectId={projectId} workItems={workItems} />
    </ModalDialog>
  );
}

/** Returns what is wrong with the form, or null */
function checkRequirement(taskId: string, materialId: string, quantity: number, wastage: number): string | null {
  if (!taskId) return "Choose the work item.";
  if (!materialId) return "Choose the material.";
  if (!(quantity > 0)) return "Enter the quantity required, greater than zero.";
  if (!(wastage >= 0 && wastage <= 50)) return "Wastage must be between 0 and 50%.";
  return null;
}

function RequirementForm({ onClose, projectId, workItems }: Omit<Props, "open">) {
  const id = useId();
  const catalog = useMaterialCatalog();
  const create = useCreateRequirement(projectId);

  const [taskId, setTaskId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [wastage, setWastage] = useState("5");
  const [problem, setProblem] = useState<string | null>(null);

  const material = catalog.data?.materials.find((m) => m.id === materialId);
  const qty = Number(quantity);
  const preview = qty > 0 && material ? formatQty(totalRequired({ requiredQty: qty, wastagePercent: Number(wastage) || 0 }), material.unit) : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = checkRequirement(taskId, materialId, qty, Number(wastage));
    setProblem(found);
    if (found) return;

    try {
      await create.mutateAsync({
        taskId,
        taskName: workItems.find((w) => w.id === taskId)?.name,
        materialId,
        requiredQty: qty,
        wastagePercent: Number(wastage),
      });
      onClose();
    } catch (error) {
      setProblem(describeError(error));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader title="Add requirement" subtitle="Material needed for a work item" onClose={onClose} locked={create.isPending} />
      <div className="space-y-4 p-4 sm:p-5">
        <Field id={`${id}-task`} label="Work item">
          <select id={`${id}-task`} value={taskId} onChange={(e) => setTaskId(e.target.value)} className={inputBase}>
            <option value="">Choose work item</option>
            {workItems.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </Field>

        <Field id={`${id}-material`} label="Material">
          <select id={`${id}-material`} value={materialId} onChange={(e) => setMaterialId(e.target.value)} disabled={catalog.isPending} className={inputBase}>
            <option value="">{catalog.isPending ? "Loading materials…" : "Choose material"}</option>
            {catalog.data?.materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id={`${id}-qty`} label={`Quantity${material ? ` (${material.unit})` : ""}`}>
            <input id={`${id}-qty`} type="number" inputMode="decimal" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputBase} tabular-nums`} />
          </Field>
          <Field id={`${id}-wastage`} label="Wastage allowance %">
            <input id={`${id}-wastage`} type="number" inputMode="decimal" min={0} max={50} step="any" value={wastage} onChange={(e) => setWastage(e.target.value)} className={`${inputBase} tabular-nums`} />
          </Field>
        </div>

        {preview && <p className="rounded bg-stone-100 p-3 text-sm text-stone-700">Total to buy with wastage: <strong>{preview}</strong></p>}
        {problem && <p role="alert" className="text-sm text-red-700">{problem}</p>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={create.isPending} className={buttonSecondary}>Cancel</button>
          <button type="submit" disabled={create.isPending} className={buttonPrimary}>{create.isPending ? "Saving…" : "Add requirement"}</button>
        </div>
      </div>
    </form>
  );
}
