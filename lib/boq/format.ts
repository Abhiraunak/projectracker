const money = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const two = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
const plain = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4, useGrouping: false });

export const fmtMoney = (n: number) => money.format(n);
export const fmtQty = (n: number) => two.format(n);
/** A typed dimension, as typed: 2, 7.4, 0.055 (no forced decimals) */
export const fmtDim = (n: number | null) => (n === null ? "" : plain.format(n));
export const fmtPercent = (n: number) => `${plain.format(n)}%`;
export const fmtLakhs = (n: number) => `${n.toFixed(2)} Lacs`;

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-10-20" -> "20 Oct 2026" (the same everywhere: screen, print and Excel); anything else is shown as it is */
export function fmtDay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1] ?? ""} ${match[1]}`.trim();
}
