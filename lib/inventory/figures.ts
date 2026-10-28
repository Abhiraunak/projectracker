import type { BoqItem, InventoryItem } from "./types";

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Item quantity × per unit, plus wastage (the same sum the server does) */
export const requiredFor = (itemQuantity: number, perUnit: number, wastagePercent: number) => round3(itemQuantity * perUnit * (1 + wastagePercent / 100));

export type ItemState = "removed" | "review" | "suggested" | "labour" | "set";

/** Where an item stands in the plan: what someone has to look at first */
export function itemState(item: BoqItem): ItemState {
  if (!item.active) return "removed";
  if (item.noMaterials) return "labour";
  if (item.materials.length === 0) return "review";
  if (item.suggested) return "suggested";
  return "set";
}

export type StockState = "order" | "low" | "ok" | "done";

/** One material at a glance: must order more, running low in the store, fine, or nothing more needed */
export function stockState(item: InventoryItem): StockState {
  if (item.toOrder > 0) return "order";
  if (item.stillNeeded <= 0) return "done";
  if (item.onHand <= item.material.minStock && item.onHand < item.stillNeeded) return "low";
  return "ok";
}

/** Share used, 0 to 1 (for the progress bar) */
export const usedShare = (item: Pick<InventoryItem, "issued" | "required">) => (item.required > 0 ? Math.min(1, item.issued / item.required) : 0);

/** "5.3.9 RCC footing" */
export const itemLabel = (i: { code: string; title: string }) => [i.code, i.title].filter(Boolean).join(" ") || "BOQ item";

/** Items that need this material first (most still to issue), then the rest of the active items */
export function itemsForMaterial(items: BoqItem[], materialId: string) {
  const active = items.filter((i) => i.active);
  const needing = active.filter((i) => i.materials.some((m) => m.materialId === materialId));
  return { needing, others: active.filter((i) => !needing.includes(i)) };
}

export const fmtQty = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 3 });

/** cum, cu.m, m3 and m³ are one unit; so are sqm and m2; MT, t and tonne (the same table as the server) */
const UNIT_ALIASES: Record<string, string> = {
  cum: "m3", "cu.m": "m3", "cu m": "m3", "m³": "m3", m3: "m3",
  sqm: "m2", "sq.m": "m2", "sq m": "m2", "m²": "m2", m2: "m2",
  mt: "t", t: "t", tonne: "t", ton: "t", tonnes: "t",
  kg: "kg", kgs: "kg", rm: "m", rmt: "m", m: "m", nos: "nos", no: "nos", "no.": "nos", each: "nos",
};
export const normalUnit = (unit: string) => {
  const u = unit.toLowerCase().replace(/\s+/g, " ").trim();
  return UNIT_ALIASES[u] ?? u;
};
