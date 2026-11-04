"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { FiFileText, FiImage, FiPaperclip, FiX } from "react-icons/fi";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { useSavePurchase } from "@/hooks/useMaterialPurchases";
import { describeError } from "@/lib/api";
import { amountOf, UNITS, type Purchase } from "@/lib/inventory/purchases";
import { money } from "./purchaseFormat";

const field = "mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:outline-none";
const label = "block text-sm font-medium text-stone-700";
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Local date: toISOString() would give yesterday early in the morning in India */
export const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

/**
 * Add (or change) one material: what it is, how many, the rate per unit, and the total worked out as you type.
 * The date, a note and the bill are optional.
 */
export function PurchaseDialog({
  projectId,
  names,
  editing,
  onClose,
}: {
  projectId: string;
  names: { name: string; unit: string }[];
  editing?: Purchase | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [unit, setUnit] = useState(editing?.unit ?? "");
  const [quantity, setQuantity] = useState(editing ? String(editing.quantity) : "");
  const [rate, setRate] = useState(editing ? String(editing.rate) : "");
  const [date, setDate] = useState(editing?.date ?? todayLocal());
  const [note] = useState(editing?.note ?? "");
  const [bill, setBill] = useState<File | null>(null);
  const [removeBill, setRemoveBill] = useState(false);
  const [tried, setTried] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const save = useSavePurchase(projectId);

  const q = num(quantity);
  const r = num(rate);
  const okName = name.trim().length > 0;
  const okQty = Number.isFinite(q) && q > 0;
  const okRate = Number.isFinite(r) && r >= 0;
  const total = okQty && okRate ? amountOf(q, r) : null;
  const keptBill = editing?.billUrl && !removeBill && !bill;

  // Picking a material already used fills in its unit
  const pickName = (v: string) => {
    setName(v);
    const known = names.find((n) => same(n.name, v));
    if (known && !unit) setUnit(known.unit);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!okName || !okQty || !okRate || save.isPending) return;
    save.mutate(
      { id: editing?.id, input: { section: editing?.section ?? "", name: name.trim(), unit: unit.trim(), quantity: q, rate: r, date, note: note.trim(), bill, removeBill: !!editing && removeBill } },
      { onSuccess: onClose }
    );
  };

  return (
    <ModalDialog open onClose={onClose} label={editing ? "Edit material" : "Add material"} locked={save.isPending}>
      <form onSubmit={submit} noValidate className="space-y-4 p-5">
        <h2 className="text-lg font-semibold text-stone-900">{editing ? "Edit material" : "Add material"}</h2>

        <label className={label}>
          Material
          <input
            value={name}
            onChange={(e) => pickName(e.target.value)}
            list={listId}
            maxLength={120}
            autoFocus={!editing}
            placeholder="e.g. Bricks"
            aria-invalid={tried && !okName}
            className={field}
          />
          <datalist id={listId}>
            {names.map((n) => (
              <option key={n.name} value={n.name} />
            ))}
          </datalist>
          {tried && !okName && <span className="mt-1 block text-xs text-red-700">Enter the material.</span>}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className={`${label} min-w-0`}>
            Quantity
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputMode="decimal"
              type="number"
              min={0}
              step="any"
              placeholder="5000"
              aria-invalid={tried && !okQty}
              className={`${field} tabular-nums`}
            />
            {tried && !okQty && <span className="mt-1 block text-xs text-red-700">Enter a quantity above zero.</span>}
          </label>
          <label className={`${label} min-w-0`}>
            Unit <span className="font-normal text-stone-400">(optional)</span>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={30} placeholder="nos" className={field} />
          </label>
        </div>
        <div className="-mt-2 flex flex-wrap gap-1.5" aria-label="Units">
          {UNITS.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={`min-h-8 rounded-full border px-3 text-xs font-medium ${same(unit, u) ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 text-stone-600 hover:border-stone-500"}`}
            >
              {u}
            </button>
          ))}
        </div>

        <label className={label}>
          Rate per {unit.trim() || "unit"}
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 mt-1 flex items-center text-sm text-stone-400">
              ₹
            </span>
            <input
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              inputMode="decimal"
              type="number"
              min={0}
              step="any"
              placeholder="8"
              aria-invalid={tried && !okRate}
              className={`${field} pl-7 tabular-nums`}
            />
          </div>
          {tried && !okRate && <span className="mt-1 block text-xs text-red-700">Enter the rate (0 or more).</span>}
        </label>

        {/* The total, worked out as you type */}
        <div className="flex items-baseline justify-between gap-3 rounded-lg bg-stone-50 px-4 py-3" aria-live="polite">
          <span className="text-sm text-stone-600">
            Total
            {/* {total !== null && (
              <span className="block text-xs text-stone-500 tabular-nums">
                {q.toLocaleString("en-IN")} {unit.trim()} × {money(r)}
              </span>
            )} */}
          </span>
          <span className="text-2xl font-semibold tabular-nums text-stone-900">{total !== null ? money(total) : "₹0"}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className={`${label} min-w-0`}>
            Date
            <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value || todayLocal())} className={field} />
          </label>
          <div className="min-w-0">
            <span className={label}>
              Bill <span className="font-normal text-stone-400">(optional)</span>
            </span>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" tabIndex={-1} onChange={(e) => setBill(e.target.files?.[0] ?? null)} />
            {bill || keptBill ? (
              <div className="mt-1 flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 px-3 text-sm">
                {(bill ? bill.type === "application/pdf" : editing?.billKind === "pdf") ? <FiFileText aria-hidden className="shrink-0" /> : <FiImage aria-hidden className="shrink-0" />}
                <span className="min-w-0 flex-1 truncate">{bill ? bill.name : "Bill attached"}</span>
                <button
                  type="button"
                  aria-label="Remove the bill"
                  onClick={() => {
                    if (bill) {
                      setBill(null);
                      if (fileRef.current) fileRef.current.value = "";
                    } else setRemoveBill(true);
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
        </div>

        {/* <label className={label}>
          Note <span className="font-normal text-stone-400">(optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Supplier, bill number…" className={field} />
        </label> */}

        {save.isError && (
          <p role="alert" className="text-sm text-red-700">
            {describeError(save.error)}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={save.isPending} className="min-h-11 rounded-lg px-4 text-sm font-medium text-stone-600 hover:bg-stone-100">
            Cancel
          </button>
          <button type="submit" disabled={save.isPending} className="min-h-11 rounded-lg bg-stone-900 px-5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
            {save.isPending ? "Saving…" : editing ? "Save" : "Add material"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}