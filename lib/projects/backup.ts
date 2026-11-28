import { ApiError, apiUrl, renewSession } from "@/lib/api";

/** The sections a project backup can hold, in the order they appear in the files */
export const BACKUP_SECTIONS = [
  { key: "overview", label: "Overview (money summary)" },
  { key: "estimate", label: "Material estimate" },
  { key: "materials", label: "Materials and deliveries" },
  { key: "attendance", label: "Labour attendance" },
  { key: "labourBills", label: "Labour bills and payments" },
  { key: "subcontract", label: "Subcontract work" },
  { key: "equipment", label: "Equipment" },
  { key: "expenses", label: "General expenses" },
  { key: "files", label: "Project files" },
  { key: "activity", label: "Activity log" },
] as const;
export type BackupSection = (typeof BACKUP_SECTIONS)[number]["key"];
export type BackupFormat = "zip" | "xlsx" | "pdf";

/** The file name the server gave (Content-Disposition), so the download keeps "PT-001 Udaipur Villa backup 28-11-2026.zip" */
function nameFrom(res: Response, fallback: string) {
  const h = res.headers.get("Content-Disposition") ?? "";
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(h);
  if (utf) return decodeURIComponent(utf[1]!);
  const plain = /filename="([^"]+)"/i.exec(h);
  return plain?.[1] ?? fallback;
}

async function fetchBackup(projectId: string, format: BackupFormat, sections: BackupSection[]) {
  const url = apiUrl(`/projects/${encodeURIComponent(projectId)}/backup?format=${format}&sections=${sections.join(",")}`);
  const res = await fetch(url, { credentials: "include", headers: { "X-Requested-With": "fetch" } });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; details?: unknown } | null;
    throw new ApiError(res.status, body?.error ?? "Couldn't make the backup. Try again.", body?.details);
  }
  return res;
}

/** Ask the server for the backup and save it as a download (signing in again once if the session ran out) */
export async function downloadBackup(projectId: string, format: BackupFormat, sections: BackupSection[]) {
  let res: Response;
  try {
    res = await fetchBackup(projectId, format, sections);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && (await renewSession())) res = await fetchBackup(projectId, format, sections);
    else throw error;
  }
  const blob = await res.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nameFrom(res, `backup.${format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
}