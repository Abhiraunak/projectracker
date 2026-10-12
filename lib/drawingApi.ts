import { ApiError, apiUrl, renewSession, request } from "@/lib/api";
import type { AppUser, Drawing, DrawingPage, DrawingsApi, ProgressCallback, UploadInput } from "@/lib/drawings/types";


/** Turns { a: 1, b: undefined } into "a=1", skipping empty values */
function toQueryString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return query.toString();
}

/** Text fields first, file last: servers that stream the upload can read the fields before the file arrives */
function toUploadForm(input: UploadInput): FormData {
  const form = new FormData();
  form.append("title", input.title);
  form.append("description", input.description);
  input.sharedWith.forEach((id) => form.append("sharedWith", id));
  form.append("file", input.file);
  return form;
}

function parseJson(text: string): { drawing?: Drawing; error?: string; details?: unknown } | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** fetch() can't report upload progress, so uploads use XMLHttpRequest */
function sendUpload(input: UploadInput, onProgress: ProgressCallback): Promise<Drawing> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl("/drawings"));
    xhr.withCredentials = true;
    xhr.setRequestHeader("X-Requested-With", "fetch");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      const body = parseJson(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300 && body?.drawing) resolve(body.drawing);
      else reject(new ApiError(xhr.status, body?.error ?? "Upload failed", body?.details));
    };
    xhr.onerror = () => reject(new ApiError(0, "Network error. Check your connection and try again."));
    xhr.onabort = () => reject(new ApiError(0, "Upload cancelled."));

    xhr.send(toUploadForm(input));
  });
}

/** Same silent session renewal as request(): on a 401, refresh once and send again */
async function uploadWithRetry(input: UploadInput, onProgress: ProgressCallback): Promise<Drawing> {
  try {
    return await sendUpload(input, onProgress);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && (await renewSession())) {
      return sendUpload(input, onProgress);
    }
    throw error;
  }
}

const realDrawingsApi: DrawingsApi = {
  list: ({ scope, q, page, pageSize }) =>
    request<DrawingPage>(`/drawings?${toQueryString({ scope, q, page, pageSize })}`),

  upload: uploadWithRetry,

  share: (drawingId, userIds) =>
    request<{ drawing: Drawing }>(`/drawings/${drawingId}/shares`, {
      method: "PUT",
      body: JSON.stringify({ userIds }),
    }).then((r) => r.drawing),

  remove: (drawingId) => request<void>(`/drawings/${drawingId}`, { method: "DELETE" }),

  searchUsers: (query) => request<{ users: AppUser[] }>(`/users?${toQueryString({ q: query })}`).then((r) => r.users),
};

export const drawingsApi: DrawingsApi = realDrawingsApi;
