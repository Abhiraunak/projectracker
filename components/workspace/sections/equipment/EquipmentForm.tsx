"use client";

import { useState } from "react";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { describeError } from "@/lib/api";
import type { CategoryKey, EquipmentChanges, RegisterItem } from "@/lib/equipment/api";
import { useAddEquipment, useUpdateEquipment } from "@/hooks/useEquipment";
import { goTo } from "@/hooks/useWorkspacePlace";
import { CATEGORY_LABEL, Choice, field, Label, primaryBtn, quietBtn, todayLocal } from "./shared";

const UNITS = ["nos", "sets", "sq m", "rft", "kg"];
const CATS = (Object.keys(CATEGORY_LABEL) as CategoryKey[]).map((k) => ({ value: k, label: CATEGORY_LABEL[k] }));

/**
 * Add a new item to the register, or (with `item`) change its details. Quantities are never typed over here:
 * after adding, more arrive, move or go only through moves, so the history explains every number.
 */
export function EquipmentForm({
  projectId,
  projects,
  item,
  onClose,
}: {
  projectId: string;
  projects: { id: string; title: string }[];
  item?: RegisterItem;
  onClose: () => void;
}) {
  const add = useAddEquipment();
  const update = useUpdateEquipment();
  const busy = add.isPending || update.isPending;
  const error = add.error ?? update.error;

  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState<CategoryKey>(item?.category ?? "shuttering");
  const [unit, setUnit] = useState(item?.unit ?? "nos");
  const [ownership, setOwnership] = useState<"owned" | "hired">(item?.ownership ?? "owned");
  const [hireRate, setHireRate] = useState(item?.hireRate?.toString() ?? "");
  const [hirePer, setHirePer] = useState<"day" | "month">(item?.hirePer ?? "day");
  const [supplier, setSupplier] = useState(item?.supplier ?? "");
  const [code, setCode] = useState(item?.code ?? "");
  const [serviceDue, setServiceDue] = useState(item?.serviceDue ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [quantity, setQuantity] = useState("");
  const [where, setWhere] = useState<string>(() => (projects.some((p) => p.id === projectId) ? projectId : "")); // "" = the yard
  const [date, setDate] = useState(todayLocal());
  const [more, setMore] = useState(Boolean(item?.code || item?.serviceDue || item?.notes));

  const qtyNum = Number(quantity);
  const valid = name.trim() && unit.trim() && (item || qtyNum > 0) && (ownership === "owned" || hireRate === "" || Number(hireRate) >= 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    const details: EquipmentChanges = {
      name: name.trim(),
      category,
      unit: unit.trim(),
      ownership,
      hireRate: ownership === "hired" && hireRate !== "" ? Number(hireRate) : null,
      hirePer,
      supplier: supplier.trim() || null,
      code: code.trim() || null,
      serviceDue: serviceDue || null,
      notes: notes.trim(),
    };
    try {
      if (item) {
        await update.mutateAsync({ id: item.id, body: details });
        onClose();
      } else {
        const made = await add.mutateAsync({ ...(details as Required<typeof details>), quantity: qtyNum, to: where || null, date });
        onClose();
        goTo({ projectId, section: "equipment", item: made.id });
      }
    } catch {
      /* shown below */
    }
  };

  return (
    <ModalDialog open onClose={onClose} label={item ? `Edit ${item.name}` : "Add equipment"} size="lg" locked={busy}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">{item ? `Edit ${item.name}` : "Add equipment"}</h2>

        <Label text="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoFocus placeholder="e.g. Steel plates 2×1 ft, Concrete mixer" className={field} />
        </Label>

        <Choice label="Kind" value={category} options={CATS} onChange={setCategory} />

        {!item && (
          <div className="grid grid-cols-2 gap-3">
            <Label text="How many">
              <input value={quantity} onChange={(e) => setQuantity(e.target.value)} required inputMode="decimal" type="number" min="0" step="any" className={`${field} tabular-nums`} />
            </Label>
            <Label text="Unit">
              <input value={unit} onChange={(e) => setUnit(e.target.value)} required maxLength={20} list="equipment-units" className={field} />
              <datalist id="equipment-units">
                {UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </Label>
          </div>
        )}
        {item && (
          <Label text="Unit">
            <input value={unit} onChange={(e) => setUnit(e.target.value)} required maxLength={20} list="equipment-units" className={`${field} sm:w-40`} />
            <datalist id="equipment-units">
              {UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Label>
        )}

        {!item && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Label text="Where is it now">
              <select value={where} onChange={(e) => setWhere(e.target.value)} className={field}>
                <option value="">Yard (our store)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id === projectId ? `${p.title} (this site)` : p.title}
                  </option>
                ))}
              </select>
            </Label>
            <Label text="Since">
              <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} required className={field} />
            </Label>
          </div>
        )}

        <Choice
          label="Owned or hired"
          value={ownership}
          options={[
            { value: "owned", label: "Our own" },
            { value: "hired", label: "Hired" },
          ]}
          onChange={setOwnership}
        />
        {ownership === "hired" && (
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-stone-50 p-3">
            <Label text={`Rate per ${unit === "nos" ? "piece" : unit || "unit"}`} optional>
              <input value={hireRate} onChange={(e) => setHireRate(e.target.value)} type="number" min="0" step="any" inputMode="decimal" placeholder="₹" className={`${field} tabular-nums`} />
            </Label>
            <Label text="Per">
              <select value={hirePer} onChange={(e) => setHirePer(e.target.value as "day" | "month")} className={field}>
                <option value="day">Day</option>
                <option value="month">Month</option>
              </select>
            </Label>
            <div className="col-span-2">
              <Label text="Hired from" optional>
                <input value={supplier} onChange={(e) => setSupplier(e.target.value)} maxLength={120} className={field} />
              </Label>
            </div>
          </div>
        )}

        {more ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Label text="Tag or serial no." optional>
              <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={60} className={field} />
            </Label>
            <Label text="Next service" optional>
              <input type="date" value={serviceDue} onChange={(e) => setServiceDue(e.target.value)} className={field} />
            </Label>
            {ownership === "owned" && (
              <div className="sm:col-span-2">
                <Label text="Bought from" optional>
                  <input value={supplier} onChange={(e) => setSupplier(e.target.value)} maxLength={120} className={field} />
                </Label>
              </div>
            )}
            <div className="sm:col-span-2">
              <Label text="Notes" optional>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} className={`${field} py-2`} />
              </Label>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setMore(true)} className="min-h-10 text-sm font-medium text-stone-600 underline">
            More details: serial no., service date, notes
          </button>
        )}

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
            {busy ? "Saving…" : item ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
