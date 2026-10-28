"use client";

import React, { useMemo, useState } from "react";
import { FiEdit2 } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { fmtQty, itemState, type ItemState } from "@/lib/inventory/figures";
import type { BoqItem, MaterialPlan } from "@/lib/inventory/types";
import { StatCard } from "@/components/materials/StatCard";
import { iconButton } from "../utilites/Label";
import { ItemMaterialsDialog } from "./ItemMaterialsDialog";
import { ItemStatePill } from "./StatePills";

type Filter = "all" | "todo" | "set" | "labour" | "removed";
const FILTERS: { id: Filter; label: string; test: (s: ItemState) => boolean }[] = [
  { id: "all", label: "All", test: (s) => s !== "removed" },
  { id: "todo", label: "To check", test: (s) => s === "review" || s === "suggested" },
  { id: "set", label: "Materials set", test: (s) => s === "set" },
  { id: "labour", label: "Labour only", test: (s) => s === "labour" },
  { id: "removed", label: "Removed", test: (s) => s === "removed" },
];

/** Every BOQ item of the project with the materials it needs. Items to check come first under "To check". */
export function MaterialPlanList({ projectId, plan }: { projectId: string; plan: MaterialPlan }) {
  const canEdit = useCan("requirements.create");
  const [filter, setFilter] = useState<Filter>(plan.summary.toReview > 0 ? "todo" : "all");
  const [editing, setEditing] = useState<BoqItem | null>(null);

  const shown = useMemo(() => {
    const test = FILTERS.find((f) => f.id === filter)!.test;
    return plan.items.filter((i) => test(itemState(i)));
  }, [plan.items, filter]);

  // Group by BOQ, then works sheet, in the BOQ's own order
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: BoqItem[] }>();
    for (const item of shown) {
      const key = `${item.boq?.id ?? "none"}|${item.sheetName}`;
      const label = [item.boq?.title || (item.boq ? "Untitled BOQ" : "Deleted BOQ"), item.sheetName].filter(Boolean).join(" · ");
      const g = map.get(key) ?? { label, items: [] };
      g.items.push(item);
      map.set(key, g);
    }
    return [...map.values()];
  }, [shown]);

  if (plan.items.length === 0) {
    return plan.boqs.length === 0 ? null : (
      <p className="rounded border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
        No items in inventory yet. Press <span className="font-medium">Import from BOQ</span> and tick the sections or items to track.
      </p>
    );
  }

  const s = plan.summary;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="BOQ items" value={String(s.items)} note="Imported from the BOQ" />
        <StatCard title="With materials" value={String(s.withMaterials)} note="Counted in stock needs" />
        <StatCard title="Labour only" value={String(s.labourOnly)} note="Earthwork, shuttering…" />
        <StatCard title="To check" value={String(s.toReview)} note="Suggested or not set yet" />
      </div>

      <div role="radiogroup" aria-label="Show" className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              filter === f.id ? "bg-stone-900 text-white" : "border border-stone-300 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="rounded border border-stone-300 p-6 text-center text-sm text-stone-500">Nothing here.</p>}

      {groups.map((group) => (
        <section key={group.label} aria-label={group.label} className="rounded border border-stone-300">
          <h3 className="border-b border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold">{group.label}</h3>
          <ul className="divide-y divide-stone-200">
            {group.items.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-start">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {item.code && <span className="mr-1.5 font-semibold">{item.code}</span>}
                    <span className={item.active ? "" : "text-stone-500 line-through"}>{item.title}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {fmtQty(item.quantity)} {item.unit}
                    {item.recipeName && ` · ${item.recipeName}`}
                  </p>
                </div>
                <div className="flex min-w-0 flex-wrap gap-1.5 md:w-[42%]">
                  {item.materials.map((m) => (
                    <span key={m.materialId} className="rounded border border-stone-200 px-2 py-1 text-xs text-stone-700">
                      {m.material.name}: <span className="font-semibold tabular-nums">{fmtQty(m.required)}</span> {m.material.unit}
                    </span>
                  ))}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <ItemStatePill state={itemState(item)} />
                  {canEdit && item.active && (
                    <button type="button" onClick={() => setEditing(item)} aria-label={`Edit materials for ${item.code} ${item.title}`} className={iconButton}>
                      <FiEdit2 aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <ItemMaterialsDialog projectId={projectId} item={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
