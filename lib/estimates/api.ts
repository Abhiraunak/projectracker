import { request } from "@/lib/api";

/* The simple Material estimate: named lists of materials (unit, quantity, rate), sent to the Materials tab. */

export type LineStatus = "new" | "sent" | "changed";

export interface EstimateLine {
    id: string;
    name: string;
    unit: string;
    quantity: number;
    rate: number;
    amount: number;
    status: LineStatus;
    /** What was last sent to Materials; null when never sent (or the material was deleted there) */
    sent: { name: string; quantity: number; rate: number } | null;
}

export interface Estimate {
    id: string;
    name: string;
    updatedAt: string;
    lines: EstimateLine[];
    total: number;
}

export interface EstimateSummary {
    id: string;
    name: string;
    updatedAt: string;
    lines: number;
    total: number;
    /** Lines with a name and quantity that aren't in Materials as they are here */
    notInMaterials: number;
}

/** What is saved: the name and every line in order (a new line carries an id made here) */
export interface EstimateSave {
    name: string;
    lines: { id: string; name: string; unit: string; quantity: number; rate: number }[];
}

const id = encodeURIComponent;
const base = (projectId: string) => `/projects/${id(projectId)}/material-estimates`;

export const estimatesApi = {
    list: (projectId: string) => request<{ estimates: EstimateSummary[] }>(base(projectId)),
    get: (projectId: string, estimateId: string) => request<Estimate>(`${base(projectId)}/${id(estimateId)}`),
    create: (projectId: string, name: string) => request<Estimate>(base(projectId), { method: "POST", body: JSON.stringify({ name }) }),
    save: (projectId: string, estimateId: string, body: EstimateSave) =>
        request<Estimate>(`${base(projectId)}/${id(estimateId)}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (projectId: string, estimateId: string) => request<{ ok: true }>(`${base(projectId)}/${id(estimateId)}`, { method: "DELETE" }),
    send: (projectId: string, estimateId: string) =>
        request<{ added: number; updated: number; estimate: Estimate }>(`${base(projectId)}/${id(estimateId)}/send`, { method: "POST" }),
};

/** "changed" as soon as a sent line is edited, without waiting for the save */
export function statusNow(l: { name: string; quantity: number; rate: number; sent: EstimateLine["sent"] }): LineStatus {
    if (!l.sent) return "new";
    return l.sent.name === l.name && l.sent.quantity === l.quantity && l.sent.rate === l.rate ? "sent" : "changed";
}