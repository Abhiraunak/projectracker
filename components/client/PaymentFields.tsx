"use client";

import { useId } from "react";
import { MODE_LABEL, type PaymentMode, type ProofInput } from "@/lib/client/types";
import { inputClass, todayKey } from "./ui";

export interface PaymentDraft {
  amount: string;
  paidOn: string;
  mode: PaymentMode;
  reference: string;
  note: string;
}

export const emptyDraft = (amount: number): PaymentDraft => ({ amount: amount > 0 ? String(Math.round(amount * 100) / 100) : "", paidOn: todayKey(), mode: "UPI", reference: "", note: "" });

/** The form's text turned into what the server takes, or a message saying what is wrong */
export function readDraft(d: PaymentDraft, max: number): { input: ProofInput } | { error: string } {
  const amount = Number(d.amount.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter the amount paid." };
  if (amount > max + 1) return { error: `That's more than is left to pay (₹${Math.round(max).toLocaleString("en-IN")}).` };
  if (!d.paidOn) return { error: "Enter the date it was paid." };
  if (d.paidOn > todayKey()) return { error: "The payment date can't be in the future." };
  return { input: { amount: Math.round(amount * 100) / 100, paidOn: d.paidOn, mode: d.mode, reference: d.reference.trim(), note: d.note.trim() } };
}

/** Amount, date, how it was paid, and the transaction reference: shared by the client's upload and the admin's "record payment" */
export function PaymentFields({ value, onChange, disabled }: { value: PaymentDraft; onChange: (v: PaymentDraft) => void; disabled?: boolean }) {
  const id = useId();
  const set = <K extends keyof PaymentDraft>(k: K, v: PaymentDraft[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-amount`}>
        <span className="font-medium">Amount paid (₹)</span>
        <input id={`${id}-amount`} inputMode="decimal" required disabled={disabled} value={value.amount} onChange={(e) => set("amount", e.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-date`}>
        <span className="font-medium">Paid on</span>
        <input id={`${id}-date`} type="date" required max={todayKey()} disabled={disabled} value={value.paidOn} onChange={(e) => set("paidOn", e.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-mode`}>
        <span className="font-medium">Paid by</span>
        <select id={`${id}-mode`} disabled={disabled} value={value.mode} onChange={(e) => set("mode", e.target.value as PaymentMode)} className={inputClass}>
          {(Object.keys(MODE_LABEL) as PaymentMode[]).map((m) => (
            <option key={m} value={m}>
              {MODE_LABEL[m]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-ref`}>
        <span className="font-medium">
          Reference <span className="font-normal text-stone-500">(UTR / transaction / cheque no.)</span>
        </span>
        <input id={`${id}-ref`} maxLength={80} disabled={disabled} value={value.reference} onChange={(e) => set("reference", e.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2" htmlFor={`${id}-note`}>
        <span className="font-medium">
          Note <span className="font-normal text-stone-500">(optional)</span>
        </span>
        <input id={`${id}-note`} maxLength={300} disabled={disabled} value={value.note} onChange={(e) => set("note", e.target.value)} className={inputClass} />
      </label>
    </div>
  );
}
