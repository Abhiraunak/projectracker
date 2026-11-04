"use client";

import { useRef, useState, type FormEvent } from "react";
import { FiFileText, FiImage, FiPaperclip, FiTrash2, FiTruck, FiX } from "react-icons/fi";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { useAddDelivery, useRemoveDelivery } from "@/hooks/useMaterialPurchases";
import { describeError } from "@/lib/api";
import type { Delivery, Purchase } from "@/lib/inventory/purchases";
import { shortDate } from "@/lib/projects/hub";
import { qtyText } from "./purchaseFormat";
import { todayLocal } from "./PurchaseDialog";

const field = "mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:outline-none";

/** "3,000 of 5,000" with a bar and a tag; used in the table and on the log */
export function ArrivalBar({ p, compact }: { p: Purchase; compact?: boolean }) {
  const pct = p.quantity > 0 ? Math.min(100, Math.round((p.arrived / p.quantity) * 100)) : 0;
  const tag =
    p.state === "none"
      ? { text: "nothing yet", cls: "text-stone-500" }
      : p.state === "part"
        ? { text: `${qtyText(p.toCome)} to come`, cls: "rounded bg-amber-50 px-1.5 text-amber-800" }
        : p.state === "all"
          ? { text: "all arrived", cls: "rounded bg-emerald-50 px-1.5 text-emerald-800" }
          : { text: `${qtyText(p.extra)} extra`, cls: "rounded bg-sky-50 px-1.5 text-sky-800" };
  return (
    <span className="block min-w-0">
      <span className={`flex flex-wrap items-center gap-x-1.5 ${compact ? "text-xs" : "text-sm"}`}>
        {p.state !== "none" && (
          <span className="tabular-nums text-stone-800">
            {qtyText(p.arrived)} of {qtyText(p.quantity)}
          </span>
        )}
        <span className={`text-xs font-medium ${tag.cls}`}>{tag.text}</span>
      </span>
      <span aria-hidden className="mt-1 block h-1.5 overflow-hidden rounded-full bg-stone-100">
        <span className={`block h-full rounded-full ${p.state === "all" || p.state === "extra" ? "bg-emerald-600" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

/**
 * One material's deliveries: ordered, arrived, still to come, and a line per delivery (date, how many, bill).
 * "Log delivery" asks for the date (today), how many arrived and, optionally, the bill.
 */
export function DeliveryLog({ projectId, purchase: p, canEdit, onClose }: { projectId: string; purchase: Purchase; canEdit: boolean; onClose: () => void }) {
  const [logging, setLogging] = useState(canEdit && p.deliveries.length === 0);
  const unit = p.unit || "units";

  return (
    <ModalDialog open onClose={onClose} label={`Deliveries of ${p.name}`}>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-stone-900">{p.name}</h2>
            {p.section && <p className="text-sm text-stone-500">{p.section}</p>}
          </div>
          {canEdit && !logging && (
            <button type="button" onClick={() => setLogging(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800">
              <FiTruck aria-hidden /> Log delivery
            </button>
          )}
        </div>

        <dl className="grid grid-cols-3 gap-2">
          <Stat label="Ordered" value={`${qtyText(p.quantity)}`} unit={p.unit} />
          <Stat label="Arrived" value={qtyText(p.arrived)} unit={p.unit} tone="text-emerald-700" />
          {p.state === "extra" ? (
            <Stat label="Extra" value={qtyText(p.extra)} unit={p.unit} tone="text-sky-700" />
          ) : (
            <Stat label="Still to come" value={qtyText(p.toCome)} unit={p.unit} tone={p.toCome > 0 ? "text-amber-700" : "text-stone-900"} />
          )}
        </dl>

        {logging && <LogForm projectId={projectId} purchase={p} unit={unit} onDone={() => setLogging(false)} />}

        {p.deliveries.length === 0 ? (
          !logging && <p className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">Nothing has arrived yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-stone-500">
                <th scope="col" className="py-1.5 text-left font-medium">
                  Date
                </th>
                <th scope="col" className="py-1.5 text-right font-medium">
                  Arrived
                </th>
                <th scope="col" className="w-24 py-1.5">
                  <span className="sr-only">Bill and delete</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 border-t border-stone-100">
              {p.deliveries.map((d) => (
                <DeliveryRow key={d.id} projectId={projectId} purchaseId={p.id} d={d} unit={p.unit} canEdit={canEdit} />
              ))}
            </tbody>
          </table>
        )}

        <div className="flex justify-end pt-1">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-4 text-sm font-medium text-stone-600 hover:bg-stone-100">
            Close
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

function Stat({ label, value, unit, tone }: { label: string; value: string; unit: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-stone-50 px-3 py-2">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className={`truncate text-lg font-semibold tabular-nums ${tone ?? "text-stone-900"}`}>
        {value} <span className="text-xs font-normal text-stone-500">{unit}</span>
      </dd>
    </div>
  );
}

function LogForm({ projectId, purchase: p, unit, onDone }: { projectId: string; purchase: Purchase; unit: string; onDone: () => void }) {
  const [date, setDate] = useState(todayLocal());
  const [qty, setQty] = useState("");
  const [bill, setBill] = useState<File | null>(null);
  const [tried, setTried] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const add = useAddDelivery(projectId);
  const q = qty.trim() === "" ? NaN : Number(qty);
  const ok = Number.isFinite(q) && q > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!ok || add.isPending) return;
    add.mutate({ purchaseId: p.id, date, quantity: q, bill }, { onSuccess: onDone });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-xl border border-stone-200 p-4">
      <p className="text-sm font-medium text-stone-900">
        Log delivery{p.toCome > 0 && <span className="font-normal text-stone-500"> · {qtyText(p.toCome)} {p.unit} still to come</span>}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block min-w-0 text-sm font-medium text-stone-700">
          Date
          <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value || todayLocal())} className={field} />
        </label>
        <label className="block min-w-0 text-sm font-medium text-stone-700">
          How many arrived
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            autoFocus
            placeholder={p.toCome > 0 ? String(p.toCome) : "0"}
            aria-invalid={tried && !ok}
            className={`${field} tabular-nums`}
          />
          <span className="mt-1 flex items-center justify-between gap-2 text-xs font-normal text-stone-500">
            {unit}
            {p.toCome > 0 && (
              <button type="button" onClick={() => setQty(String(p.toCome))} className="font-medium text-stone-700 underline underline-offset-2 hover:text-stone-900">
                All the rest
              </button>
            )}
          </span>
        </label>
      </div>
      {tried && !ok && <p className="text-xs text-red-700">Enter how many arrived.</p>}

      <div>
        <span className="block text-sm font-medium text-stone-700">
          Bill <span className="font-normal text-stone-400">(optional)</span>
        </span>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" tabIndex={-1} onChange={(e) => setBill(e.target.files?.[0] ?? null)} />
        {bill ? (
          <div className="mt-1 flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 px-3 text-sm">
            {bill.type === "application/pdf" ? <FiFileText aria-hidden className="shrink-0" /> : <FiImage aria-hidden className="shrink-0" />}
            <span className="min-w-0 flex-1 truncate">{bill.name}</span>
            <button
              type="button"
              aria-label="Remove the bill"
              onClick={() => {
                setBill(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="rounded p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            >
              <FiX aria-hidden />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 px-3 text-sm text-stone-600 hover:border-stone-500 hover:text-stone-900">
            <FiPaperclip aria-hidden /> Photo or PDF
          </button>
        )}
      </div>

      {add.isError && (
        <p role="alert" className="text-sm text-red-700">
          {describeError(add.error)}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} disabled={add.isPending} className="min-h-11 rounded-lg px-4 text-sm font-medium text-stone-600 hover:bg-stone-100">
          Cancel
        </button>
        <button type="submit" disabled={add.isPending} className="min-h-11 rounded-lg bg-stone-900 px-5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
          {add.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function DeliveryRow({ projectId, purchaseId, d, unit, canEdit }: { projectId: string; purchaseId: string; d: Delivery; unit: string; canEdit: boolean }) {
  const remove = useRemoveDelivery(projectId);
  const [confirming, setConfirming] = useState(false);
  const btn = "inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900";
  return (
    <tr>
      <td className="py-2 text-stone-800">
        {shortDate(d.date)}
        {remove.isError && <span className="block text-xs text-red-700">{describeError(remove.error)}</span>}
      </td>
      <td className="py-2 text-right tabular-nums text-stone-900">
        {qtyText(d.quantity)} <span className="text-stone-500">{unit}</span>
      </td>
      <td className="whitespace-nowrap py-1 text-right">
        {confirming ? (
          <span className="inline-flex items-center gap-1">
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate({ purchaseId, deliveryId: d.id }, { onSettled: () => setConfirming(false) })}
              className="min-h-9 rounded-lg px-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {remove.isPending ? "…" : "Delete"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="min-h-9 rounded-lg px-2 text-sm font-medium text-stone-600 hover:bg-stone-100">
              No
            </button>
          </span>
        ) : (
          <span className="inline-flex items-center">
            {d.billUrl ? (
              <a href={d.billUrl} target="_blank" rel="noreferrer" className={btn} aria-label={`Open the bill of ${shortDate(d.date)}`} title="Open the bill">
                {d.billKind === "pdf" ? <FiFileText aria-hidden /> : <FiImage aria-hidden />}
              </a>
            ) : (
              <span aria-hidden className="inline-block h-9 w-9" />
            )}
            {canEdit && (
              <button type="button" onClick={() => setConfirming(true)} className={`${btn} hover:bg-red-50 hover:text-red-700`} aria-label={`Delete the delivery of ${shortDate(d.date)}`} title="Delete">
                <FiTrash2 aria-hidden />
              </button>
            )}
          </span>
        )}
      </td>
    </tr>
  );
}