"use client";

import React, { useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { describeError } from "@/lib/api";
import type { Recipe } from "@/lib/inventory/types";
import { useMaterialCatalog } from "@/hooks/useMaterialCatalog";
import { useDeleteRecipe, useRecipes, useSaveRecipe } from "@/hooks/useInventory";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { Field } from "@/components/materials/Field";
import { buttonPrimary, buttonSecondary, iconButton, inputBase } from "../utilites/Label";

/** "1:2:4; m15, concrete" <-> [["1:2:4"], ["m15", "concrete"]]: groups split by ";", words in a group by "," */
const matchToText = (match: string[][]) => match.map((g) => g.join(", ")).join("; ");
const textToMatch = (text: string) =>
  text.split(";").map((g) => g.split(",").map((w) => w.trim()).filter(Boolean)).filter((g) => g.length > 0);

type Line = { materialId: string; perUnit: string; wastagePercent: string };

/** The company's recipes: which materials one unit of a kind of BOQ item needs. Used when syncing and editing items. */
export function RecipesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ModalDialog open={open} onClose={onClose} label="Recipes" size="xl">
      {open && <Body onClose={onClose} />}
    </ModalDialog>
  );
}

function Body({ onClose }: { onClose: () => void }) {
  const recipes = useRecipes();
  const [editing, setEditing] = useState<Recipe | "new" | null>(null);

  return (
    <div>
      <DialogHeader title="Recipes" subtitle="Materials per unit of a kind of BOQ item. Changing one doesn't change items already set." onClose={onClose} />
      <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="space-y-2">
          <button type="button" onClick={() => setEditing("new")} className={`${buttonSecondary} w-full justify-center`}>
            <FiPlus aria-hidden /> New recipe
          </button>
          <ul className="max-h-[55dvh] divide-y divide-stone-200 overflow-y-auto rounded border border-stone-300 text-sm">
            {(recipes.data ?? []).map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setEditing(r)}
                  className={`block w-full px-3 py-2 text-left hover:bg-stone-50 ${editing !== "new" && editing?.id === r.id ? "bg-stone-100 font-medium" : ""}`}
                >
                  {r.name}
                  <span className="block text-xs text-stone-500">per {r.unit} · {r.lines.length} {r.lines.length === 1 ? "material" : "materials"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          {editing ? (
            <RecipeForm key={editing === "new" ? "new" : editing.id} recipe={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
          ) : (
            <p className="rounded border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">Choose a recipe to edit, or make a new one.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RecipeForm({ recipe, onDone }: { recipe: Recipe | null; onDone: () => void }) {
  const catalog = useMaterialCatalog();
  const save = useSaveRecipe();
  const remove = useDeleteRecipe();
  const [name, setName] = useState(recipe?.name ?? "");
  const [unit, setUnit] = useState(recipe?.unit ?? "cum");
  const [match, setMatch] = useState(recipe ? matchToText(recipe.match) : "");
  const [lines, setLines] = useState<Line[]>(recipe?.lines.map((l) => ({ materialId: l.materialId, perUnit: String(l.perUnit), wastagePercent: String(l.wastagePercent) })) ?? [{ materialId: "", perUnit: "", wastagePercent: "0" }]);
  const [error, setError] = useState<string | null>(null);
  const change = (i: number, patch: Partial<Line>) => setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const groups = textToMatch(match);
    const clean = lines.filter((l) => l.materialId);
    if (!name.trim() || !unit.trim()) return setError("Give the recipe a name and a unit.");
    if (groups.length === 0) return setError("Add at least one word to match, for example 1:2:4.");
    if (clean.length === 0 || clean.some((l) => !(Number(l.perUnit) >= 0) || l.perUnit.trim() === "")) return setError("Every material needs a quantity per unit.");
    try {
      await save.mutateAsync({ id: recipe?.id, input: { name: name.trim(), unit: unit.trim(), match: groups, lines: clean.map((l) => ({ materialId: l.materialId, perUnit: Number(l.perUnit), wastagePercent: Number(l.wastagePercent || "0") })) } });
      onDone();
    } catch (err) {
      setError(describeError(err));
    }
  };

  const del = async () => {
    if (!recipe) return;
    try {
      await remove.mutateAsync(recipe.id);
      onDone();
    } catch (err) {
      setError(describeError(err));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <Field id="r-name" label="Name">
          <input id="r-name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={inputBase} placeholder="e.g. Concrete 1:2:4 (M15)" />
        </Field>
        <Field id="r-unit" label="Per BOQ unit">
          <input id="r-unit" maxLength={20} value={unit} onChange={(e) => setUnit(e.target.value)} className={inputBase} placeholder="cum" />
        </Field>
      </div>
      <Field id="r-match" label="Matches BOQ items containing" hint="Words separated by commas must all appear; separate alternatives with ; (e.g. 1:2:4; m15)">
        <input id="r-match" value={match} onChange={(e) => setMatch(e.target.value)} className={inputBase} />
      </Field>
      <div className="space-y-2">
        <p className="text-sm text-stone-500">Materials per 1 {unit || "unit"}</p>
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_6rem_5rem_2.5rem] gap-2">
            <select aria-label="Material" value={line.materialId} onChange={(e) => change(i, { materialId: e.target.value })} className={inputBase}>
              <option value="">Choose…</option>
              {(catalog.data?.materials ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
              ))}
            </select>
            <input aria-label="Per unit" inputMode="decimal" value={line.perUnit} onChange={(e) => change(i, { perUnit: e.target.value })} className={`${inputBase} tabular-nums`} placeholder="qty" />
            <input aria-label="Wastage percent" inputMode="decimal" value={line.wastagePercent} onChange={(e) => change(i, { wastagePercent: e.target.value })} className={`${inputBase} tabular-nums`} placeholder="%" />
            <button type="button" onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))} aria-label="Remove material" className={iconButton}>
              <FiTrash2 aria-hidden />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setLines((prev) => [...prev, { materialId: "", perUnit: "", wastagePercent: "0" }])} className="flex items-center gap-1 text-sm font-medium text-stone-700 hover:text-stone-900">
          <FiPlus aria-hidden /> Add material
        </button>
      </div>
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        {recipe ? (
          <button type="button" onClick={del} disabled={remove.isPending} className="rounded px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
            Delete recipe
          </button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" onClick={onDone} className={buttonSecondary}>Cancel</button>
          <button type="submit" disabled={save.isPending} className={buttonPrimary}>{save.isPending ? "Saving…" : "Save recipe"}</button>
        </div>
      </div>
    </form>
  );
}
