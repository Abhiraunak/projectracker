import { request } from "@/lib/api";
import type { EstimateMethod, SteelRow, VolumeRow } from "./estimateCalc";

/** A material the project needs, added by hand (not from the BOQ) */
export interface MaterialEstimate {
  id: string;
  material: { id: string; name: string; unit: string; category: string };
  title: string; // what it is for; may be empty
  method: EstimateMethod;
  steel: SteelRow[];
  volume: VolumeRow[];
  wastagePercent: number;
  quantity: number; // in the material's unit, wastage included
  notes: string;
  addedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateInput {
  materialId?: string;
  newMaterial?: { name: string; unit: string; category?: string };
  title: string;
  method: EstimateMethod;
  quantity?: number | null;
  steel?: SteelRow[];
  volume?: VolumeRow[];
  wastagePercent: number;
  notes: string;
}

const id = (s: string) => encodeURIComponent(s);

export const estimatesApi = {
  list: (projectId: string) => request<{ items: MaterialEstimate[] }>(`/projects/${id(projectId)}/material-estimates`),
  add: (projectId: string, input: EstimateInput) =>
    request<{ estimate: MaterialEstimate }>(`/projects/${id(projectId)}/material-estimates`, { method: "POST", body: JSON.stringify(input) }),
  update: (projectId: string, estimateId: string, input: EstimateInput) =>
    request<{ estimate: MaterialEstimate }>(`/projects/${id(projectId)}/material-estimates/${id(estimateId)}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (projectId: string, estimateId: string) =>
    request<{ ok: true }>(`/projects/${id(projectId)}/material-estimates/${id(estimateId)}`, { method: "DELETE" }),
};