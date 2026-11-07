/**
 * The monochrome look shared with the dashboard, as class strings, so every part of the Materials tab uses the same
 * surfaces, radii, borders, buttons and focus ring. Green and red are for status only (all arrived, over).
 */

const ring = "focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]";
const motion = "transition-colors duration-[180ms] ease-[cubic-bezier(.2,0,0,1)] motion-reduce:transition-none";

export const mono = {
  /** A white card on the off-white page */
  card: "rounded-[22px] border border-[#E8E8E6] bg-white shadow-[0_1px_2px_rgba(17,17,17,0.04)]",
  /** A small grey tile inside a card (figures) */
  tile: "rounded-2xl bg-[#F7F7F5] px-4 py-3",
  label: "text-xs text-[#666666]",
  figure: "text-xl font-semibold tabular-nums tracking-[-0.01em] text-[#111111]",
  primary: `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#111111] px-[18px] text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(17,17,17,0.16)] hover:bg-[#2B2B2B] active:bg-black disabled:opacity-50 ${motion} ${ring}`,
  secondary: `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#DADAD7] bg-white px-4 text-[15px] font-medium text-[#111111] hover:bg-[#F7F7F5] disabled:opacity-50 ${motion} ${ring}`,
  quiet: `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-medium text-[#333333] hover:bg-[#F1F1EF] disabled:opacity-50 ${motion} ${ring}`,
  icon: `inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#666666] hover:bg-[#F1F1EF] hover:text-[#111111] disabled:opacity-50 ${motion} ${ring}`,
  iconDanger: `inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#666666] hover:bg-[#FCEDEC] hover:text-[#B3261E] disabled:opacity-50 ${motion} ${ring}`,
  field: `mt-1.5 h-11 w-full min-w-0 rounded-xl border border-[#DADAD7] bg-white px-3.5 text-[15px] text-[#111111] placeholder:text-[#8C8C8C] transition-[border-color,box-shadow] duration-[180ms] focus:border-[#111111] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.10)] focus:outline-none motion-reduce:transition-none`,
  fieldLabel: "block min-w-0 text-sm font-medium text-[#333333]",
  /** Table header cell */
  th: "whitespace-nowrap px-3 py-3 text-left text-xs font-medium text-[#666666]",
  td: "px-3 py-3.5 align-top",
  ring,
  motion,
} as const;