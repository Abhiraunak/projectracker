/** Choosing several days for one attendance entry. Days are "YYYY-MM-DD" strings in local time. */

export const MAX_DAYS = 62; // about two months in one go; the server refuses more

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};

export const isIsoDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && toIso(parse(s)) === s;

/** Every day from `from` to `to` (inclusive, either order), optionally without Sundays, at most MAX_DAYS */
export function daysBetween(from: string, to: string, skipSundays = false): string[] {
  if (!isIsoDay(from) || !isIsoDay(to)) return [];
  let start = parse(from);
  let end = parse(to);
  if (start > end) [start, end] = [end, start];
  const days: string[] = [];
  for (const d = new Date(start); d <= end && days.length < MAX_DAYS; d.setDate(d.getDate() + 1)) {
    if (skipSundays && d.getDay() === 0) continue;
    days.push(toIso(d));
  }
  return days;
}

/** Sorted, no repeats, only real days */
export const tidyDays = (days: string[]) => [...new Set(days.filter(isIsoDay))].sort();

export const addDay = (days: string[], day: string) => tidyDays([...days, day]).slice(0, MAX_DAYS);
export const removeDay = (days: string[], day: string) => days.filter((d) => d !== day);

/** "14 Oct" for chips, "14 Oct 2026" with the year */
export const shortDay = (iso: string, withYear = false) =>
  parse(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), weekday: undefined });

export const weekday = (iso: string) => parse(iso).toLocaleDateString("en-IN", { weekday: "short" });

/** "14 Oct – 19 Oct 2026 (6 days)" or "14 Oct 2026" */
export function describeDays(days: string[]): string {
  if (days.length === 0) return "No days chosen";
  if (days.length === 1) return shortDay(days[0]!, true);
  const first = days[0]!;
  const last = days[days.length - 1]!;
  const contiguous = daysBetween(first, last).length === days.length;
  const span = `${shortDay(first)} – ${shortDay(last, true)}`;
  return contiguous ? `${span} (${days.length} days)` : `${days.length} days between ${span}`;
}
