"use client";

import { useMemo, useState } from "react";
import { FiCheckCircle, FiChevronLeft, FiChevronRight, FiCopy, FiX } from "react-icons/fi";
import { useCopyDay, useDayTotals } from "@/hooks/useLabourSimple";
import { describeError } from "@/lib/api";
import { DatePick } from "./DatePick";
import { addDays, label, longDay, mondayOf, money, mono, shortDay, todayYmd, weekday } from "./shared";

type Mode = "tick" | "range";

/** Every day from `from` to `to`, both included (at most 62) */
function daysBetween(from: string, to: string) {
    const out: string[] = [];
    for (let d = from; d <= to && out.length < 62; d = addDays(d, 1)) out.push(d);
    return out;
}

/**
 * Copy this day's crew (workers, hours, OT, rates) to other days in one go: tick days in a week, or pick From – To.
 * Days that already have an entry for this contractor and work are skipped, never changed; future days can be picked.
 * Each copied day is its own day afterwards.
 */
export function CopyDays({
    projectId,
    date,
    contractor,
    taskId,
    workTitle,
    summary,
    onClose,
}: {
    projectId: string;
    date: string;
    contractor: string;
    taskId: string | null;
    workTitle: string;
    summary: string;
    onClose: () => void;
}) {
    const today = todayYmd();
    const copy = useCopyDay(projectId);
    const [mode, setMode] = useState<Mode>("tick");
    const [week, setWeek] = useState(mondayOf(date));
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week]);
    const marked = useDayTotals(projectId, week, addDays(week, 6), taskId, contractor);
    const busy = new Set((marked.data?.days ?? []).filter((d) => d.total > 0).map((d) => d.date));
    // the rest of the source day's week to start with
    const [ticked, setTicked] = useState<Set<string>>(() => new Set(weekDaysAfter(date)));
    const [from, setFrom] = useState(addDays(date, 1));
    const [to, setTo] = useState(addDays(mondayOf(date), 6) > addDays(date, 1) ? addDays(mondayOf(date), 6) : addDays(date, 1));

    const chosen = (mode === "tick" ? [...ticked] : daysBetween(from, to)).filter((d) => d !== date).sort();
    const newDays = chosen.filter((d) => !busy.has(d)); // the server checks again; this is the preview for the week shown
    const skipDays = chosen.filter((d) => busy.has(d));

    const toggle = (d: string) =>
        setTicked((t) => {
            const next = new Set(t);
            if (next.has(d)) next.delete(d);
            else next.add(d);
            return next;
        });
    const tickRestOfWeek = () => setTicked(new Set(weekDays.filter((d) => d !== date)));

    const run = () => {
        if (chosen.length === 0) return;
        copy.mutate({ date, contractorName: contractor, taskId, dates: chosen });
    };

    if (copy.data) {
        const r = copy.data;
        return (
            <div className="mx-5 mt-3 overflow-hidden rounded-xl border border-[#C0DD97]">
                <p className="flex items-center gap-2 bg-[#EAF3DE] px-4 py-2.5 text-sm text-[#27500A]">
                    <FiCheckCircle aria-hidden />
                    {r.added.length ? `Copied to ${r.added.length} ${r.added.length === 1 ? "day" : "days"} · ${money(r.perDay * r.added.length)} added` : "Nothing copied: every day picked already had an entry."}
                </p>
                <ul className="divide-y divide-[#EFEFED] bg-white text-sm">
                    {r.added.map((d) => (
                        <li key={d} className="flex justify-between px-4 py-2">
                            <span>{longDay(d)}</span>
                            <span className="text-[#3B6D11]">added</span>
                        </li>
                    ))}
                    {r.skipped.map((d) => (
                        <li key={d} className="flex justify-between px-4 py-2 text-[#8C8C8C]">
                            <span>{longDay(d)}</span>
                            <span>had its own entry · skipped</span>
                        </li>
                    ))}
                </ul>
                <div className="flex items-center justify-between gap-2 border-t border-[#EFEFED] bg-white px-4 py-2.5">
                    <span className="text-xs text-[#666666]">Someone absent on one of these days? Open that day and change it.</span>
                    <button type="button" onClick={onClose} className={`${mono.secondary} min-h-9 px-3 text-sm`}>
                        Done
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-5 mt-3 rounded-xl border-2 border-[#B5D4F4] bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold text-[#111111]">Copy to other days</span>
                    <span className="text-[#666666]">
                        {" "}
                        · {workTitle} · {contractor} · {summary}
                    </span>
                </p>
                <span className="inline-flex rounded-lg border border-[#DADAD7] p-0.5">
                    {(["tick", "range"] as const).map((m) => (
                        <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`min-h-8 rounded-md px-3 text-sm ${mode === m ? "bg-[#111111] text-white" : "text-[#333333]"}`}>
                            {m === "tick" ? "Tick days" : "From – To"}
                        </button>
                    ))}
                </span>
                <button type="button" onClick={onClose} className={mono.icon} aria-label="Close">
                    <FiX aria-hidden />
                </button>
            </div>

            {mode === "tick" ? (
                <>
                    <div className="mt-3 flex items-center gap-1">
                        <button type="button" onClick={() => setWeek(addDays(week, -7))} className={mono.icon} aria-label="Week before">
                            <FiChevronLeft aria-hidden />
                        </button>
                        <div className="grid flex-1 grid-cols-7 gap-1.5">
                            {weekDays.map((d) => {
                                const source = d === date;
                                const future = d > today; // allowed; dashed border so it's clear it's ahead
                                const on = ticked.has(d);
                                const has = busy.has(d);
                                return (
                                    <button
                                        key={d}
                                        type="button"
                                        disabled={source}
                                        onClick={() => toggle(d)}
                                        aria-pressed={on}
                                        className={`min-h-14 rounded-xl border px-1 py-1.5 text-center text-xs ${mono.ring} ${source
                                                ? "border-transparent bg-[#111111] text-white"
                                                : on
                                                    ? "border-2 border-[#185FA5] bg-[#E6F1FB] text-[#0C447C]"
                                                    : has
                                                        ? "border-[#DADAD7] bg-[#F1F1EF] text-[#8C8C8C]"
                                                        : "border-[#DADAD7] bg-white text-[#333333] hover:border-[#8C8C8C]"
                                            } disabled:cursor-default ${future && !on ? "border-dashed" : ""}`}
                                    >
                                        <span className="block">{weekday(d)}</span>
                                        <span className="block text-sm font-semibold">{d.slice(8)}</span>
                                        <span className="block text-[10px]">{source ? "this day" : has ? "marked" : on ? "✓" : ""}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <button type="button" onClick={() => setWeek(addDays(week, 7))} className={mono.icon} aria-label="Week after">
                            <FiChevronRight aria-hidden />
                        </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <button type="button" onClick={tickRestOfWeek} className={`${mono.secondary} min-h-9 px-3 text-sm`}>
                            Whole week
                        </button>
                        <button type="button" onClick={() => setTicked(new Set())} className={`${mono.quiet} min-h-9 px-3 text-sm`}>
                            Clear
                        </button>
                    </div>
                </>
            ) : (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div className={`${label} flex-1 sm:flex-none`}>
                        <span>From</span>
                        <DatePick value={from} onChange={setFrom} label="From" size="sm" className="w-full sm:w-44" />
                    </div>
                    <div className={`${label} flex-1 sm:flex-none`}>
                        <span>To</span>
                        <DatePick value={to} onChange={setTo} label="To" size="sm" className="w-full sm:w-44" />
                    </div>
                    <span className="w-full pb-2 text-xs text-[#666666] sm:w-auto">
                        {chosen.length} {chosen.length === 1 ? "day" : "days"}, Sundays included
                    </span>
                </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                {mode === "tick" ? (
                    <>
                        <span className="rounded-full bg-[#E6F1FB] px-2.5 py-0.5 text-[#0C447C]">
                            {newDays.length} new {newDays.length === 1 ? "day" : "days"}
                        </span>
                        {skipDays.length > 0 && <span className="rounded-full bg-[#F1F1EF] px-2.5 py-0.5 text-[#666666]">{skipDays.length} already marked · skipped</span>}
                    </>
                ) : (
                    <span className="text-xs text-[#666666]">Days that already have an entry will be skipped, not changed.</span>
                )}
                {copy.isError && <span className="text-[#B3261E]">{describeError(copy.error)}</span>}
                <span className="ml-auto flex gap-2">
                    <button type="button" onClick={onClose} disabled={copy.isPending} className={`${mono.quiet} min-h-10 text-sm`}>
                        Cancel
                    </button>
                    <button type="button" onClick={run} disabled={copy.isPending || chosen.length === 0} className={`${mono.primary} min-h-10 text-sm`}>
                        <FiCopy aria-hidden /> {copy.isPending ? "Copying…" : `Copy to ${chosen.length} ${chosen.length === 1 ? "day" : "days"}`}
                    </button>
                </span>
            </div>
            {mode === "tick" && chosen.length > 0 && (
                <p className="mt-2 text-xs text-[#8C8C8C]">
                    {chosen.map((d) => shortDay(d)).join(" · ")}
                </p>
            )}
        </div>
    );
}

/** The days after `date` in its week: what "copy to the rest of the week" starts with */
function weekDaysAfter(date: string) {
    const monday = mondayOf(date);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => d > date);
}