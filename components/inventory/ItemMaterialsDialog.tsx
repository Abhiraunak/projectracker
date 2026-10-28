"use client";

import React, { useMemo, useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { describeError } from "@/lib/api";
import { fmtQty, itemLabel, normalUnit, requiredFor } from "@/lib/inventory/figures";
import type { BoqItem, MaterialLineInput } from "@/lib/inventory/types";
import { useMaterialCatalog } from "@/hooks/useMaterialCatalog";
import { useRecipes, useSaveItemMaterials } from "@/hooks/useInventory";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { buttonPrimary, buttonSecondary, iconButton, inputBase } from "../utilites/Label";

interface Props {
  projectId: string;
  item: BoqItem | null;
  onClose: () => void;
}

/** Which materials one BOQ item needs, per unit of the item: from a recipe, typed in, or "labour only" */
export function ItemMaterialsDialog({ projectId, item, onClose }: Props) {
  return (
    <ModalDialog open={!!item} onClose={onClose} label="Materials for a BOQ item" size="lg">
      {item && <Body projectId={projectId} item={item} onClose={onClose} />}
    </ModalDialog>
  );
}

type Line = { materialId: string; perUnit: string; wastagePercent: string };
const toLine = (l: MaterialLineInput): Line => ({ materialId: l.materialId, perUnit: String(l.perUnit), wastagePercent: String(l.wastagePercent) });
const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

function Body({ projectId, item, onClose }: { projectId: string; item: BoqItem; onClose: () => void }) {
  const catalog = useMaterialCatalog();
  const recipes = useRecipes();
  const save = useSaveItemMaterials(projectId);

  const [noMaterials, setNoMaterials] = useState(item.noMaterials);
  const [recipeName, setRecipeName] = useState(item.recipeName);
  const [lines, setLines] = useState<Line[]>(() => item.materials.map(toLine));
  const [error, setError] = useState<string | null>(null);

  const materials = catalog.data?.materials ?? [];
  const unitOf = (id: string) => materials.find((m) => m.id === id)?.unit ?? "";

  // Recipes for this item's unit first: a recipe "per cum" makes no sense for an item measured in sqm
  const { fitting, other } = useMemo(() => {
    const all = recipes.data ?? [];
    const unit = normalUnit(item.unit);
    return { fitting: all.filter((r) => normalUnit(r.unit) === unit), other: all.filter((r) => normalUnit(r.unit) !== unit) };
  }, [recipes.data, item.unit]);

  const applyRecipe = (id: string) => {
    const recipe = recipes.data?.find((r) => r.id === id);
    if (!recipe) return;
    setLines(recipe.lines.map(toLine));
    setRecipeName(recipe.name);
    setNoMaterials(false);
  };

  const change = (i: number, patch: Partial<Line>) => setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const clean = lines.filter((l) => l.materialId);
    if (!noMaterials) {
      if (clean.length === 0) return setError("Add at least one material, or tick Labour only.");
      if (clean.some((l) => !(num(l.perUnit) >= 0) || !(num(l.wastagePercent || "0") >= 0))) return setError("Every material needs a quantity per unit (0 or more).");
      if (new Set(clean.map((l) => l.materialId)).size !== clean.length) return setError("A material is listed twice.");
    }
    try {
      await save.mutateAsync({
        itemId: item.id,
        input: {
          noMaterials,
          recipeName,
          lines: noMaterials ? [] : clean.map((l) => ({ materialId: l.materialId, perUnit: num(l.perUnit), wastagePercent: num(l.wastagePercent || "0") })),
        },
      });
      onClose();
    } catch (err) {
      setError(describeError(err));
    }
  };

  return (
    <form onSubmit={submit}>
      <DialogHeader title="Materials for this item" subtitle={`${itemLabel(item)} · ${fmtQty(item.quantity)} ${item.unit}`} onClose={onClose} locked={save.isPending} />
      <div className="space-y-5 p-4 sm:p-5">
        <label className="flex cursor-pointer items-start gap-3 rounded border border-stone-300 p-3">
          <input type="checkbox" checked={noMaterials} onChange={(e) => setNoMaterials(e.target.checked)} className="mt-0.5 h-4 w-4 accent-stone-900" />
          <span>
            <span className="block text-sm font-medium">Labour only</span>
            <span className="block text-xs text-stone-500">This item uses no stored materials (earthwork, shuttering, carriage…).</span>
          </span>
        </label>

        {!noMaterials && (
          <>
            <div>
              <label htmlFor="recipe" className="mb-1.5 block text-sm text-stone-500">
                Fill in from a recipe
              </label>
              <select id="recipe" value="" onChange={(e) => applyRecipe(e.target.value)} className={inputBase} disabled={recipes.isPending}>
                <option value="">{recipes.isPending ? "Loading recipes…" : "Choose a recipe…"}</option>
                {fitting.length > 0 && (
                  <optgroup label={`Per ${item.unit}`}>
                    {fitting.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </optgroup>
                )}
                {other.length > 0 && (
                  <optgroup label="Other units">
                    {other.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} (per {r.unit})</option>
                    ))}
                  </optgroup>
                )}
              </select>
              <p className="mt-1 text-xs text-stone-500">Recipes are typical figures: adjust them to your SOR&rsquo;s analysis of rates.</p>
            </div>

            <div className="space-y-2">
              <div className="hidden grid-cols-[minmax(0,1fr)_7rem_5.5rem_7rem_2.5rem] gap-2 text-xs text-stone-500 sm:grid">
                <span>Material</span>
                <span>Per {item.unit || "unit"}</span>
                <span>Wastage %</span>
                <span className="text-right">Needed</span>
                <span />
              </div>
              {lines.map((line, i) => {
                const per = num(line.perUnit);
                const needed = per >= 0 ? requiredFor(item.quantity, per, num(line.wastagePercent || "0") || 0) : null;
                return (
                  <div key={i} className="grid grid-cols-2 gap-2 rounded border border-stone-200 p-2 sm:grid-cols-[minmax(0,1fr)_7rem_5.5rem_7rem_2.5rem] sm:items-center sm:border-0 sm:p-0">
                    <select aria-label="Material" value={line.materialId} onChange={(e) => change(i, { materialId: e.target.value })} className={`${inputBase} col-span-2 sm:col-span-1`}>
                      <option value="">Choose…</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                      ))}
                    </select>
                    <input aria-label={`Per ${item.unit}`} inputMode="decimal" value={line.perUnit} onChange={(e) => change(i, { perUnit: e.target.value })} className={`${inputBase} tabular-nums`} placeholder="0" />
                    <input aria-label="Wastage percent" inputMode="decimal" value={line.wastagePercent} onChange={(e) => change(i, { wastagePercent: e.target.value })} className={`${inputBase} tabular-nums`} placeholder="0" />
                    <span className="self-center text-right text-sm tabular-nums">
                      {needed === null ? "—" : `${fmtQty(needed)} ${unitOf(line.materialId)}`}
                    </span>
                    <button type="button" onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))} aria-label="Remove material" className={`${iconButton} justify-self-end`}>
                      <FiTrash2 aria-hidden />
                    </button>
                  </div>
                );
              })}
              <button type="button" onClick={() => setLines((prev) => [...prev, { materialId: "", perUnit: "", wastagePercent: "0" }])} className="flex items-center gap-1 text-sm font-medium text-stone-700 hover:text-stone-900">
                <FiPlus aria-hidden /> Add material
              </button>
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={save.isPending} className={buttonSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={save.isPending} className={buttonPrimary}>
            {save.isPending ? "Saving…" : "Save materials"}
          </button>
        </div>
      </div>
    </form>
  );
}
