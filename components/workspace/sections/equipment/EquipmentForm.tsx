"use client";

import { useState } from "react";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { describeError } from "@/lib/api";
import type { SiteItem } from "@/lib/equipment/api";
import { useAddEquipment, useUpdateEquipment } from "@/hooks/useEquipment";
import { field, Label, primaryBtn, quietBtn, todayLocal } from "./shared";

/** What the form needs from an item to edit it: works for a site row, a register row and an item page */
export type EditableItem = Pick<SiteItem, "id" | "name" | "notes" | "unitCost"> & { purchasedOn?: string | null };

/**
 * The simple Add / Edit equipment form: name, remarks, date of purchase and cost. Anything else (owned or hired, who
 * from) goes in Remarks. A new item is one piece, owned, placed at this site today; it can then be moved like any
 * other. Editing changes only these four fields, so older items keep their kind, unit, hire rate and so on.
 */
export function EquipmentForm({ projectId, item, onClose }: { projectId: string; item?: EditableItem; onClose: () => void }) {
  const add = useAddEquipment();
  const update = useUpdateEquipment();
  const busy = add.isPending || update.isPending;
  const error = add.error ?? update.error;

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
      if (item) await update.mutateAsync({ id: item.id, body: details });
      else
        await add.mutateAsync({
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
          <Label text="Date of purchase" optional>
            <input type="date" value={purchasedOn} max={today} onChange={(e) => setPurchasedOn(e.target.value)} className={field} />
          </Label>
          <Label text="Cost (₹)" optional>
            <input value={cost} onChange={(e) => setCost(e.target.value)} type="number" min="0" step="any" inputMode="decimal" placeholder="45000" className={`${field} tabular-nums`} />
          </Label>
        </div>
        {badDate && <p className="text-sm text-red-700">The date of purchase can&apos;t be in the future.</p>}

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