export interface Material {
  id: string;
  name: string;
  unit: string; // bag, kg, m3, nos...
  category: string;
  minStock: number; // below this the store is "low"
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
}

/** A task of the project (what the rest of the app calls a work item) */
export interface WorkItemRef {
  id: string;
  name: string;
}

/* ------------------------------ procurement ------------------------------ */

export interface Requirement {
  id: string;
  task: WorkItemRef;
  material: Material;
  requiredQty: number; // from the BOQ or estimate, before wastage
  wastagePercent: number;
  vendor: Vendor | null;
  orderedQty: number;
  receivedQty: number;
  expectedDelivery: string | null; // YYYY-MM-DD
  requested: boolean; // a request is raised and waiting for approval
}

export type ProcurementStatus = "not_ordered" | "requested" | "ordered" | "partly_delivered" | "delivered";

export interface RequirementInput {
  taskId: string;
  taskName?: string; // only the mock needs this; the real server looks the task up itself
  materialId: string;
  requiredQty: number;
  wastagePercent: number;
}

export interface OrderUpdate {
  vendorId: string | null;
  orderedQty: number;
  expectedDelivery: string | null;
  requested: boolean;
}

/* -------------------------------- inventory ------------------------------- */

export type MovementType = "RECEIVED" | "ISSUED" | "RESERVED" | "RELEASED" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";

export interface StockMovement {
  id: string;
  material: Pick<Material, "id" | "name" | "unit">;
  type: MovementType;
  quantity: number; // always positive; the type says which way it goes
  task: WorkItemRef | null;
  requirementId: string | null;
  note: string;
  createdAt: string;
  createdBy: string;
}

export interface MovementInput {
  materialId: string;
  type: MovementType;
  quantity: number;
  taskId: string | null;
  taskName?: string; // mock only
  requirementId: string | null;
  note: string;
}

export interface MovementQuery {
  materialId?: string;
  page: number;
  pageSize: number;
}

export interface MovementPage {
  items: StockMovement[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface InventoryItem {
  material: Material;
  onHand: number; // physically in the store
  reserved: number; // set aside for specific work items
  available: number; // onHand - reserved
  consumed: number; // issued to work, all time
  stillNeeded: number; // what the project's requirements still need
  incoming: number; // ordered but not delivered yet
  shortage: number; // stillNeeded - (onHand + incoming), never below 0
  reservedByTask: { task: WorkItemRef; quantity: number }[];
}

export type StockStatus = "ok" | "low" | "shortage";

/* ------------------------------ API contracts ----------------------------- */

export interface ProcurementApi {
  catalog(): Promise<{ materials: Material[]; vendors: Vendor[] }>;
  listRequirements(projectId: string): Promise<Requirement[]>;
  createRequirement(projectId: string, input: RequirementInput): Promise<Requirement>;
  updateOrder(requirementId: string, update: OrderUpdate): Promise<Requirement>;
  deleteRequirement(requirementId: string): Promise<void>;
}

export interface InventoryApi {
  listInventory(projectId: string): Promise<InventoryItem[]>;
  listMovements(projectId: string, query: MovementQuery): Promise<MovementPage>;
  recordMovement(projectId: string, input: MovementInput): Promise<StockMovement>;
}