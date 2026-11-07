"use client";

import { useMemo, useState } from "react";
import { FiArrowLeft, FiChevronRight, FiSearch } from "react-icons/fi";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import type { Purchase } from "@/lib/inventory/purchases";
import { LogForm } from "./DeliveryLog";
import { mono } from "./mono";
import { money, qtyText } from "./purchaseFormat";

/**
 * "Log delivery" from the top of the Materials tab, made for a phone on site: tap the material that arrived (those
 * still to come first, each with how many are left), then enter how many and the rate. Two taps and two numbers.
 */
export function QuickDelivery({ projectId, items, onClose }: { projectId: string; items: Purchase[]; onClose: () => void }) {
  const [pickedId, setPickedId] = useState<string | null>(items.length === 1 ? items[0]!.id : null);
  const [q, setQ] = useState("");
  const picked = pickedId ? items.find((i) => i.id === pickedId) : null; // follows the list after saving

  // Still to come first (most left first), then the rest; a search box once the list is long
  const list = useMemo(() => {
    const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return [...items]
      .filter((p) => words.every((w) => p.name.toLowerCase().includes(w)))
      .sort((a, b) => Number(b.toCome > 0) - Number(a.toCome > 0) || a.name.localeCompare(b.name));
  }, [items, q]);

  return (
    <ModalDialog open onClose={onClose} label={picked ? `Log delivery of ${picked.name}` : "Log delivery"} size="lg">
      <div className="min-w-0 space-y-4 p-4 sm:p-6">
        {picked ? (
          <>
            <div className="flex items-start gap-2">
              {items.length > 1 && (
                <button type="button" onClick={() => setPickedId(null)} aria-label="Pick another material" className={`${mono.icon} -ml-2 shrink-0`}>
                  <FiArrowLeft aria-hidden />
                </button>
              )}
              <div className="min-w-0 pt-1.5">
                <h2 className="wrap-break-word text-xl font-semibold tracking-[-0.01em] text-[#111111]">{picked.name}</h2>
                <p className="mt-0.5 text-sm text-[#666666]">
                  {qtyText(picked.arrived)} of {qtyText(picked.quantity)} {picked.unit} arrived · preset {money(picked.rate)}
                </p>
              </div>
            </div>
            <LogForm projectId={projectId} purchase={picked} onDone={onClose} />
          </>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.01em] text-[#111111]">Log delivery</h2>
              <p className="mt-0.5 text-sm text-[#666666]">Which material arrived?</p>
            </div>
            {items.length > 6 && (
              <label className="relative block">
                <span className="sr-only">Find a material</span>
                <FiSearch aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 mt-0.75 -translate-y-1/2 text-[#666666]" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a material" autoComplete="off" className={`${mono.field} pl-10`} />
              </label>
            )}
            <ul className="divide-y divide-[#EFEFED] overflow-hidden rounded-2xl border border-[#E8E8E6]">
              {list.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setPickedId(p.id)} className={`flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#F7F7F5] ${mono.motion} focus:outline-none focus-visible:bg-[#F1F1EF]`}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-[#111111]">{p.name}</span>
                      <span className={`block text-sm ${p.state === "all" ? "text-[#1A6B3C]" : "text-[#666666]"}`}>
                        {p.state === "all"
                          ? "All arrived"
                          : p.state === "extra"
                            ? `${qtyText(p.extra)} ${p.unit} extra`
                            : `${qtyText(p.toCome)} ${p.unit} left of ${qtyText(p.quantity)}`}
                      </span>
                    </span>
                    <FiChevronRight aria-hidden className="shrink-0 text-[#8C8C8C]" />
                  </button>
                </li>
              ))}
              {list.length === 0 && <li className="px-4 py-6 text-center text-sm text-[#666666]">No material matches that.</li>}
            </ul>
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className={`${mono.quiet} w-full sm:w-auto`}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </ModalDialog>
  );
}