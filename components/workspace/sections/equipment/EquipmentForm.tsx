"use client";

import { useState } from "react";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { describeError } from "@/lib/api";
import type { SiteItem } from "@/lib/equipment/api";
import { useAddEquipment, useEquipmentBill, useUpdateEquipment } from "@/hooks/useEquipment";
import { DatePick } from "../labour-simple/DatePick";
import { FiFileText, FiPaperclip, FiX } from "react-icons/fi";
import { field, Label, primaryBtn, quietBtn, todayLocal } from "./shared";

/** What the form needs from an item to edit it: works for a site row, a register row and an item page */
export type EditableItem = Pick<SiteItem, "id" | "name" | "notes" | "unitCost"> & { purchasedOn?: string | null; billUrl?: string | null };

/**
 * The simple Add / Edit equipment form: name, remarks, date of purchase and cost. Anything else (owned or hired, who
 * from) goes in Remarks. A new item is one piece, owned, placed at this site today; it can then be moved like any
 * other. Editing changes only these four fields, so older items keep their kind, unit, hire rate and so on.
 * Bill (optional): a photo or PDF, uploaded right after the item is saved; editing can replace or remove it.
 */
export function EquipmentForm({ projectId, item, onClose }: { projectId: string; item?: EditableItem; onClose: () => void }) {
  const add = useAddEquipment();
  const update = useUpdateEquipment();
  const billSave = useEquipmentBill();
  const busy = add.isPending || update.isPending || billSave.isPending;
  const error = add.error ?? update.error ?? billSave.error;
  const [bill, setBill] = useState<File | null>(null); // a new bill to attach
  const [dropBill, setDropBill] = useState(false); // take the current bill off
  const hasBill = !!item?.billUrl && !dropBill;

  const [name, setName] = useState(item?.name ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [purchasedOn, setPurchasedOn] = useState(item?.purchasedOn ?? "");
  const [cost, setCost] = useState(item?.unitCost?.toString() ?? "");
  const today = todayLocal();
  const badCost = cost !== "" && !(Number(cost) >= 0);
  const badDate = purchasedOn !== "" && purchasedOn > today;
  const valid = name.trim() !== "" && !badCost && !badDate;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    const details = {
      name: name.trim(),
      notes: notes.trim(),
      purchasedOn: purchasedOn || null,
      unitCost: cost !== "" ? Number(cost) : null,
    };
    try {
      let id = item?.id;
      if (item) await update.mutateAsync({ id: item.id, body: details });
      else {
        const made = await add.mutateAsync({
          ...details,
          category: "other",
          unit: "nos",
          code: null,
          ownership: "owned",
          hireRate: null,
          hirePer: "day",
          supplier: null,
          serviceDue: null,
          marketValue: null,
          quantity: 1,
          to: projectId,
          date: today,
        });
        id = made.id;
      }
      // The bill goes after the item is saved: a new file, or taking the old one off
      if (id && bill) await billSave.mutateAsync({ id, file: bill });
      else if (id && item?.billUrl && dropBill) await billSave.mutateAsync({ id, file: null });
      onClose();
    } catch {
      /* shown below */
    }
  };

  const title = item ? `Edit ${item.name}` : "Add equipment";
  return (
    <ModalDialog open onClose={onClose} label={title} size="md" locked={busy}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">{title}</h2>

        <Label text="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoFocus placeholder="Concrete mixer" className={field} />
        </Label>
        <Label text="Remarks" optional>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Own, or hired from Sai Earthmovers at ₹18,000 a month"
            className={`${field} py-2`}
          />
        </Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* The app's own date picker (shows 1 Nov 2026); not a <Label>, as the picker has its own button */}
          <div className="block text-sm">
            <span className="font-medium text-stone-700">
              Date of purchase <span className="font-normal text-stone-400">(optional)</span>
            </span>
            <DatePick value={purchasedOn} onChange={setPurchasedOn} label="Date of purchase" className="mt-1 w-full" />
          </div>
          <Label text="Cost (₹)" optional>
            <input value={cost} onChange={(e) => setCost(e.target.value)} type="number" min="0" step="any" inputMode="decimal" placeholder="45000" className={`${field} tabular-nums`} />
          </Label>
        </div>
        {badDate && <p className="text-sm text-red-700">The date of purchase can&apos;t be in the future.</p>}

        {/* Not a <Label>: it holds its own file pickers and links */}
        <div className="block text-sm">
          <span className="font-medium text-stone-700">
            Bill <span className="font-normal text-stone-400">(optional)</span>
          </span>
          {bill ? (
            <span className="flex min-h-11 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm">
              <FiFileText aria-hidden className="shrink-0 text-stone-500" />
              <span className="min-w-0 flex-1 truncate">{bill.name}</span>
              <button type="button" onClick={() => setBill(null)} aria-label="Remove this file" className="rounded p-1 text-stone-500 hover:bg-stone-200">
                <FiX aria-hidden />
              </button>
            </span>
          ) : hasBill ? (
            <span className="flex min-h-11 items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm">
              <FiFileText aria-hidden className="shrink-0 text-stone-500" />
              <a href={item!.billUrl!} target="_blank" rel="noreferrer" className="flex-1 font-medium text-[#185FA5] underline underline-offset-2">
                View bill
              </a>
              <label className="cursor-pointer text-stone-600 underline underline-offset-2">
                Replace
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => setBill(e.target.files?.[0] ?? null)} />
              </label>
              <button type="button" onClick={() => setDropBill(true)} className="text-red-700 underline underline-offset-2">
                Remove
              </button>
            </span>
          ) : (
            <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 text-sm text-stone-600 hover:bg-stone-50">
              <FiPaperclip aria-hidden /> Photo or PDF
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => setBill(e.target.files?.[0] ?? null)} />
            </label>
          )}
          {dropBill && !bill && <span className="mt-1 block text-xs text-stone-500">The bill will be removed when you save.</span>}
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {describeError(error)}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className={quietBtn}>
            Cancel
          </button>
          <button type="submit" disabled={!valid || busy} className={primaryBtn}>
            {busy ? "Saving…" : item ? "Save changes" : "Add"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}