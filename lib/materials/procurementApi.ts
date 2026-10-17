import { request } from "@/lib/api";
import type { Material, ProcurementApi, Requirement, Vendor } from "./types";

export const procurementApi: ProcurementApi = {
  catalog: () => request<{ materials: Material[]; vendors: Vendor[] }>("/materials/catalog"),

  listRequirements: (projectId) =>
    request<{ requirements: Requirement[] }>(`/projects/${projectId}/requirements`).then((r) => r.requirements),

  createRequirement: (projectId, input) => {
    const { taskName: _taskName, ...body } = input; // the server looks the task name up itself
    return request<{ requirement: Requirement }>(`/projects/${projectId}/requirements`, {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => r.requirement);
  },

  updateOrder: (requirementId, update) =>
    request<{ requirement: Requirement }>(`/requirements/${requirementId}/order`, {
      method: "PATCH",
      body: JSON.stringify(update),
    }).then((r) => r.requirement),

  deleteRequirement: (requirementId) => request<void>(`/requirements/${requirementId}`, { method: "DELETE" }),
};