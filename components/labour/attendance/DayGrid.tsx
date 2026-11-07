"use client";

import type { KeyboardEvent } from "react";
import { FiCheck, FiCopy, FiTrash2 } from "react-icons/fi";
import { iconBtn, removeBtn } from "@/components/utilites/fieldStyles";
import { shortDay, weekday } from "@/lib/attendance/days";
import { dayTotal, hoursOn, num, rupees, STANDARD_HOURS, toInput, workerTotal, type WorkerRow } from "@/lib/attendance/form";

interface Props {
    /** The chosen days, or null for a single-day entry on `date` */
    days: string[] | null;
    date: string;
    workers: WorkerRow[];
    extras: number | "";
    onLabel: (id: string, label: string) => void;
    onRate: (id: string, dayRate: number | "") => void;
    onHours: (id: string, day: string | null, field: "hours" | "ot", value: number | "") => void;
    onSameEveryDay: (id: string) => void;
    onRemove: (id: string) => void;
    onNavigate: (e: KeyboardEvent, index: number, field: string) => void;
}

const cell = "border-b border-stone-200 px-1 py-1.5";
const field =
    "h-10 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-2 text-sm text-stone-900 placeholder:text-stone-300 focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20";
const sticky = "sticky left-0 z-10 bg-white";

/**
 * Paid by day: each labourer's day rate, and a tap per day for present (P) or absent. Present pays the day rate
 * (saved as a full 8-hour day, so the month sheet and payments read it the same as hourly). Big tap targets for a
 * phone on site; the days scroll sideways when there are many.
 */
export function DayGrid({ days, date, workers, extras, onLabel, onRate, onHours, onSameEveryDay, onRemove, onNavigate }: Props) {
    const columns = days ?? [date];
    if (days && days.length === 0) return <p className="text-sm text-stone-500">Choose the days above first.</p>;
    const present = (w: WorkerRow, d: string) => hoursOn(w, days ? d : null).hours >= STANDARD_HOURS;
    const daysWorked = (w: WorkerRow) => columns.filter((d) => present(w, d)).length;

    return (
        <div className="relative overflow-x-auto overscroll-x-contain scrollbar-thin">
            <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                    <tr className="text-left text-xs text-stone-500">
                        <th scope="col" className={`${cell} ${sticky} w-32 min-w-32 font-medium sm:w-44 sm:min-w-44`}>
                            Labourer
                        </th>
                        <th scope="col" className={`${cell} w-24 min-w-24 text-right font-medium`}>
                            Rate / day
                        </th>
                        {columns.map((d) => (
                            <th key={d} scope="col" className={`${cell} w-14 min-w-14 text-center font-medium`}>
                                <span className="block">{weekday(d)}</span>
                                <span className="block text-stone-900">{shortDay(d)}</span>
                            </th>
                        ))}
                        <th scope="col" className={`${cell} min-w-14 text-right font-medium`}>
                            Days
                        </th>
                        <th scope="col" className={`${cell} min-w-24 text-right font-medium`}>
                            Amount
                        </th>
                        <th scope="col" className={cell}>
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {workers.map((w, index) => {
                        const name = w.label.trim() || `Labourer ${index + 1}`;
                        return (
                            <tr key={w.id}>
                                <td className={`${cell} ${sticky}`}>
                                    <input
                                        id={`worker-${index}-label`}
                                        type="text"
                                        maxLength={40}
                                        aria-label={`Labourer ${index + 1} name`}
                                        value={w.label}
                                        onKeyDown={(e) => onNavigate(e, index, "label")}
                                        onChange={(e) => onLabel(w.id, e.target.value)}
                                        placeholder="Name"
                                        className={`${field} font-medium`}
                                    />
                                </td>
                                <td className={cell}>
                                    <input
                                        id={`worker-${index}-rate`}
                                        type="number"
                                        inputMode="decimal"
                                        min={0}
                                        step="any"
                                        aria-label={`${name}: rate for a day`}
                                        value={w.dayRate}
                                        onKeyDown={(e) => onNavigate(e, index, "rate")}
                                        onChange={(e) => onRate(w.id, toInput(e.target.value))}
                                        placeholder="₹"
                                        className={`${field} text-right tabular-nums`}
                                    />
                                </td>
                                {columns.map((d) => {
                                    const on = present(w, d);
                                    return (
                                        <td key={d} className={`${cell} text-center`}>
                                            <button
                                                type="button"
                                                aria-pressed={on}
                                                aria-label={`${name}, ${weekday(d)} ${shortDay(d)}: ${on ? "present" : "absent"}`}
                                                onClick={() => onHours(w.id, days ? d : null, "hours", on ? "" : STANDARD_HOURS)}
                                                className={`mx-auto flex h-10 w-11 items-center justify-center rounded-lg border text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-1 ${on ? "border-[#111111] bg-[#111111] text-white" : "border-stone-300 bg-white text-stone-400 hover:border-stone-500 hover:text-stone-700"
                                                    }`}
                                            >
                                                {on ? <FiCheck aria-hidden /> : "A"}
                                            </button>
                                        </td>
                                    );
                                })}
                                <td className={`${cell} text-right tabular-nums text-stone-700`}>{daysWorked(w) || "–"}</td>
                                <td className={`${cell} text-right font-semibold tabular-nums`}>{rupees(workerTotal(w, days, "daily"))}</td>
                                <td className={`${cell} whitespace-nowrap text-right`}>
                                    {days && days.length > 1 && (
                                        <button type="button" onClick={() => onSameEveryDay(w.id)} title="Present every chosen day, like the first" aria-label={`Same every day for ${name}`} className={iconBtn}>
                                            <FiCopy aria-hidden />
                                        </button>
                                    )}
                                    <button type="button" onClick={() => onRemove(w.id)} disabled={workers.length === 1} aria-label={`Remove ${name} from this entry`} className={`p-1.5 ${removeBtn}`}>
                                        <FiTrash2 aria-hidden />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="text-xs text-stone-500">
                        <th scope="row" className={`${sticky} px-1.5 py-2 text-left font-medium`}>
                            Paid that day{num(extras) > 0 ? ` (with ${rupees(num(extras))} extras)` : ""}
                        </th>
                        <td />
                        {columns.map((d) => (
                            <td key={d} className="px-1 py-2 text-center font-semibold tabular-nums text-stone-900">
                                {rupees(days ? dayTotal(workers, d, extras, "daily") : workers.reduce((s, w) => s + workerTotal(w, null, "daily"), 0) + num(extras))}
                            </td>
                        ))}
                        <td colSpan={3} />
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}