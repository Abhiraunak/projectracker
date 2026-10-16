import { formatQty } from "./format";
import { pendingQty, totalRequired } from "./procurement";
import type { InventoryItem, Material, MovementInput, MovementType, Requirement, StockMovement, StockStatus, WorkItemRef } from "./types";

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/* ---------------------------- the movement types --------------------------- */

export interface MovementRule {
  label: string;
  help: string;
  needsTask: boolean;
  /** how it changes the figures: used for the +/- shown in history */
  direction: "in" | "out" | "neutral";
}

/** One table drives the form, the validation and the history, so they can't drift apart */
export const MOVEMENT_RULES: Record<MovementType, MovementRule> = {
  RECEIVED: { label: "Stock received", help: "Material delivered to the store.", needsTask: false, direction: "in" },
  ISSUED: { label: "Issued to work item", help: "Material taken from the store and used on a work item.", needsTask: true, direction: "out" },
  RESERVED: { label: "Reserve for work item", help: "Set material aside for an upcoming work item.", needsTask: true, direction: "neutral" },
  RELEASED: { label: "Release reservation", help: "Free material that was reserved for a work item.", needsTask: true, direction: "neutral" },
  ADJUSTMENT_IN: { label: "Correction: add stock", help: "Fix a count that was too low. A note is required.", needsTask: false, direction: "in" },
  ADJUSTMENT_OUT: { label: "Correction: remove stock", help: "Fix a count that was too high, or record loss or damage. A note is required.", needsTask: false, direction: "out" },
};

export const requiresNote = (type: MovementType) => type === "ADJUSTMENT_IN" || type === "ADJUSTMENT_OUT";

/* ------------------------------- replaying log ----------------------------- */

interface Levels {
  onHand: number;
  consumed: number;
  consumedByTask: Map<string, number>;
  reservedByTask: Map<string, { task: WorkItemRef; quantity: number }>;
}

const emptyLevels = (): Levels => ({ onHand: 0, consumed: 0, consumedByTask: new Map(), reservedByTask: new Map() });

function applyMovement(levels: Levels, m: StockMovement) {
  const task = m.task;
  switch (m.type) {
    case "RECEIVED":
    case "ADJUSTMENT_IN":
      levels.onHand += m.quantity;
      break;
    case "ADJUSTMENT_OUT":
      levels.onHand -= m.quantity;
      break;
    case "ISSUED": {
      levels.onHand -= m.quantity;
      levels.consumed += m.quantity;
      if (!task) break;
      levels.consumedByTask.set(task.id, (levels.consumedByTask.get(task.id) ?? 0) + m.quantity);
      // Using material that was reserved for this work item uses up the reservation
      const reserved = levels.reservedByTask.get(task.id);
      if (reserved) {
        reserved.quantity -= Math.min(reserved.quantity, m.quantity);
        if (reserved.quantity <= 0) levels.reservedByTask.delete(task.id);
      }
      break;
    }
    case "RESERVED":
      if (task) {
        const existing = levels.reservedByTask.get(task.id);
        if (existing) existing.quantity += m.quantity;
        else levels.reservedByTask.set(task.id, { task, quantity: m.quantity });
      }
      break;
    case "RELEASED": {
      const reserved = task && levels.reservedByTask.get(task.id);
      if (task && reserved) {
        reserved.quantity -= Math.min(reserved.quantity, m.quantity);
        if (reserved.quantity <= 0) levels.reservedByTask.delete(task.id);
      }
      break;
    }
  }
}

function replayMovements(movements: StockMovement[]): Map<string, Levels> {
  const byMaterial = new Map<string, Levels>();
  const oldestFirst = [...movements].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  for (const m of oldestFirst) {
    const levels = byMaterial.get(m.material.id) ?? emptyLevels();
    applyMovement(levels, m);
    byMaterial.set(m.material.id, levels);
  }
  return byMaterial;
}

/* --------------------------- the figures per material ---------------------- */

function toInventoryItem(material: Material, levels: Levels, requirements: Requirement[]): InventoryItem {
  const own = requirements.filter((r) => r.material.id === material.id);

  // What the project still needs: each requirement's total, minus what its own work item already used
  const stillNeeded = own.reduce((sum, r) => sum + Math.max(0, totalRequired(r) - (levels.consumedByTask.get(r.task.id) ?? 0)), 0);
  const incoming = own.reduce((sum, r) => sum + pendingQty(r), 0);
  const reservedByTask = [...levels.reservedByTask.values()].map(({ task, quantity }) => ({ task, quantity: round3(quantity) }));
  const reserved = reservedByTask.reduce((sum, r) => sum + r.quantity, 0);

  return {
    material,
    onHand: round3(levels.onHand),
    reserved: round3(reserved),
    available: round3(levels.onHand - reserved),
    consumed: round3(levels.consumed),
    stillNeeded: round3(stillNeeded),
    incoming: round3(incoming),
    shortage: round3(Math.max(0, stillNeeded - (levels.onHand + incoming))),
    reservedByTask,
  };
}

export const emptyInventoryItem = (material: Material): InventoryItem =>
  toInventoryItem(material, emptyLevels(), []);

/** Every material that has stock activity or a requirement */
export function buildInventory(materials: Material[], movements: StockMovement[], requirements: Requirement[]): InventoryItem[] {
  const levels = replayMovements(movements);
  const active = new Set([...levels.keys(), ...requirements.map((r) => r.material.id)]);
  return materials
    .filter((material) => active.has(material.id))
    .map((material) => toInventoryItem(material, levels.get(material.id) ?? emptyLevels(), requirements));
}

/** Red = the project will run short. Yellow = enough for now but at or under the reorder level. */
export function stockStatus(item: InventoryItem): StockStatus {
  if (item.shortage > 0) return "shortage";
  if (item.onHand <= item.material.minStock) return "low";
  return "ok";
}

export const summarizeInventory = (items: InventoryItem[]) => ({
  tracked: items.length,
  shortages: items.filter((i) => stockStatus(i) === "shortage").length,
  low: items.filter((i) => stockStatus(i) === "low").length,
  withReservations: items.filter((i) => i.reserved > 0).length,
});

/* -------------------------------- validation ------------------------------- */

/**
 * The rules a stock entry must follow. Returns a message, or null if it is fine.
 * The server enforces the same rules: stock can never go below zero.
 */
export function validateMovement(item: InventoryItem, input: MovementInput): string | null {
  const unit = item.material.unit;
  const rule = MOVEMENT_RULES[input.type];

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) return "Enter a quantity greater than zero.";
  if (rule.needsTask && !input.taskId) return "Choose the work item.";
  if (requiresNote(input.type) && input.note.trim().length < 3) return "Add a short note explaining the correction.";

  switch (input.type) {
    case "ISSUED":
    case "ADJUSTMENT_OUT":
      return input.quantity > item.onHand ? `Only ${formatQty(item.onHand, unit)} is in the store.` : null;
    case "RESERVED":
      return input.quantity > item.available ? `Only ${formatQty(item.available, unit)} is available to reserve.` : null;
    case "RELEASED": {
      const reserved = item.reservedByTask.find((r) => r.task.id === input.taskId)?.quantity ?? 0;
      return input.quantity > reserved ? `Only ${formatQty(reserved, unit)} is reserved for that work item.` : null;
    }
    default:
      return null;
  }
}

const URGENCY: Record<StockStatus, number> = { shortage: 0, low: 1, ok: 2 };

/** Shortages first, then low stock, then the rest (each group A to Z) */
export const sortByUrgency = (items: InventoryItem[]) =>
  [...items].sort((a, b) => URGENCY[stockStatus(a)] - URGENCY[stockStatus(b)] || a.material.name.localeCompare(b.material.name));
