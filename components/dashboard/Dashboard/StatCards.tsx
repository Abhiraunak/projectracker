"use client";

import { StatTask, useTasks } from "@/components/labour/Taskscontext";
import React, { memo, useMemo } from "react";
import { FiTrendingDown, FiTrendingUp } from "react-icons/fi";



export type { StatTask };

/* -------------------------------------------------------------------------- */
/*  Calculations (pure, so they are easy to test)                             */
/* -------------------------------------------------------------------------- */

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export function computeStats(tasks: StatTask[]) {
    let budget = 0;
    let paid = 0;
    let earned = 0; // value of work completed = budget x progress
    let saving = 0; // contractor cost minus in-house cost
    let contractorCost = 0;
    let overrun = 0; // only the amount paid beyond a task's own budget
    let overrunItems = 0;

    for (const t of tasks) {
        budget += t.stipulated;
        paid += t.paid;
        earned += (t.stipulated * Math.min(100, Math.max(0, t.progress))) / 100;
        contractorCost += t.area * t.contractorRate;
        saving += t.area * (t.contractorRate - t.inHouseRate);
        if (t.paid > t.stipulated) {
            overrun += t.paid - t.stipulated;
            overrunItems += 1;
        }
    }

    return {
        count: tasks.length,
        budget,
        paid,
        earned,
        remaining: budget - paid,
        saving,
        savingPct: pct(saving, contractorCost),
        overrun,
        overrunItems,
        paidPct: pct(paid, budget),
        completePct: pct(earned, budget),
        remainingPct: pct(Math.abs(budget - paid), budget),
    };
}

const rupees = (v: number) => `${v < 0 ? "-" : ""}₹${Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const items = (n: number) => `${n} work ${n === 1 ? "item" : "items"}`;

/* -------------------------------------------------------------------------- */
/*  Cards                                                                     */
/* -------------------------------------------------------------------------- */

export const StatCards = memo(function StatCards({ tasks }: { tasks?: StatTask[] }) {
    // An explicit prop wins; otherwise use the project shared by the page via context
    const fromContext = useTasks();
    const data = tasks ?? fromContext;
    const s = useMemo(() => computeStats(data), [data]);
    const has = s.count > 0;
    const paidAhead = s.paid - s.earned;

    return (
        <>
            <Card
                title="Labour Budget"
                value={rupees(s.budget)}
                period={has ? `Stipulated across ${items(s.count)}` : "Add work items to see your budget"}
            />
            <Card
                title="Paid"
                value={rupees(s.paid)}
                pillText={has ? `${s.paidPct}% of budget` : undefined}
                trend="up"
                period="Total released so far"
            />
            <Card
                title="Work Completed"
                value={rupees(s.earned)}
                pillText={has ? `${s.completePct}% done` : undefined}
                trend={paidAhead > 0 ? "down" : "up"}
                period={
                    !has
                        ? "Value of work done, from progress"
                        : paidAhead > 0
                          ? `Paid ${rupees(paidAhead)} ahead of work done`
                          : "Payments are in line with progress"
                }
            />
            <Card
                title={s.remaining < 0 ? "Overpaid" : "Remaining"}
                value={rupees(Math.abs(s.remaining))}
                pillText={has ? `${s.remainingPct}% of budget` : undefined}
                trend={s.remaining < 0 ? "down" : "up"}
                period={s.remaining < 0 ? "Paid exceeds the total budget" : "Still to be paid"}
            />
            <Card
                title="In-house Saving"
                value={rupees(s.saving)}
                pillText={has ? `${Math.abs(s.savingPct)}% vs contractor` : undefined}
                trend={s.saving >= 0 ? "up" : "down"}
                period={s.saving >= 0 ? "Contractor cost minus in-house cost" : "In-house costs more than contractor"}
            />
            <Card
                title="Over Budget"
                value={rupees(s.overrun)}
                pillText={s.overrunItems > 0 ? items(s.overrunItems) : has ? "On track" : undefined}
                trend={s.overrunItems > 0 ? "down" : "up"}
                period={s.overrunItems > 0 ? "Paid beyond a task's own budget" : "No work item is overpaid"}
            />
        </>
    );
});

const Card = ({
    title,
    value,
    pillText,
    trend = "up",
    period,
}: {
    title: string;
    value: string;
    pillText?: string;
    trend?: "up" | "down";
    period: string;
}) => {
    return (
        // Each card sits in the parent's 12-column grid:
        // phones 1 per row (12), sm 2 per row (6), lg 3 per row (4, as before)
        <div className="col-span-12 min-w-0 rounded border border-stone-300 p-3 sm:col-span-6 sm:p-4 lg:col-span-4">
            {/* flex-wrap: if the pill doesn't fit beside a long value, it drops underneath instead of overflowing */}
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2 sm:mb-8">
                <div className="min-w-0">
                    <h3 className="mb-1 text-sm text-stone-500 sm:mb-2">{title}</h3>
                    <p className="wrap-break-word text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
                </div>

                {pillText && (
                    <span
                        className={`flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${
                            trend === "up" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                    >
                        {trend === "up" ? <FiTrendingUp aria-hidden /> : <FiTrendingDown aria-hidden />} {pillText}
                    </span>
                )}
            </div>

            <p className="text-xs text-stone-500">{period}</p>
        </div>
    );
};