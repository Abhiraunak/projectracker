"use client";

import { useState, type KeyboardEvent } from "react";
import { useRates, useSetWorkRate } from "@/hooks/useLabourSimple";
import { describeError } from "@/lib/api";
import type { RateRow } from "@/lib/labour/simple";
import { SectionError, SectionSkeleton } from "../../ui";
import { DatePick } from "./DatePick";
import { field, label, longDay, money, mono, num, r2, todayYmd } from "./shared";

const ALL_FROM = "2000-01-01";
const UNITS = ["sqft", "sqm", "rft", "cum", "nos", "kg"];

/**
 * Rate comparison: one row per work. Type how much was done and what a contractor would charge per unit; our labour
 * rate comes from that work's attendance (hours and OT included) ÷ the quantity. The last column says whether we save
 * or pay more by doing it ourselves. Quantity and contractor rate are kept on the work item; the unit in this browser.
 */
export function CompareTab({ projectId }: { projectId: string }) {
    const today = todayYmd();
    const [from, setFrom] = useState(ALL_FROM);
    const [to, setTo] = useState(today);
    const [datesOpen, setDatesOpen] = useState(false);
    const rates = useRates(projectId, from, to);

    if (rates.isPending) return <SectionSkeleton />;
    if (rates.isError) return <SectionError error={rates.error} onRetry={() => void rates.refetch()} />;
    const items = rates.data.items;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[#111111]">Rate comparison</h3>
                    <p className="text-xs text-[#666666]">
                        <b className="font-semibold text-[#3C3489]">Contractor rate</b>: what a contractor would charge. <b className="font-semibold text-[#0C447C]">Our labour rate</b>: what we actually paid,
                        from this work&apos;s attendance.
                    </p>
                </div>
                {datesOpen ? (
                    <div className="flex flex-wrap items-end gap-2">
                        <div className={label}>
                            <span>From</span>
                            <DatePick value={from === ALL_FROM ? "" : from} onChange={setFrom} label="From" size="sm" className="w-44" />
                        </div>
                        <div className={label}>
                            <span>To</span>
                            <DatePick value={to} onChange={setTo} label="To" size="sm" className="w-44" align="right" />
                        </div>
                        <button type="button" onClick={() => {
                            setFrom(ALL_FROM);
                            setTo(today);
                            setDatesOpen(false);
                        }} className={`${mono.quiet} min-h-10 text-sm`}>
                            All dates
                        </button>
                    </div>
                ) : (
                    <p className="text-xs text-[#666666]">
                        {from === ALL_FROM ? "All dates" : `${longDay(from)} – ${longDay(to)}`} ·{" "}
                        <button type="button" onClick={() => setDatesOpen(true)} className="underline underline-offset-2 hover:text-[#111111]">
                            change
                        </button>
                    </p>
                )}
            </div>

            {items.length === 0 ? (
                <p className={`${mono.card} px-5 py-8 text-center text-sm text-[#666666]`}>Add a work in the Attendance tab (for example Flooring) and it shows up here.</p>
            ) : (
                <section className={`${mono.card} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-216 text-sm">
                            <thead>
                                <tr className="border-b border-[#EFEFED] bg-[#F7F7F5] text-xs text-[#666666]">
                                    <th scope="col" className="px-5 py-2.5 text-left font-medium">Work</th>
                                    <th scope="col" className="w-40 px-2 py-2.5 text-right font-medium">Quantity done</th>
                                    <th scope="col" className="w-32 px-2 py-2.5 text-right font-medium">Contractor rate</th>
                                    <th scope="col" className="w-32 px-2 py-2.5 text-right font-medium">Contractor cost</th>
                                    <th scope="col" className="w-36 px-2 py-2.5 text-right font-medium">Our labour rate</th>
                                    <th scope="col" className="w-40 px-5 py-2.5 text-right font-medium">Difference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFEFED]">
                                {items.map((w) => (
                                    <Row key={w.id} projectId={projectId} w={w} />
                                ))}
                            </tbody>
                            <Totals items={items} />
                        </table>
                    </div>
                </section>
            )}
            <p className="text-xs text-[#8C8C8C]">
                Type the quantity done and the contractor rate per unit; they save when you leave the box or press Enter. Our labour rate fills itself: everything marked under that work ÷ the quantity.
            </p>
        </div>
    );
}

/** The unit of a work, remembered in this browser (the work item has no unit of its own) */
const unitKey = (id: string) => `labour-unit:${id}`;
function readUnit(id: string) {
    try {
        return (typeof window !== "undefined" && localStorage.getItem(unitKey(id))) || "sqft";
    } catch {
        return "sqft";
    }
}

function Saving({ text }: { text: string }) {
    return <span className="block text-[11px] text-[#8C8C8C]">{text}</span>;
}

function Row({ projectId, w }: { projectId: string; w: RateRow }) {
    const save = useSetWorkRate(projectId);
    const [qty, setQty] = useState(w.quantity ? String(w.quantity) : "");
    const [rate, setRate] = useState(w.contractorRate ? String(w.contractorRate) : "");
    const [unit, setUnit] = useState(() => readUnit(w.id));

    const q = num(qty);
    const cr = num(rate);
    const contractorCost = r2(q * cr);
    const both = q > 0 && cr > 0;
    const diff = r2(contractorCost - w.labourCost);
    const dirty = q !== w.quantity || cr !== w.contractorRate;
    const commit = () => {
        if (dirty) save.mutate({ id: w.id, quantity: q, contractorRate: cr });
    };
    const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") e.currentTarget.blur(); // leaving the box saves it
    };
    const pickUnit = (u: string) => {
        setUnit(u);
        try {
            localStorage.setItem(unitKey(w.id), u);
        } catch {
            /* nothing to remember */
        }
    };
    const box = `${field} text-right tabular-nums`;

    return (
        <tr>
            <td className="px-5 py-2.5">
                <span className="block font-semibold text-[#111111]">{w.title}</span>
                <span className="block text-xs text-[#8C8C8C]">{w.days ? `${w.days} attendance ${w.days === 1 ? "entry" : "entries"}` : "no attendance yet"}</span>
            </td>
            <td className="px-2 py-2">
                <span className="flex items-center gap-1">
                    <input value={qty} onChange={(e) => setQty(e.target.value)} onBlur={commit} onKeyDown={onEnter} type="number" inputMode="decimal" min={0} step="any" placeholder="0" aria-label={`Quantity done for ${w.title}`} className={box} />
                    <select value={unit} onChange={(e) => pickUnit(e.target.value)} aria-label={`Unit for ${w.title}`} className="h-10 rounded-lg border border-transparent bg-transparent px-1 text-xs text-[#666666] hover:border-[#DADAD7]">
                        {UNITS.map((u) => (
                            <option key={u} value={u}>
                                {u}
                            </option>
                        ))}
                    </select>
                </span>
            </td>
            <td className="px-2 py-2">
                <input value={rate} onChange={(e) => setRate(e.target.value)} onBlur={commit} onKeyDown={onEnter} type="number" inputMode="decimal" min={0} step="any" placeholder={`₹ / ${unit}`} aria-label={`Contractor rate for ${w.title}`} className={box} />
                {save.isPending && <Saving text="Saving…" />}
                {save.isError && <span className="block text-[11px] text-[#B3261E]">{describeError(save.error)}</span>}
            </td>
            <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-[#3C3489]">{both ? money(contractorCost) : <span className="font-normal text-[#B0B0AD]">–</span>}</td>
            <td className="px-2 py-2.5 text-right tabular-nums">
                <span className="block font-semibold text-[#0C447C]">{money(w.labourCost)}</span>
                <span className="block text-xs text-[#185FA5]">{q > 0 ? `${money(r2(w.labourCost / q))} / ${unit}` : "type quantity"}</span>
            </td>
            <td className="px-5 py-2.5 text-right">
                <Difference show={both} diff={diff} />
            </td>
        </tr>
    );
}

function Difference({ show, diff }: { show: boolean; diff: number }) {
    if (!show) return <span className="text-[#B0B0AD]">–</span>;
    if (Math.abs(diff) < 1) return <span className="rounded-full bg-[#F1F1EF] px-2.5 py-1 text-xs font-medium text-[#666666]">about the same</span>;
    return diff > 0 ? (
        <span className="whitespace-nowrap rounded-full bg-[#EAF3DE] px-2.5 py-1 text-xs font-medium text-[#27500A]">we save {money(diff)}</span>
    ) : (
        <span className="whitespace-nowrap rounded-full bg-[#FAEEDA] px-2.5 py-1 text-xs font-medium text-[#633806]">we pay {money(-diff)} more</span>
    );
}

/** Totals of the works that have both a quantity and a contractor rate (as saved) */
function Totals({ items }: { items: RateRow[] }) {
    const counted = items.filter((w) => w.quantity > 0 && w.contractorRate > 0);
    const contractor = r2(counted.reduce((s, w) => s + w.quantity * w.contractorRate, 0));
    const ours = r2(counted.reduce((s, w) => s + w.labourCost, 0));
    return (
        <tfoot>
            <tr className="border-t border-[#EFEFED] bg-[#F7F7F5] font-semibold">
                <td className="px-5 py-3" colSpan={3}>
                    Total <span className="font-normal text-[#666666]">· works with both a quantity and a contractor rate</span>
                </td>
                <td className="px-2 py-3 text-right tabular-nums text-[#3C3489]">{counted.length ? money(contractor) : "–"}</td>
                <td className="px-2 py-3 text-right tabular-nums text-[#0C447C]">{counted.length ? money(ours) : "–"}</td>
                <td className="px-5 py-3 text-right">
                    <Difference show={counted.length > 0} diff={r2(contractor - ours)} />
                </td>
            </tr>
        </tfoot>
    );
}