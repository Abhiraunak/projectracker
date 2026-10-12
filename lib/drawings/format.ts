export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const initialOf = (email: string) => email.slice(0, 1).toUpperCase();

/** "ground-floor_plan.png" becomes "ground floor plan" */
export const titleFromFilename = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();

export const downloadName = (title: string) => `${title.trim().replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-") || "drawing"}`;