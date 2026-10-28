import { request } from "@/lib/api";
import type {
  MaterialCostReport, MaterialInput, MaterialRequest, RequestInput, StockAlert, VendorInput,
  BoqItem, InventoryItem, ItemMaterialsInput, Material, MaterialOrder, MaterialPlan, MovementInput, OrderInput,
  ImportableBoq, ImportOutline, ImportResult, Paged, Recipe, RecipeInput, StockMovement, SyncCounts, SyncPreview, Vendor,
} from "./types";

const json = (data: unknown) => JSON.stringify(data);
const qs = (params: Record<string, string | number | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q.set(k, String(v));
  return q.toString();
};

export const inventoryApi = {
  catalog: () => request<{ materials: Material[]; vendors: Vendor[] }>("/materials/catalog"),
  updateMaterial: (id: string, input: MaterialInput) =>
    request<{ material: Material }>(`/materials/${id}`, { method: "PUT", body: json(input) }).then((r) => r.material),
  updateVendor: (id: string, input: VendorInput) =>
    request<{ vendor: Vendor }>(`/materials/vendors/${id}`, { method: "PUT", body: json(input) }).then((r) => r.vendor),
  deleteVendor: (id: string) => request<void>(`/materials/vendors/${id}`, { method: "DELETE" }),
  addMaterial: (input: MaterialInput) =>
    request<{ material: Material }>("/materials", { method: "POST", body: json(input) }).then((r) => r.material),
  addVendor: (input: VendorInput) =>
    request<{ vendor: Vendor }>("/materials/vendors", { method: "POST", body: json(input) }).then((r) => r.vendor),

  plan: (projectId: string) => request<MaterialPlan>(`/projects/${projectId}/material-plan`),
  previewSync: (projectId: string) => request<SyncPreview>(`/projects/${projectId}/material-plan/sync`),
  applySync: (projectId: string) => request<{ applied: SyncCounts; plan: MaterialPlan }>(`/projects/${projectId}/material-plan/sync`, { method: "POST" }),
  importableBoqs: (projectId: string) => request<{ boqs: ImportableBoq[] }>(`/projects/${projectId}/material-plan/boqs`).then((r) => r.boqs),
  importOutline: (projectId: string, boqId: string) => request<ImportOutline>(`/projects/${projectId}/material-plan/boqs/${boqId}`),
  importFromBoq: (projectId: string, boqId: string, partKeys: string[]) =>
    request<ImportResult>(`/projects/${projectId}/material-plan/import`, { method: "POST", body: JSON.stringify({ boqId, partKeys }) }),
  saveItemMaterials: (itemId: string, input: ItemMaterialsInput) =>
    request<{ item: BoqItem }>(`/boq-items/${itemId}/materials`, { method: "PUT", body: json(input) }).then((r) => r.item),

  recipes: () => request<{ recipes: Recipe[] }>("/material-recipes").then((r) => r.recipes),
  createRecipe: (input: RecipeInput) => request<{ recipe: Recipe }>("/material-recipes", { method: "POST", body: json(input) }).then((r) => r.recipe),
  updateRecipe: (id: string, input: RecipeInput) => request<{ recipe: Recipe }>(`/material-recipes/${id}`, { method: "PUT", body: json(input) }).then((r) => r.recipe),
  deleteRecipe: (id: string) => request<void>(`/material-recipes/${id}`, { method: "DELETE" }),

  inventory: (projectId: string) => request<{ items: InventoryItem[] }>(`/projects/${projectId}/inventory`).then((r) => r.items),
  movements: (projectId: string, params: { materialId?: string; boqItemId?: string; page: number; pageSize: number }) =>
    request<Paged<StockMovement>>(`/projects/${projectId}/stock-movements?${qs(params)}`),
  recordMovement: (projectId: string, input: MovementInput) =>
    request<{ movement: StockMovement }>(`/projects/${projectId}/stock-movements`, { method: "POST", body: json(input) }).then((r) => r.movement),

  orders: (projectId: string) => request<{ orders: MaterialOrder[] }>(`/projects/${projectId}/orders`).then((r) => r.orders),
  createOrder: (projectId: string, input: OrderInput & { materialId: string }) =>
    request<{ order: MaterialOrder }>(`/projects/${projectId}/orders`, { method: "POST", body: json(input) }).then((r) => r.order),
  updateOrder: (id: string, input: OrderInput) => request<{ order: MaterialOrder }>(`/orders/${id}`, { method: "PATCH", body: json(input) }).then((r) => r.order),
  deleteOrder: (id: string) => request<void>(`/orders/${id}`, { method: "DELETE" }),

  cost: (projectId: string) => request<MaterialCostReport>(`/projects/${projectId}/material-cost`),

  alerts: (projectId: string) => request<{ alerts: StockAlert[] }>(`/projects/${projectId}/stock-alerts`).then((r) => r.alerts),
  allAlerts: () => request<{ alerts: StockAlert[] }>("/stock-alerts").then((r) => r.alerts),
  refreshAlerts: (projectId: string) => request<{ alerts: StockAlert[] }>(`/projects/${projectId}/stock-alerts/refresh`, { method: "POST" }).then((r) => r.alerts),

  requests: (projectId: string, status: "open" | "all") =>
    request<{ requests: MaterialRequest[] }>(`/projects/${projectId}/material-requests?status=${status}`).then((r) => r.requests),
  createRequest: (projectId: string, input: RequestInput) =>
    request<{ request: MaterialRequest }>(`/projects/${projectId}/material-requests`, { method: "POST", body: json(input) }).then((r) => r.request),
  decideRequest: (id: string, action: "approve" | "reject" | "cancel", note: string) =>
    request<{ request: MaterialRequest }>(`/material-requests/${id}/${action}`, { method: "POST", body: json({ note }) }).then((r) => r.request),
  issueRequest: (id: string, input: { quantity?: number; note: string }) =>
    request<{ request: MaterialRequest }>(`/material-requests/${id}/issue`, { method: "POST", body: json(input) }).then((r) => r.request),
  orderRequest: (id: string, input: { quantity?: number; rate: number; vendorId: string | null; expectedDelivery: string | null; reference: string }) =>
    request<{ request: MaterialRequest }>(`/material-requests/${id}/order`, { method: "POST", body: json(input) }).then((r) => r.request),
  pendingRequests: () => request<{ pending: number }>("/material-requests/pending-count").then((r) => r.pending),
};
