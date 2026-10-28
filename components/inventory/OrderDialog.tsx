"use client";

import React, { useState } from "react";
import { describeError } from "@/lib/api";
import type { InventoryItem, MaterialOrder } from "@/lib/inventory/types";
import { fmtQty } from "@/lib/inventory/figures";
import { useMaterialCatalog } from "@/hooks/useMaterialCatalog";
import { useSaveOrder } from "@/hooks/useInventory";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { Field } from "@/components/materials/Field";
import { buttonPrimary, buttonSecondary, inputBase } from "../utilites/Label";

interface Props {
  projectId: string;
  open: boolean;
  order: MaterialOrder | null; // null: a new order
  presetMaterialId?: string;
  stock: InventoryItem[];
  onClose: () => void;
}

/** A purchase order for one material: vendor, quantity, PO number and expected date */
export function OrderDialog(props: Props) {
  return (
    <ModalDialog open={props.open} onClose={props.onClose} label={props.order ? "Edit order" : "New order"}>
      {props.open && <Body {...props} />}
    </ModalDialog>
  );
}

function Body({ projectId, order, presetMaterialId, stock, onClose }: Props) {
  const catalog = useMaterialCatalog();
  const save = useSaveOrder(projectId);
  const suggested = stock.find((s) => s.material.id === (order?.material.id ?? presetMaterialId));

  const [materialId, setMaterialId] = useState(order?.material.id ?? presetMaterialId ?? "");
  const [vendorId, setVendorId] = useState(order?.vendor?.id ?? "");
  const [quantity, setQuantity] = useState(order ? String(order.quantity) : suggested && suggested.toOrder > 0 ? String(suggested.toOrder) : "");
  const [expected, setExpected] = useState(order?.expectedDelivery ?? "");
  // The agreed price: the order's own, or the material's standard rate to start from
  const standardRate = (id: string) => catalog.data?.materials.find((m) => m.id === id)?.rate ?? 0;
  const [rate, setRate] = useState(order ? String(order.rate) : "");
  const shownRate = rate === "" && !order ? String(standardRate(materialId) || "") : rate;
  const [reference, setReference] = useState(order?.reference ?? "");
  const [note, setNote] = useState(order?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const figures = stock.find((s) => s.material.id === materialId);
  const unit = figures?.material.unit ?? catalog.data?.materials.find((m) => m.id === materialId)?.unit ?? "";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const qty = Number(quantity);
    const price = Number(shownRate || "0");
    if (!materialId) return setError("Choose the material.");
    if (!(qty > 0)) return setError("Enter a quantity greater than zero.");
    if (!(price >= 0)) return setError("The rate must be 0 or more.");
    try {
      await save.mutateAsync({ id: order?.id, materialId, input: { vendorId: vendorId || null, quantity: qty, rate: price, expectedDelivery: expected || null, reference: reference.trim(), note: note.trim() } });
      onClose();
    } catch (err) {
      setError(describeError(err));
    }
  };

  return (
    <form onSubmit={submit}>
      <DialogHeader title={order ? "Edit order" : "New order"} subtitle={figures ? `To order ${fmtQty(figures.toOrder)} ${unit} · on order ${fmtQty(figures.incoming)}` : undefined} onClose={onClose} locked={save.isPending} />
      <div className="space-y-4 p-4 sm:p-5">
        <Field id="o-material" label="Material">
          <select id="o-material" value={materialId} onChange={(e) => setMaterialId(e.target.value)} disabled={!!order} className={inputBase}>
            <option value="">Choose…</option>
            {(catalog.data?.materials ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="o-qty" label={`Quantity${unit ? ` (${unit})` : ""}`} hint={order && order.receivedQty > 0 ? `${fmtQty(order.receivedQty)} already received` : undefined}>
            <input id="o-qty" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputBase} tabular-nums`} />
          </Field>
          <Field id="o-rate" label={`Rate (₹ per ${unit || "unit"})`} hint={Number(quantity) > 0 && Number(shownRate) > 0 ? `Order value ₹${(Number(quantity) * Number(shownRate)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "Starts at the standard rate"}>
            <input id="o-rate" inputMode="decimal" value={shownRate} onChange={(e) => setRate(e.target.value)} className={`${inputBase} tabular-nums`} />
          </Field>
        </div>
        <Field id="o-date" label="Expected delivery" hint="A late-delivery alert goes out the day after">
          <input id="o-date" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} className={inputBase} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="o-vendor" label="Vendor">
            <select id="o-vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputBase}>
              <option value="">Not chosen yet</option>
              {(catalog.data?.vendors ?? []).map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </Field>
          <Field id="o-ref" label="PO number">
            <input id="o-ref" maxLength={60} value={reference} onChange={(e) => setReference(e.target.value)} className={inputBase} placeholder="e.g. PO-2026-031" />
          </Field>
        </div>
        <Field id="o-note" label="Note (optional)">
          <input id="o-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className={inputBase} />
        </Field>
        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={save.isPending} className={buttonSecondary}>Cancel</button>
          <button type="submit" disabled={save.isPending} className={buttonPrimary}>{save.isPending ? "Saving…" : order ? "Save order" : "Place order"}</button>
        </div>
      </div>
    </form>
  );
}
