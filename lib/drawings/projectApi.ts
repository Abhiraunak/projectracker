import { ApiError, apiUrl, renewSession, request } from "@/lib/api";
import type { Drawing, ProgressCallback } from "@/lib/drawings/types";


export interface NumberedDrawing extends Drawing {
  projectId: string | null;
  number: string | null;
  revision: number;
}

export interface ProjectDrawing extends NumberedDrawing {
  number: string;
  /** How many revisions this number has, this one included */
  revisions: number;
}

export interface ProjectDrawingInput {
  file: File;
  number: string;
  title: string;
  description: string;
}

const id = (s: string) => encodeURIComponent(s);

/** fetch() can't report upload progress, so uploads use XMLHttpRequest (with the same one-time session renewal) */
function send(projectId: string, input: ProjectDrawingInput, onProgress: ProgressCallback) {
  return new Promise<{ drawing: NumberedDrawing; revisedFrom: string | null }>((resolve, reject) => {
    const form = new FormData();
    form.append("number", input.number); // text first, file last
    form.append("title", input.title);
    form.append("description", input.description);
    form.append("file", input.file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl(`/projects/${id(projectId)}/drawings`));
    xhr.withCredentials = true;
    xhr.setRequestHeader("X-Requested-With", "fetch");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let body: { drawing?: NumberedDrawing; revisedFrom?: string | null; error?: string; details?: unknown } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.drawing) resolve({ drawing: body.drawing, revisedFrom: body.revisedFrom ?? null });
      else reject(new ApiError(xhr.status, body?.error ?? "Upload failed", body?.details));
    };
    xhr.onerror = () => reject(new ApiError(0, "Network error. Check your connection and try again."));
    xhr.send(form);
  });
}

export const projectDrawingsApi = {
  list: (projectId: string) => request<{ drawings: ProjectDrawing[]; unassigned: number }>(`/projects/${id(projectId)}/drawings`),
  revisions: (drawingId: string) => request<{ revisions: NumberedDrawing[] }>(`/drawings/${id(drawingId)}/revisions`),
  unassigned: () => request<{ drawings: NumberedDrawing[] }>("/drawings/unassigned"),
  place: (drawingId: string, projectId: string, number: string) =>
    request<{ drawing: NumberedDrawing }>(`/drawings/${id(drawingId)}/place`, { method: "PATCH", body: JSON.stringify({ projectId, number }) }),
  async upload(projectId: string, input: ProjectDrawingInput, onProgress: ProgressCallback) {
    try {
      return await send(projectId, input, onProgress);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && (await renewSession())) return send(projectId, input, onProgress);
      throw error;
    }
  },
};
