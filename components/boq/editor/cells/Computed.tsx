import type { ReactNode } from "react";

/** A worked-out value (quantity, amount, total). It can't be typed into: change the numbers it comes from. */
export function Computed({ children, strong = false, title }: { children: ReactNode; strong?: boolean; title?: string }) {
  return (
    <span title={title} className={`block px-1.5 py-1 text-right text-sm tabular-nums text-stone-700 ${strong ? "font-semibold text-stone-900" : ""}`}>
      {children}
    </span>
  );
}
