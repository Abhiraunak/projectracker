import type { ProjectData } from "@/components/labour/LabourManagementForm";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/* -------------------------------- Types ----------------------------------- */

export type ProjectStatus = "ONGOING" | "COMPLETED" | "ARCHIVED";

export interface ApiTask {
  id: string;
  work: string;
  area: number;
  contractorRate: number;
  inHouseRate: number;
  stipulated: number;
  paid: number;
  progress: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

export interface ApiProject {
  id: string;
  title: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  tasks: ApiTask[];
}

/** What a project card needs (computed on the server) */
export interface ProjectSummary {
  id: string;
  title: string;
  status: ProjectStatus;
  taskCount: number;
  budget: number;
  paid: number;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  updatedAt: string;
}

export type TaskPatch = { progress?: number; paid?: number };
export type ProjectPayload = { title: string; status?: ProjectStatus; tasks: (Omit<ApiTask, "id"> & { id?: string })[] };

/* ------------------------------- Requests --------------------------------- */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    credentials: "include", // sends the httpOnly auth cookie
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.error ?? "Something went wrong", body?.details);
  return body as T;
}

const json = (data: unknown) => JSON.stringify(data);

export const projectsApi = {
  list: (status?: ProjectStatus) =>
    request<{ projects: ProjectSummary[] }>(`/projects${status ? `?status=${status}` : ""}`).then((r) => r.projects),
  get: (id: string) => request<{ project: ApiProject }>(`/projects/${id}`).then((r) => r.project),
  create: (data: ProjectPayload) =>
    request<{ project: ApiProject }>("/projects", { method: "POST", body: json(data) }).then((r) => r.project),
  update: (id: string, data: ProjectPayload) =>
    request<{ project: ApiProject }>(`/projects/${id}`, { method: "PUT", body: json(data) }).then((r) => r.project),
  setStatus: (id: string, status: ProjectStatus) =>
    request<{ project: ApiProject }>(`/projects/${id}`, { method: "PATCH", body: json({ status }) }).then((r) => r.project),
  remove: (id: string) => request<void>(`/projects/${id}`, { method: "DELETE" }),
  patchTask: (projectId: string, taskId: string, patch: TaskPatch) =>
    request<unknown>(`/projects/${projectId}/tasks/${taskId}`, { method: "PATCH", body: json(patch) }),
};

/* ------------------------ Form <-> API conversions ------------------------ */

const n = (v: number | "") => (v === "" ? 0 : v);

export const toPayload = (d: ProjectData): ProjectPayload => ({
  title: d.title.trim(),
  tasks: d.tasks.map((t) => ({
    id: t.id,
    work: t.work.trim(),
    area: n(t.area),
    contractorRate: n(t.contractorRate),
    inHouseRate: n(t.inHouseRate),
    stipulated: n(t.stipulated),
    paid: n(t.paid),
    progress: Math.round(n(t.progress)),
    startDate: t.startDate ?? "",
    endDate: t.endDate ?? "",
  })),
});

export const toFormData = (p: ApiProject): ProjectData => ({
  title: p.title,
  tasks: p.tasks.map((t) => ({ ...t })),
});

/** Turns any thrown error into a message safe to show the user */
export function describeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "Your session has expired. Sign in again to continue.";
    const detail = Array.isArray(e.details)
      ? (e.details as { path: string; message: string }[]).slice(0, 3).map((d) => `${d.path}: ${d.message}`).join("; ")
      : "";
    return detail ? `${e.message} (${detail})` : e.message;
  }
  return "Something went wrong. Check your connection and try again.";
}