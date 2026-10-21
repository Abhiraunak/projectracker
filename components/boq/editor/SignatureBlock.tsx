"use client";

import React, { memo } from "react";
import { setSignatures } from "@/lib/boq/operations";
import type { Signatures } from "@/lib/boq/types";
import { EditableText } from "./cells/EditableText";
import { useBoqEdit } from "./editContext";

/** "Commissioned by" and "Submitted by", with room to sign above the names */
export const SignatureBlock = memo(function SignatureBlock({ signatures }: { signatures: Signatures }) {
  const { apply } = useBoqEdit();
  const set = (field: keyof Signatures) => (value: string) => apply((d) => setSignatures(d, { [field]: value }), `sign:${field}`);

  return (
    <section aria-label="Signatures" className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-6">
      {(["left", "right"] as const).map((side, i) => (
        <div key={side} className={side === "right" ? "text-right" : ""}>
          <div data-grid-row>
            <EditableText value={signatures[`${side}Label` as const]} onValue={set(`${side}Label` as const)} label={`${side === "left" ? "Left" : "Right"} signature caption`} col={i} align={side === "right" ? "right" : "left"} placeholder={side === "left" ? "Commissioned by:" : "Submitted by:"} />
          </div>
          <div className="h-12" aria-hidden />
          <div data-grid-row className="border-t border-stone-300 pt-1">
            <EditableText value={signatures[`${side}Name` as const]} onValue={set(`${side}Name` as const)} label={`${side === "left" ? "Left" : "Right"} signatory`} col={i} align={side === "right" ? "right" : "left"} strong placeholder="Name and designation" />
          </div>
        </div>
      ))}
    </section>
  );
});
