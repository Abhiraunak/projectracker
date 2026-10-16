export const formatNumber = (value: number) => value.toLocaleString("en-IN", { maximumFractionDigits: 3 });
export const formatQty = (value: number, unit: string) => `${formatNumber(value)} ${unit}`;

export const todayLocal = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/** "2026-11-05" -> that day at local midnight (new Date("2026-11-05") would be UTC and can show the day before) */
export function parseDay(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

export const dayDiff = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 86_400_000);

export const formatDay = (iso: string) =>
  parseDay(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const toIsoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
