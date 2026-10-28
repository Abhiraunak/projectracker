"use client";

import React, { useState } from "react";
import { FiChevronDown, FiChevronRight, FiPlus } from "react-icons/fi";
import { MOVEMENT_PERMISSION } from "@/lib/access/types";
import { fmtQty, itemLabel, stockState, usedShare } from "@/lib/inventory/figures";
import type { BoqItem, InventoryItem } from "@/lib/inventory/types";
import { useAccess } from "@/hooks/useProjectAccess";
import { useInventory } from "@/hooks/useInventory";
import { QueryError } from "@/components/materials/QueryError";
import { StatCard } from "@/components/materials/StatCard";
import { buttonPrimary } from "../utilites/Label";
import { MovementDialog, type MovementPreset } from "./MovementDialog";
import { StockStatePill } from "./StatePills";

const COLUMNS = ["Needed (BOQ)", "Used", "Still needed", "In store", "Available", "On order", "To order"];

function UsedBar({ item }: { item: InventoryItem }) {
  const share = usedShare(item);
  return (
    <div className="mt-1 h-1 w-full overflow-hidden rounded bg-stone-200" role="progressbar" aria-label={`${item.material.name} used`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}>
      <div className="h-full bg-stone-900" style={{ width: `${share * 100}%` }} />
    </div>
  );
}

/** Per BOQ item: what it needs of this material, what it has used, reserved and still has to get */
function ByItem({ item }: { item: InventoryItem }) {
  if (item.byItem.length === 0) return <p className="px-4 py-3 text-xs text-stone-500">No BOQ item needs or has used this material.</p>;
  const u = item.material.unit;
  return (
    <ul className="divide-y divide-stone-100 bg-stone-50/60 text-xs">
      {item.byItem.map((use) => (
        <li key={use.item.id} className="grid grid-cols-2 gap-2 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_repeat(4,7rem)]">
          <span className={`col-span-2 sm:col-span-1 ${use.item.active ? "" : "text-stone-500 line-through"}`}>{itemLabel(use.item)}</span>
          <span className="tabular-nums">Needs {fmtQty(use.required)} {u}</span>
          <span className="tabular-nums">Used {fmtQty(use.issued)}</span>
          <span className="tabular-nums">Reserved {fmtQty(use.reserved)}</span>
          <span className="tabular-nums font-medium">Left {fmtQty(use.remaining)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Every material the project's BOQ needs, ordered or holds: needed, used, in store, on order and what to order */
export function StockTable({ projectId, items }: { projectId: string; items: BoqItem[] }) {
  const stock = useInventory(projectId);
  const access = useAccess();
  const [open, setOpen] = useState<string | null>(null);
  const [dialog, setDialog] = useState<MovementPreset | null>(null);
  const canRecord = Object.values(MOVEMENT_PERMISSION).some((p) => access.can(p));

  if (stock.isPending) return <div aria-busy="true" className="h-64 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />;
  if (stock.isError) return <QueryError error={stock.error} onRetry={() => stock.refetch()} />;
  const list = stock.data;
  const toOrder = list.filter((i) => i.toOrder > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Materials" value={String(list.length)} note="Needed by the BOQ or in stock" />
        <StatCard title="To order" value={String(toOrder.length)} note={toOrder.length ? toOrder.slice(0, 2).map((i) => i.material.name).join(", ") : "Everything is covered"} />
        <StatCard title="On order" value={String(list.filter((i) => i.incoming > 0).length)} note="Deliveries still to come" />
        <StatCard title="Fully used" value={String(list.filter((i) => stockState(i) === "done").length)} note="Nothing more needed" />
      </div>

      {canRecord && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setDialog({})} className={buttonPrimary}>
            <FiPlus aria-hidden /> Record stock
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <p className="rounded border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
          No materials yet. Set materials on the BOQ items, or record a delivery.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-stone-300">
          <table className="w-full min-w-240 text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold text-stone-500">
                <th scope="col" className="px-4 py-2.5">Material</th>
                {COLUMNS.map((c) => (
                  <th key={c} scope="col" className="px-3 py-2.5 text-right">{c}</th>
                ))}
                <th scope="col" className="px-3 py-2.5">Status</th>
                <th scope="col" className="px-3 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            {list.map((item) => {
              const expanded = open === item.material.id;
              const u = item.material.unit;
              return (
                <tbody key={item.material.id} className="border-b border-stone-200 last:border-0">
                  <tr className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setOpen(expanded ? null : item.material.id)} aria-expanded={expanded} className="flex items-start gap-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                        {expanded ? <FiChevronDown aria-hidden className="mt-0.5 shrink-0" /> : <FiChevronRight aria-hidden className="mt-0.5 shrink-0" />}
                        <span>
                          <span className="block font-semibold">{item.material.name}</span>
                          <span className="block text-xs text-stone-500">{u} · {item.material.category}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmtQty(item.required)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {fmtQty(item.issued)}
                      <UsedBar item={item} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmtQty(item.stillNeeded)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{fmtQty(item.onHand)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmtQty(item.available)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmtQty(item.incoming)}</td>
                    <td className={`px-3 py-3 text-right tabular-nums ${item.toOrder > 0 ? "font-semibold text-red-700" : ""}`}>{fmtQty(item.toOrder)}</td>
                    <td className="px-3 py-3"><StockStatePill state={stockState(item)} /></td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      {access.can("stock.receive") && (
                        <button type="button" onClick={() => setDialog({ type: "RECEIVED", materialId: item.material.id })} className="rounded px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100">Receive</button>
                      )}
                      {access.can("stock.issue") && (
                        <button type="button" onClick={() => setDialog({ type: "ISSUED", materialId: item.material.id })} className="rounded px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100">Issue</button>
                      )}
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={COLUMNS.length + 3} className="p-0"><ByItem item={item} /></td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
      <p className="text-xs text-stone-500">
        Needed = BOQ quantity × the item&rsquo;s recipe, wastage included. To order = still needed, minus what&rsquo;s in the store and on order. Open a material to see each BOQ item.
      </p>

      <MovementDialog projectId={projectId} open={!!dialog} preset={dialog ?? {}} stock={list} items={items} onClose={() => setDialog(null)} />
    </div>
  );
}
