/** How the admin dashboard writes numbers: short Indian amounts (₹18.6 L, ₹1.42 Cr) and "3 h ago" */

export function inrShort(value: number): string {
  const sign = value < 0 ? "−" : "";
  const n = Math.abs(value);
  if (n >= 1e7) return `${sign}₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${sign}₹${(n / 1e5).toFixed(1)} L`;
  return `${sign}₹${Math.round(n).toLocaleString("en-IN")}`;
}

export const pct = (value: number) => `${Math.round(value)}%`;

/** "just now", "12 min ago", "3 h ago", "yesterday", "4 days ago", then the date */
export function ago(iso: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** "Oct 27" style label for a YYYY-MM-DD bucket start */
export const shortDate = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
