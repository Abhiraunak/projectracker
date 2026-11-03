"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { printWithTitle } from "@/lib/print";

/**
 * Prints `children` on their own, the same way the attendance slip prints: the content goes into <body>, and while
 * printing everything else on the page is hidden. Mount it to print; it opens the print dialog straight away and
 * calls `onDone` when the dialog closes (unmount it then).
 *
 * Its rules are deliberately more specific than the attendance slip's, so the two never hide each other when both
 * screens have been opened.
 */
export function PrintArea({ id, title, onDone, children }: { id: string; title: string; onDone: () => void; children: ReactNode }) {
  useEffect(() => {
    const done = () => onDone();
    window.addEventListener("afterprint", done, { once: true });
    // Let the browser draw the content first, then open the dialog
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => printWithTitle(title)));
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const css = `
    @page { margin: 14mm; }
    html body > #${id} { display: none; }
    @media print {
      html body > *:not(#${id}) { display: none !important; }
      html, body { height: auto !important; min-height: 0 !important; overflow: visible !important; background: #fff !important; }
      html body > #${id} { display: block !important; position: static !important; background: #fff !important; color: #000 !important; }
      html body > #${id} * { color: #000 !important; }
    }
  `;

  return createPortal(
    <div id={id} className="text-black">
      <style>{css}</style>
      {children}
    </div>,
    document.body
  );
}