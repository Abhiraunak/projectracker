"use client";

import React, { useState } from "react";
import { describeError } from "@/lib/api";
import { fmtQty, itemLabel } from "@/lib/inventory/figures";
import type { InventoryItem, MaterialRequest } from "@/lib/inventory/types";
import { useMaterialCatalog } from "@/hooks/useMaterialCatalog";
import { useRequestAction } from "@/hooks/useInventory";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { Field } from "@/components/materials/Field";
import { buttonPrimary, buttonSecondary, inputBase } from "../utilites/Label";

export type DialogAction = "approve" | "reject" | "cancel" | "issue" | "order";

const TITLE: Record<DialogAction, string> = {
  approve: "Approve request",
  reject: "Reject request",
  cancel: "Cancel request",
  issue: "Issue from the store",
  order: "Order for this request",
};

interface Props {
  projectId: string;
  request: MaterialRequest | null;
  action: DialogAction | null;
  stock: InventoryItem[];
  onClose: () => void;
}

/** One step on a request: approve (optional note), reject (reason), cancel, issue (quantity), or order (vendor, rate, date) */
export function RequestActionDialog(props: Props) {
  const open = !!props.request && !!props.action;
  return (
    <ModalDialog open={open} onClose={props.onClose} label={props.action ? TITLE[props.action] : "Request"}>
      {open && <Body {...props} request={props.request!} action={props.action!} />}
    </ModalDialog>
  );
}

function Body({ projectId, request, action, stock, onClose }: Props & { request: MaterialRequest; action: DialogAction }) {
  const catalog = useMaterialCatalog();
  const run = useRequestAction(projectId);
  const figures = stock.find((s) => s.material.id === request.material.id);
  const standardRate = catalog.data?.materials.find((m) => m.id === request.material.id)?.rate ?? 0;
  const u = request.material.unit;

  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(String(action === "issue" && figures ? Math.min(request.quantity, figures.onHand) : request.quantity));
  const [rate, setRate] = useState(standardRate ? String(standardRate) : "");
  const [vendorId, setVendorId] = useState("");
  const [expected, setExpected] = useState(request.neededBy ?? "");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const qty = Number(quantity);
    try {
      if (action === "issue") {
        if (!(qty > 0)) return setError("Enter a quantity greater than zero.");
        await run.mutateAsync({ id: request.id, action, quantity: qty, note: note.trim() });
      } else if (action === "order") {
        if (!(qty > 0)) return setError("Enter a quantity greater than zero.");
        await run.mutateAsync({ id: request.id, action, quantity: qty, rate: Number(rate || "0"), vendorId: vendorId || null, expectedDelivery: expected || null, reference: reference.trim() });
      } else {
        if (action === "reject" && note.trim().length < 3) return setError("Say why, so the person who asked knows.");
        await run.mutateAsync({ id: request.id, action, note: note.trim() });
      }
      onClose();
    } catch (err) {
      setError(describeError(err)); // e.g. "Only 20 bag is in the store." or "already handled by someone else"
    }
  };

  return (
    <form onSubmit={submit}>
      <DialogHeader title={TITLE[action]} subtitle={`${fmtQty(request.quantity)} ${u} ${request.material.name}${request.boqItem ? ` for ${itemLabel(request.boqItem)}` : ""}`} onClose={onClose} locked={run.isPending} />
      <div className="space-y-4 p-4 sm:p-5">
        {request.note && <p className="rounded bg-stone-50 p-3 text-sm text-stone-700">&ldquo;{request.note}&rdquo; · {request.requestedBy.email}</p>}

        {(action === "issue" || action === "order") && (
          <Field id="ra-qty" label={`Quantity (${u})`} hint={figures ? `In store ${fmtQty(figures.onHand)} ${u} · available ${fmtQty(figures.available)}` : undefined}>
            <input id="ra-qty" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputBase} tabular-nums`} />
          </Field>
        )}

        {action === "order" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="ra-rate" label={`Rate (₹ per ${u})`}>
                <input id="ra-rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className={`${inputBase} tabular-nums`} />
              </Field>
              <Field id="ra-date" label="Expected delivery">
                <input id="ra-date" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} className={inputBase} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="ra-vendor" label="Vendor">
                <select id="ra-vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputBase}>
                  <option value="">Not chosen yet</option>
                  {(catalog.data?.vendors ?? []).map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </Field>
              <Field id="ra-ref" label="PO number">
                <input id="ra-ref" maxLength={60} value={reference} onChange={(e) => setReference(e.target.value)} className={inputBase} />
              </Field>
            </div>
          </>
        )}

        {action !== "order" && (
          <Field id="ra-note" label={action === "reject" ? "Reason" : "Note (optional)"}>
            <input id="ra-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className={inputBase} />
          </Field>
        )}

        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={run.isPending} className={buttonSecondary}>Back</button>
          <button type="submit" disabled={run.isPending} className={action === "reject" || action === "cancel" ? "rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50" : buttonPrimary}>
            {run.isPending ? "Saving…" : TITLE[action]}
          </button>
        </div>
      </div>
    </form>
  );
}
