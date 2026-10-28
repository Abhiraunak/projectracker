/** The shapes the inventory screens get from the server. Everything belongs to one project. */

export type MovementType = "RECEIVED" | "ISSUED" | "RESERVED" | "RELEASED" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";

export interface MaterialRef {
  id: string;
  name: string;
  unit: string;
}

export interface Material extends MaterialRef {
  category: string;
  minStock: number;
  rate: number; // standard rate per unit, ₹ (for the BOQ material budget)
}

export type MaterialInput = Omit<Material, "id">;
export type VendorInput = Omit<Vendor, "id">;

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
}

/* ------------------------------ material plan ------------------------------ */

export interface PlanBoq {
  id: string;
  title: string;
  subtitle: string;
  status: "DRAFT" | "FINAL";
  updatedAt: string;
}

export interface ItemMaterial {
  materialId: string;
  material: MaterialRef;
  perUnit: number; // material per 1 unit of the BOQ item
  wastagePercent: number;
  required: number; // item quantity × per unit, plus wastage (0 for a removed item)
}

/** One priced part of one of the project's BOQs */
export interface BoqItem {
  id: string;
  boq: { id: string; title: string; subtitle: string } | null; // null: its BOQ was deleted
  sheetName: string;
  code: string;
  title: string;
  unit: string;
  quantity: number;
  active: boolean; // false: no longer in the BOQ
  noMaterials: boolean; // reviewed: labour only
  suggested: boolean; // materials filled in from a recipe by the sync: to be checked
  recipeName: string;
  materials: ItemMaterial[];
}

export interface SyncCounts {
  /** Priced parts of the linked BOQs not in the plan: they come in through Import from BOQ, never by a sync */
  notImported: number;
  changed: number;
  removed: number;
  unchanged: number;
}

export interface MaterialPlan {
  boqs: PlanBoq[];
  items: BoqItem[];
  sync: SyncCounts;
  summary: { items: number; withMaterials: number; labourOnly: number; toReview: number };
}

export interface SyncPreview extends SyncCounts {
  boqs: PlanBoq[];
  changedItems: { id: string; code: string; title: string; fields: string[]; from: { quantity: number; unit: string }; to: { quantity: number; unit: string } }[];
  removedItems: { id: string; code: string; title: string; hasStock: boolean }[];
}

export interface MaterialLineInput {
  materialId: string;
  perUnit: number;
  wastagePercent: number;
}

export interface ItemMaterialsInput {
  noMaterials: boolean;
  recipeName: string;
  lines: MaterialLineInput[];
}

export interface Recipe {
  id: string;
  name: string;
  unit: string;
  match: string[][];
  lines: (MaterialLineInput & { material: MaterialRef })[];
}

export type RecipeInput = Omit<Recipe, "id" | "lines"> & { lines: MaterialLineInput[] };

/* ---------------------------------- stock ---------------------------------- */

export interface ItemUse {
  item: { id: string; code: string; title: string; active: boolean };
  required: number;
  issued: number;
  reserved: number;
  remaining: number;
}

export interface InventoryItem {
  material: Material;
  required: number; // all BOQ items together
  issued: number; // used on site
  stillNeeded: number;
  onHand: number;
  reserved: number;
  available: number;
  ordered: number;
  incoming: number; // ordered, not yet received
  toOrder: number; // still needed beyond the store and what's on its way
  byItem: ItemUse[];
}

export interface StockMovement {
  id: string;
  material: MaterialRef;
  type: MovementType;
  quantity: number;
  boqItem: { id: string; code: string; title: string } | null;
  order: { id: string; reference: string } | null;
  note: string;
  createdAt: string;
  createdBy: string;
}

export interface MovementInput {
  materialId: string;
  type: MovementType;
  quantity: number;
  boqItemId: string | null;
  orderId: string | null;
  note: string;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/* ---------------------------------- orders --------------------------------- */

export interface MaterialOrder {
  id: string;
  material: MaterialRef;
  vendor: { id: string; name: string } | null;
  quantity: number;
  receivedQty: number;
  pendingQty: number;
  rate: number; // agreed price per unit, ₹
  value: number; // quantity × rate
  receivedValue: number;
  expectedDelivery: string | null; // YYYY-MM-DD
  reference: string;
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface OrderInput {
  vendorId: string | null;
  quantity: number;
  rate: number;
  expectedDelivery: string | null;
  reference: string;
  note: string;
}

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  RECEIVED: "Received",
  ISSUED: "Issued",
  RESERVED: "Reserved",
  RELEASED: "Released",
  ADJUSTMENT_IN: "Corrected up",
  ADJUSTMENT_OUT: "Corrected down",
};

/** Which entries take stock in and out of the store (reservations only set it aside) */
export const MOVEMENT_SIGN: Record<MovementType, 1 | -1 | 0> = {
  RECEIVED: 1,
  ADJUSTMENT_IN: 1,
  ISSUED: -1,
  ADJUSTMENT_OUT: -1,
  RESERVED: 0,
  RELEASED: 0,
};

export const NEEDS_ITEM: Record<MovementType, boolean> = {
  RECEIVED: false,
  ISSUED: true,
  RESERVED: true,
  RELEASED: true,
  ADJUSTMENT_IN: false,
  ADJUSTMENT_OUT: false,
};

/* ---------------------------------- cost ----------------------------------- */

export interface MaterialCost {
  material: MaterialRef;
  standardRate: number;
  required: number;
  budget: number; // BOQ need × standard rate
  ordered: number;
  orderedValue: number;
  received: number;
  spent: number; // value received
  estimated: number; // part of spent valued at the standard rate (deliveries without an order)
  averageRate: number | null;
  expected: number; // most likely final cost
  overBudget: boolean;
}

export interface MaterialCostReport {
  items: MaterialCost[];
  totals: { budget: number; orderedValue: number; spent: number; estimated: number; expected: number; missingRates: number };
}

/* --------------------------------- alerts ---------------------------------- */

export type AlertKind = "ORDER_MORE" | "LOW_STOCK" | "LATE_DELIVERY";

export interface StockAlert {
  id: string;
  kind: AlertKind;
  key: string;
  message: string;
  materialId: string | null;
  orderId: string | null;
  openedAt: string;
  project?: { id: string; title: string };
}

/* -------------------------------- requests --------------------------------- */

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "ISSUED" | "ORDERED";

export interface MaterialRequest {
  id: string;
  material: MaterialRef;
  boqItem: { id: string; code: string; title: string } | null;
  quantity: number;
  neededBy: string | null;
  note: string;
  status: RequestStatus;
  requestedBy: { id: string; email: string };
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string;
  order: { id: string; reference: string } | null;
  movementId: string | null;
  createdAt: string;
}

export interface RequestInput {
  materialId: string;
  boqItemId: string;
  quantity: number;
  neededBy: string | null;
  note: string;
}

/* ------------------------------ import from BOQ ------------------------------ */

/** this: linked to this project · free: no project yet (importing links it here) · other: belongs to another project */
export type BoqLink = "this" | "free" | "other";

export interface ImportableBoq {
  id: string;
  title: string;
  subtitle: string;
  boqNumber: string;
  status: "DRAFT" | "FINAL";
  itemCount: number;
  updatedAt: string;
  project: { id: string; title: string } | null;
  link: BoqLink;
  importedCount: number; // its items already in this project's plan
}

/** new: not in the plan · in: already in it · removed: was in it, marked removed (importing brings it back) */
export type ImportPartState = "new" | "in" | "removed";

export interface ImportPart {
  partKey: string;
  code: string;
  title: string;
  unit: string;
  quantity: number;
  state: ImportPartState;
  suggestion: string | null; // the recipe it would get
}

export interface ImportOutline {
  boq: { id: string; title: string; subtitle: string; status: "DRAFT" | "FINAL"; projectId: string | null; project: { id: string; title: string } | null; link: BoqLink };
  sheets: { name: string; sections: { code: string; title: string; items: { code: string; description: string; parts: ImportPart[] }[] }[] }[];
}

export interface ImportResult {
  imported: { added: number; restored: number; already: number; unknown: number; linked: boolean };
  plan: MaterialPlan;
}
