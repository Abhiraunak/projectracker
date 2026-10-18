"use client";

import React, { useId, useState } from "react";
import { describeError } from "@/lib/api";
import { formatQty } from "@/lib/materials/format";
import { toOrderQty, totalRequired } from "@/lib/materials/procurement";
import type { Requirement } from "@/lib/materials/types";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { useUpdateOrder } from "@/hooks/useRequirements";
import { useMaterialCatalog } from "@/hooks/useMaterialCatalog";
import { Field } from "@/components/materials/Field";
import { buttonPrimary, buttonSecondary, inputBase } from "../drawing/styles";

interface Props {
  requirement: Requirement | null;
  onClose: () => void;
}

/** Set the vendor, the quantity ordered and the expected delivery date for one requirement */
export function OrderDialog({ requirement, onClose }: Props) {
  return (
    <ModalDialog open={!!requirement} onClose={onClose} label="Update order" size="md">
      {requirement && <OrderForm key={requirement.id} requirement={requirement} onClose={onClose} />}
    </ModalDialog>
  );
}

interface Values {
  vendorId: string;
  ordered: string;
  expected: string;
}

/** Returns what is wrong with the order, or null */
function checkOrder(values: Values, requirement: Requirement): string | null {
  const ordered = Number(values.ordered || 0);
  if (!(ordered >= 0)) return "The ordered quantity can't be negative.";
  if (ordered < requirement.receivedQty) return `${formatQty(requirement.receivedQty, requirement.material.unit)} is already received, so the order can't be smaller.`;
  if (ordered > 0 && !values.vendorId) return "Choose the vendor this was ordered from.";
  if (ordered > 0 && !values.expected) return "Set the expected delivery date.";
  return null;
}

function OrderForm({ requirement, onClose }: { requirement: Requirement; onClose: () => void }) {
  const id = useId();
  const catalog = useMaterialCatalog();
  const update = useUpdateOrder();
  const unit = requirement.material.unit;

  const [values, setValues] = useState<Values>({
    vendorId: requirement.vendor?.id ?? "",
    ordered: requirement.orderedQty ? String(requirement.orderedQty) : "",
    expected: requirement.expectedDelivery ?? "",
  });
  const [requested, setRequested] = useState(requirement.requested);
  const [problem, setProblem] = useState<string | null>(null);

  const set = (patch: Partial<Values>) => setValues((prev) => ({ ...prev, ...patch }));
  const hasOrder = Number(values.ordered) > 0;
  const vendor = catalog.data?.vendors.find((v) => v.id === values.vendorId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = checkOrder(values, requirement);
    setProblem(found);
    if (found) return;

    try {
      await update.mutateAsync({
        id: requirement.id,
        update: {
          vendorId: values.vendorId || null,
          orderedQty: Number(values.ordered || 0),
          expectedDelivery: values.expected || null,
          requested: hasOrder ? false : requested, // once ordered, the request is done
        },
      });
      onClose();
    } catch (error) {
      setProblem(describeError(error));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader title="Update order" subtitle={`${requirement.material.name}, ${requirement.task.name}`} onClose={onClose} locked={update.isPending} />
      <div className="space-y-4 p-4 sm:p-5">
        <dl className="grid grid-cols-2 gap-3 rounded bg-stone-100 p-3 text-sm">
          <div>
            <dt className="text-xs text-stone-500">Required (with wastage)</dt>
            <dd className="font-medium tabular-nums">{formatQty(totalRequired(requirement), unit)}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Received so far</dt>
            <dd className="font-medium tabular-nums">{formatQty(requirement.receivedQty, unit)}</dd>
          </div>
        </dl>

        <Field id={`${id}-vendor`} label="Vendor" hint={vendor ? `${vendor.contactPerson}, ${vendor.phone}` : undefined}>
          <select id={`${id}-vendor`} value={values.vendorId} onChange={(e) => set({ vendorId: e.target.value })} disabled={catalog.isPending} className={inputBase}>
            <option value="">{catalog.isPending ? "Loading vendors…" : "No vendor yet"}</option>
            {catalog.data?.vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id={`${id}-ordered`} label={`Ordered quantity (${unit})`} hint={`Still to order: ${formatQty(toOrderQty(requirement), unit)}`}>
            <input id={`${id}-ordered`} type="number" inputMode="decimal" min={0} step="any" value={values.ordered} onChange={(e) => set({ ordered: e.target.value })} className={`${inputBase} tabular-nums`} />
          </Field>
          <Field id={`${id}-expected`} label="Expected delivery">
            <input id={`${id}-expected`} type="date" value={values.expected} onChange={(e) => set({ expected: e.target.value })} className={inputBase} />
          </Field>
        </div>

        {!hasOrder && (
          <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={requested} onChange={(e) => setRequested(e.target.checked)} className="mt-0.5 h-4 w-4 accent-stone-900" />
            A request is raised and waiting for approval
          </label>
        )}

        {problem && <p role="alert" className="text-sm text-red-700">{problem}</p>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={update.isPending} className={buttonSecondary}>Cancel</button>
          <button type="submit" disabled={update.isPending} className={buttonPrimary}>{update.isPending ? "Saving…" : "Save order"}</button>
        </div>
      </div>
    </form>
  );
}
