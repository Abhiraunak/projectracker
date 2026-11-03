"use client";

import { useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { FiPaperclip, FiPlus } from "react-icons/fi";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { useQuickMove } from "@/hooks/useMaterialsTab";
import { describeError } from "@/lib/api";
import { qty } from "@/lib/inventory/materialsTab";

export type MoveMode = "RECEIVED" | "ISSUED" | "CORRECT";

const field = "mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:outline-none";

/** Local date: toISOString() would give yesterday early in the morning in India */
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const TITLE: Record<MoveMode, string> = { RECEIVED: "Received", ISSUED: "Issued", CORRECT: "Correct stock" };

/**
 * Three boxes: how much, the date (today already filled in) and a note. Received can also take the vendor and a
 * photo of the bill, both optional and tucked away. Correct stock asks for the count in the store and why.
 * Shows what the store will hold after saving; the list updates as soon as it's saved.
 */
export function MoveDialog({
  projectId,
  material,
  mode,
  onClose,
}: {
  projectId: string;
  material: { id: string; name: string; unit: string; inStock: number };
  mode: MoveMode;
  onClose: () => void;
}) {
  const move = useQuickMove(projectId);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState("");
  const [more, setMore] = useState(false);
  const [vendor, setVendor] = useState("");
  const [bill, setBill] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const n = amount.trim() === "" ? NaN : Number(amount);
  const unit = material.unit;
  const after = mode === "RECEIVED" ? material.inStock + (n || 0) : mode === "ISSUED" ? material.inStock - (n || 0) : n;
  const diff = mode === "CORRECT" && Number.isFinite(n) ? n - material.inStock : 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setProblem(null);
    if (mode === "CORRECT") {
      if (!(n >= 0)) return setProblem("Enter how much is in the store now (0 or more).");
      if (Math.abs(diff) < 1e-9) return setProblem("That's the same as the stock already shown. Nothing to correct.");
      if (note.trim().length < 3) return setProblem("Say why the stock is being corrected (counted at site, damaged…).");
    } else {
      if (!(n > 0)) return setProblem("Enter a quantity greater than zero.");
      if (mode === "ISSUED" && n > material.inStock + 1e-9) return setProblem(`Only ${qty(material.inStock)} ${unit} is in the store.`);
    }
    try {
      await move.mutateAsync({
        materialId: material.id,
        type: mode === "CORRECT" ? (diff > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT") : mode,
        quantity: mode === "CORRECT" ? Math.abs(diff) : n,
        date,
        note: note.trim(),
        vendorName: mode === "RECEIVED" ? vendor.trim() : "",
        bill: mode === "RECEIVED" ? bill : null,
      });
      onClose();
    } catch {
      /* shown below */
    }
  };

  return (
    <ModalDialog open onClose={onClose} label={`${TITLE[mode]}: ${material.name}`} locked={move.isPending}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">
            {TITLE[mode]} <span className="font-normal text-stone-500">· {material.name}</span>
          </h2>
          <p className="text-sm text-stone-500">
            In stock now: <b className="font-semibold tabular-nums text-stone-900">{qty(material.inStock)} {unit}</b>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={mode === "CORRECT" ? `Count in the store (${unit})` : `Quantity (${unit})`}>
            <input type="number" inputMode="decimal" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus placeholder="0" className={`${field} tabular-nums`} />
          </Field>
          <Field label="Date">
            <input type="date" value={date} max={todayLocal()} onChange={(e) => e.target.value && setDate(e.target.value)} required className={field} />
          </Field>
        </div>

        <Field label={mode === "CORRECT" ? "Why" : "Note"} optional={mode !== "CORRECT"}>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder={mode === "RECEIVED" ? "e.g. Truck 2" : mode === "ISSUED" ? "e.g. Ground floor walls" : "e.g. Counted at site"}
            className={field}
          />
        </Field>

        {mode === "RECEIVED" &&
          (more ? (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-stone-200 p-3 sm:grid-cols-2">
              <Field label="Vendor" optional>
                <input value={vendor} onChange={(e) => setVendor(e.target.value)} maxLength={120} placeholder="e.g. Shree Traders" className={field} />
              </Field>
              <div className="text-sm">
                <span className="font-medium text-stone-700">
                  Bill <span className="font-normal text-stone-400">(optional)</span>
                </span>
                <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-stone-300 px-3 text-stone-700 hover:border-stone-500">
                  <FiPaperclip aria-hidden className="shrink-0 text-stone-400" />
                  <span className="truncate">{bill ? bill.name : "Photo or PDF"}</span>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={(e) => setBill(e.target.files?.[0] ?? null)} className="sr-only" />
                </label>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setMore(true)} className="-mt-1 flex min-h-9 items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900">
              <FiPlus aria-hidden /> Add vendor or bill
            </button>
          ))}

        <p className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600" aria-live="polite">
          {mode === "CORRECT"
            ? Number.isFinite(n)
              ? diff === 0
                ? "No change."
                : `Stock will be corrected ${diff > 0 ? "up" : "down"} by ${qty(Math.abs(diff))} ${unit}.`
              : "Count what's in the store and enter it."
            : (
              <>
                In stock after this: <b className={`font-semibold tabular-nums ${after < 0 ? "text-red-700" : "text-stone-900"}`}>{qty(Math.max(after, 0))} {unit}</b>
              </>
            )}
        </p>

        {(problem || move.isError) && (
          <p role="alert" className="text-sm text-red-700">
            {problem ?? describeError(move.error)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={move.isPending} className="min-h-11 rounded-lg px-4 text-sm font-medium text-stone-600 hover:bg-stone-100">
            Cancel
          </button>
          <button type="submit" disabled={move.isPending} className="min-h-11 rounded-lg bg-stone-900 px-5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
            {move.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-stone-700">
        {label} {optional && <span className="font-normal text-stone-400">(optional)</span>}
      </span>
      {children}
    </label>
  );
}