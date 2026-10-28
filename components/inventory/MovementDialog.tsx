"use client";

import React, { useMemo, useState } from "react";
import { describeError } from "@/lib/api";
import { MOVEMENT_PERMISSION } from "@/lib/access/types";
import { fmtQty, itemLabel, itemsForMaterial } from "@/lib/inventory/figures";
import { MOVEMENT_LABEL, NEEDS_ITEM, type BoqItem, type InventoryItem, type MovementType } from "@/lib/inventory/types";
import { useAccess } from "@/hooks/useProjectAccess";
import { useMaterialCatalog } from "@/hooks/useMaterialCatalog";
import { useOrders, useRecordMovement } from "@/hooks/useInventory";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { Field } from "@/components/materials/Field";
import { buttonPrimary, buttonSecondary, inputBase } from "../utilites/Label";

const TYPES: MovementType[] = ["RECEIVED", "ISSUED", "RESERVED", "RELEASED", "ADJUSTMENT_IN", "ADJUSTMENT_OUT"];
const HINT: Record<MovementType, string> = {
  RECEIVED: "A delivery into the store",
  ISSUED: "Material used on a BOQ item",
  RESERVED: "Set aside for a BOQ item",
  RELEASED: "Give back a reservation",
  ADJUSTMENT_IN: "A count found more",
  ADJUSTMENT_OUT: "Loss, damage or a count found less",
};

export interface MovementPreset {
  type?: MovementType;
  materialId?: string;
}

interface Props {
  projectId: string;
  open: boolean;
  preset: MovementPreset;
  stock: InventoryItem[];
  items: BoqItem[];
  onClose: () => void;
}

/** One entry in the stock log: received, issued to a BOQ item, reserved, released or corrected */
export function MovementDialog(props: Props) {
  return (
    <ModalDialog open={props.open} onClose={props.onClose} label="Record stock" size="lg">
      {props.open && <Body {...props} />}
    </ModalDialog>
  );
}

function Body({ projectId, preset, stock, items, onClose }: Props) {
  const access = useAccess();
  const allowed = TYPES.filter((t) => access.can(MOVEMENT_PERMISSION[t]));
  const catalog = useMaterialCatalog();
  const orders = useOrders(projectId);
  const record = useRecordMovement(projectId);

  const [type, setType] = useState<MovementType>(preset.type && allowed.includes(preset.type) ? preset.type : (allowed[0] ?? "RECEIVED"));
  const [materialId, setMaterialId] = useState(preset.materialId ?? "");
  const [quantity, setQuantity] = useState("");
  const [itemId, setItemId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const figures = stock.find((s) => s.material.id === materialId);
  const unit = figures?.material.unit ?? catalog.data?.materials.find((m) => m.id === materialId)?.unit ?? "";
  const { needing, others } = useMemo(() => itemsForMaterial(items, materialId), [items, materialId]);
  const reservedFor = figures?.byItem.filter((u) => u.reserved > 0) ?? [];
  const openOrders = (orders.data ?? []).filter((o) => o.material.id === materialId && o.pendingQty > 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const qty = Number(quantity);
    if (!materialId) return setError("Choose the material.");
    if (!(qty > 0)) return setError("Enter a quantity greater than zero.");
    if (NEEDS_ITEM[type] && !itemId) return setError("Choose the BOQ item.");
    if ((type === "ADJUSTMENT_IN" || type === "ADJUSTMENT_OUT") && note.trim().length < 3) return setError("Add a short note explaining the correction.");
    try {
      await record.mutateAsync({ materialId, type, quantity: qty, boqItemId: NEEDS_ITEM[type] ? itemId : null, orderId: type === "RECEIVED" && orderId ? orderId : null, note: note.trim() });
      onClose();
    } catch (err) {
      setError(describeError(err)); // the server has the last word: "Only 40 bag is in the store."
    }
  };

  if (allowed.length === 0) {
    return (
      <div>
        <DialogHeader title="Record stock" onClose={onClose} />
        <p className="p-5 text-sm text-stone-600">You don&rsquo;t have permission to record stock. Ask an admin.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <DialogHeader title="Record stock" subtitle={HINT[type]} onClose={onClose} locked={record.isPending} />
      <div className="space-y-4 p-4 sm:p-5">
        <div role="radiogroup" aria-label="What happened" className="flex flex-wrap gap-1.5">
          {allowed.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => setType(t)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${type === t ? "bg-stone-900 text-white" : "border border-stone-300 text-stone-600 hover:bg-stone-50"}`}
            >
              {MOVEMENT_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="mv-material" label="Material">
            <select id="mv-material" value={materialId} onChange={(e) => { setMaterialId(e.target.value); setItemId(""); setOrderId(""); }} className={inputBase}>
              <option value="">Choose…</option>
              {stock.length > 0 && (
                <optgroup label="This project">
                  {stock.map((s) => (
                    <option key={s.material.id} value={s.material.id}>{s.material.name} ({s.material.unit})</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="All materials">
                {(catalog.data?.materials ?? []).filter((m) => !stock.some((s) => s.material.id === m.id)).map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                ))}
              </optgroup>
            </select>
          </Field>
          <Field id="mv-qty" label={`Quantity${unit ? ` (${unit})` : ""}`} hint={figures ? `In store ${fmtQty(figures.onHand)} · available ${fmtQty(figures.available)}` : undefined}>
            <input id="mv-qty" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputBase} tabular-nums`} placeholder="0" />
          </Field>
        </div>

        {NEEDS_ITEM[type] && (
          <Field id="mv-item" label="BOQ item">
            <select id="mv-item" value={itemId} onChange={(e) => setItemId(e.target.value)} className={inputBase}>
              <option value="">Choose…</option>
              {type === "RELEASED" ? (
                reservedFor.map((u) => (
                  <option key={u.item.id} value={u.item.id}>{itemLabel(u.item)} · {fmtQty(u.reserved)} {unit} reserved</option>
                ))
              ) : (
                <>
                  {needing.length > 0 && (
                    <optgroup label="Needs this material">
                      {needing.map((i) => {
                        const left = figures?.byItem.find((u) => u.item.id === i.id)?.remaining;
                        return (
                          <option key={i.id} value={i.id}>{itemLabel(i)}{left !== undefined ? ` · ${fmtQty(left)} ${unit} still to issue` : ""}</option>
                        );
                      })}
                    </optgroup>
                  )}
                  {others.length > 0 && (
                    <optgroup label="Other BOQ items">
                      {others.map((i) => (
                        <option key={i.id} value={i.id}>{itemLabel(i)}</option>
                      ))}
                    </optgroup>
                  )}
                </>
              )}
            </select>
          </Field>
        )}

        {type === "RECEIVED" && openOrders.length > 0 && (
          <Field id="mv-order" label="Against an order (optional)" hint="Counts the delivery on that order">
            <select id="mv-order" value={orderId} onChange={(e) => setOrderId(e.target.value)} className={inputBase}>
              <option value="">No order</option>
              {openOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.reference || "Order"}{o.vendor ? ` · ${o.vendor.name}` : ""} · {fmtQty(o.pendingQty)} {o.material.unit} still to come
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field id="mv-note" label={type === "ADJUSTMENT_IN" || type === "ADJUSTMENT_OUT" ? "Reason" : "Note (optional)"}>
          <input id="mv-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} className={inputBase} placeholder={type === "RECEIVED" ? "e.g. challan no. 4512" : ""} />
        </Field>

        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={record.isPending} className={buttonSecondary}>Cancel</button>
          <button type="submit" disabled={record.isPending} className={buttonPrimary}>{record.isPending ? "Saving…" : `Record ${MOVEMENT_LABEL[type].toLowerCase()}`}</button>
        </div>
      </div>
    </form>
  );
}
