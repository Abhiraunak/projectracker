"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { useDebounced } from "@/hooks/useDebounced";
import { useLabourSearch } from "@/hooks/useLabourWeeks";
import { describeError } from "@/lib/api";
import { shortDate } from "@/lib/projects/hub";
import type { LabourHit } from "@/lib/projects/labourWeeks";
import { mono } from "../materials/mono";
import { money } from "../materials/purchaseFormat";

const KIND: Record<LabourHit["kind"], string> = { attendance: "Attendance", contract: "Contract", payment: "Payment" };
const lineKey = (trade: string, name: string) => `${trade.trim().replace(/\s+/g, " ").toLowerCase()}|${name.trim().replace(/\s+/g, " ").toLowerCase()}`;

/**
 * Search everything labour on the project: a contractor or team head, a labourer, a trade, contract work, a note or a
 * payment remark. Picking a result opens its pay week with that contractor's card in view.
 */
export function LabourSearch({ projectId, onPick }: { projectId: string; onPick: (weekStart: string, key: string) => void }) {
    const [text, setText] = useState("");
    const [open, setOpen] = useState(false);
    const q = useDebounced(text.trim(), 250);
    const found = useLabourSearch(projectId, q);
    const boxRef = useRef<HTMLDivElement>(null);
    const listId = useId();
    const show = open && q.length >= 2;

    // Click or tap outside closes the results
    useEffect(() => {
        if (!open) return;
        const away = (e: PointerEvent) => {
            if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", away);
        return () => document.removeEventListener("pointerdown", away);
    }, [open]);

    const pick = (h: LabourHit) => {
        onPick(h.weekStart, lineKey(h.trade, h.contractorName));
        setOpen(false);
    };

    return (
        <div ref={boxRef} className="relative">
            <label className="relative block">
                <span className="sr-only">Search labour</span>
                <FiSearch aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
                <input
                    type="search"
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                    placeholder="Search contractor, labourer, trade, work, payment…"
                    autoComplete="off"
                    aria-controls={listId}
                    aria-expanded={show}
                    className={`${mono.field} mt-0 h-12 pl-10 pr-10`}
                />
                {text && (
                    <button type="button" onClick={() => setText("")} aria-label="Clear search" className={`${mono.icon} absolute right-1 top-1/2 -translate-y-1/2`}>
                        <FiX aria-hidden />
                    </button>
                )}
            </label>

            {show && (
                <div id={listId} className={`${mono.card} absolute inset-x-0 top-full z-30 mt-2 max-h-[min(70vh,28rem)] overflow-y-auto shadow-[0_12px_32px_rgba(17,17,17,0.12)]`}>
                    {found.isError ? (
                        <p className="px-4 py-4 text-sm text-[#B3261E]">{describeError(found.error)}</p>
                    ) : !found.data || found.data.q !== q ? (
                        <p className="px-4 py-4 text-sm text-[#666666]">Searching…</p>
                    ) : found.data.hits.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-[#666666]">Nothing matches “{q}”.</p>
                    ) : (
                        <ul className="divide-y divide-[#EFEFED] py-1">
                            {found.data.hits.map((h) => (
                                <li key={`${h.kind}-${h.id}`}>
                                    <button type="button" onClick={() => pick(h)} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#F7F7F5] ${mono.motion} focus:outline-none focus-visible:bg-[#F1F1EF]`}>
                                        <span className="mt-0.5 w-20 shrink-0 rounded-full bg-[#F1F1EF] px-2 py-0.5 text-center text-[11px] font-medium text-[#333333]">{KIND[h.kind]}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[15px] font-medium text-[#111111]">
                                                {h.title}
                                                {h.trade ? <span className="font-normal text-[#666666]"> · {h.trade}</span> : null}
                                            </span>
                                            <span className="block truncate text-sm text-[#666666]">{h.detail}</span>
                                        </span>
                                        <span className="shrink-0 text-right">
                                            <span className="block text-sm font-semibold tabular-nums text-[#111111]">{money(h.amount)}</span>
                                            <span className="block text-xs text-[#8C8C8C]">{shortDate(h.date)}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}