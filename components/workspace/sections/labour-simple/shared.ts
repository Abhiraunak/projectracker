import { mono } from "../materials/mono";

/* Shared bits of the Labour tabs: dates, number fields, colours (blue = earned / cost, green = paid, amber = to pay) */

export { mono };
export { money } from "../materials/purchaseFormat";

const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayYmd = () => ymd(new Date());
export const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};
export const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
/** The Monday of the week a day is in */
export const mondayOf = (s: string) => {
  const d = parse(s);
  return addDays(s, -((d.getDay() + 6) % 7));
};
export const monthStart = (s: string) => `${s.slice(0, 7)}-01`;
export const yearStart = (s: string) => `${s.slice(0, 4)}-01-01`;
const short = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const shortY = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const wk = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
export const shortDay = (s: string) => short.format(parse(s));
export const longDay = (s: string) => shortY.format(parse(s));
export const weekday = (s: string) => wk.format(parse(s));

/** A number typed in a field: empty or bad is 0 */
export const num = (v: string) => {
  const x = Number(v);
  return v.trim() !== "" && Number.isFinite(x) && x >= 0 ? x : 0;
};
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const txt = (n: number) => (n ? String(r2(n)) : "");

export const field =
  "h-10 w-full min-w-0 rounded-lg border border-[#DADAD7] bg-white px-2.5 text-sm text-[#111111] placeholder:text-[#B0B0AD] focus:border-[#111111] focus:outline-none";
export const label = "flex min-w-0 flex-col gap-1 text-xs text-[#666666]";

export const TONE = {
  blue: { box: "border-[#B5D4F4] bg-[#E6F1FB]", label: "text-[#185FA5]", value: "text-[#0C447C]" },
  green: { box: "border-[#9FE1CB] bg-[#E1F5EE]", label: "text-[#0F6E56]", value: "text-[#085041]" },
  amber: { box: "border-[#FAC775] bg-[#FAEEDA]", label: "text-[#854F0B]", value: "text-[#633806]" },
  purple: { box: "border-[#CECBF6] bg-[#EEEDFE]", label: "text-[#534AB7]", value: "text-[#3C3489]" },
  lime: { box: "border-[#C0DD97] bg-[#EAF3DE]", label: "text-[#3B6D11]", value: "text-[#27500A]" },
  gray: { box: "border-[#E8E8E6] bg-[#F1F1EF]", label: "text-[#666666]", value: "text-[#111111]" },
} as const;
export type Tone = keyof typeof TONE;