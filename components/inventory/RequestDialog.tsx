"use client";

import React, { useMemo, useState } from "react";
import { describeError } from "@/lib/api";
import { fmtQty, itemLabel } from "@/lib/inventory/figures";
import type { BoqItem, InventoryItem } from "@/lib/inventory/types";
import { useMaterialCatalog } from "@/hooks/useMaterialCatalog";
import { useCreateRequest } from "@/hooks/useInventory";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { Field } from "@/components/materials/Field";
import { buttonPrimary, buttonSecondary, inputBase } from "../utilites/Label";

interface Props {
  projectId: string;
  open: boolean;
  items: BoqItem[];
  stock: InventoryItem[];
  onClose: () => void;
}

/** "I need 40 bags of cement for 5.3.9 by Friday": the BOQ item first, then its materials are offered */
export function RequestDialog(props: Props) {
  return (
    <ModalDialog open={props.open} onClose={props.onClose} label="Request material">
      {props.open && <Body {...props} />}
    </ModalDialog>
  );
}

function Body({ projectId, items, stock, onClose }: Props) {
  const catalog = useMaterialCatalog();
  const create = useCreateRequest(projectId);
  const active = useMemo(() => items.filter((i) => i.active), [items]);
  const [itemId, setItemId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const item = active.find((i) => i.id === itemId);
  const planned = item?.materials ?? [];
  const figures = stock.find((s) => s.material.id === materialId);
  const left = figures?.byItem.find((u) => u.item.id === itemId)?.remaining;
  const unit = figures?.material.unit ?? catalog.data?.materials.find((m) => m.id === materialId)?.unit ?? "";

  const chooseItem = (id: string) => {
    setItemId(id);
    const first = active.find((i) => i.id === id)?.materials[0];
    setMaterialId(first?.materialId ?? "");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const qty = Number(quantity);
    if (!itemId) return setError("Choose what the material is for.");
    if (!materialId) return setError("Choose the material.");
    if (!(qty > 0)) return setError("Enter a quantity greater than zero.");
    try {
      await create.mutateAsync({ materialId, boqItemId: itemId, quantity: qty, neededBy: neededBy || null, note: note.trim() });
      onClose();
    } catch (err) {
      setError(describeError(err));
    }
  };

  return (
    <form onSubmit={submit}>
      <DialogHeader title="Request material" subtitle="Whoever approves requests is notified" onClose={onClose} locked={create.isPending} />
      <div className="space-y-4 p-4 sm:p-5">
        <Field id="rq-item" label="For BOQ item">
          <select id="rq-item" value={itemId} onChange={(e) => chooseItem(e.target.value)} className={inputBase}>
            <option value="">Choose…</option>
            {active.map((i) => (
              <option key={i.id} value={i.id}>{itemLabel(i)}</option>
            ))}
          </select>
        </Field>
        <Field id="rq-material" label="Material" hint={figures ? `In store ${fmtQty(figures.onHand)} ${unit}${left !== undefined ? ` · this item still needs ${fmtQty(left)}` : ""}` : undefined}>
          <select id="rq-material" value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={inputBase}>
            <option value="">Choose…</option>
            {planned.length > 0 && (
              <optgroup label="Planned for this item">
                {planned.map((m) => (
                  <option key={m.materialId} value={m.materialId}>{m.material.name} ({m.material.unit})</option>
                ))}
              </optgroup>
            )}
            <optgroup label="All materials">
              {(catalog.data?.materials ?? []).filter((m) => !planned.some((p) => p.materialId === m.id)).map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
              ))}
            </optgroup>
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="rq-qty" label={`Quantity${unit ? ` (${unit})` : ""}`}>
            <input id="rq-qty" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputBase} tabular-nums`} />
          </Field>
          <Field id="rq-date" label="Needed by (optional)">
            <input id="rq-date" type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className={inputBase} />
          </Field>
        </div>
        <Field id="rq-note" label="Note (optional)">
          <input id="rq-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className={inputBase} placeholder="e.g. for the second pour" />
        </Field>
        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={create.isPending} className={buttonSecondary}>Cancel</button>
          <button type="submit" disabled={create.isPending} className={buttonPrimary}>{create.isPending ? "Sending…" : "Send request"}</button>
        </div>
      </div>
    </form>
  );
}
