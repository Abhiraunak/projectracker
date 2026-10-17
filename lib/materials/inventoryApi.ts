import { request } from "@/lib/api";
import type { InventoryApi, InventoryItem, MovementPage, StockMovement } from "./types";

export const inventoryApi: InventoryApi = {
  listInventory: (projectId) =>
    request<{ items: InventoryItem[] }>(`/projects/${projectId}/inventory`).then((r) => r.items),

  listMovements: (projectId, { materialId, page, pageSize }) => {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (materialId) query.set("materialId", materialId);
    return request<MovementPage>(`/projects/${projectId}/stock-movements?${query}`);
  },

  recordMovement: (projectId, input) => {
    // taskName is only used client-side, so strip it before sending to the API
    const { taskName: _taskName, ...body } = input;
    return request<{ movement: StockMovement }>(`/projects/${projectId}/stock-movements`, {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => r.movement);
  },
};