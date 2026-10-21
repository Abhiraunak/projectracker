/** One look for every editable cell: like plain text until you point at it or type in it */
export const CELL =
  "block w-full min-w-0 rounded-sm bg-transparent px-1.5 py-1 text-sm text-stone-900 placeholder:text-stone-300 " +
  "transition-colors hover:bg-stone-100/70 focus:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 " +
  "read-only:hover:bg-transparent read-only:focus:bg-transparent read-only:focus:ring-0";

export const ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const;
export type Align = keyof typeof ALIGN;

/** A table cell in the sheet (Excel-like thin grid lines) */
export const TD = "border border-stone-200 p-0 align-top";
