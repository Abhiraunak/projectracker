"use client";

import React from "react";
import { FiAlertTriangle } from "react-icons/fi";
import { fmtQty } from "@/lib/inventory/figures";
import { useMaterialCost } from "@/hooks/useInventory";
import { Pill } from "@/components/materials/Pill";
import { QueryError } from "@/components/materials/QueryError";
import { StatCard } from "@/components/materials/StatCard";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/** What the project's materials cost: BOQ budget at standard rates, ordered, received (spent) and the likely final cost */
export function CostPanel({ projectId, onEditRates }: { projectId: string; onEditRates?: () => void }) {
  const cost = useMaterialCost(projectId);
  if (cost.isPending) return <div aria-busy="true" className="h-64 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />;
  if (cost.isError) return <QueryError error={cost.error} onRetry={() => cost.refetch()} />;

  const { items, totals } = cost.data;
  const over = totals.expected > totals.budget && totals.budget > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="BOQ material budget" value={rupees(totals.budget)} note="What the BOQ needs, at standard rates" />
        <StatCard title="Ordered" value={rupees(totals.orderedValue)} note="All orders, at their rates" />
        <StatCard title="Spent" value={rupees(totals.spent)} note={totals.estimated > 0 ? `Received so far (${rupees(totals.estimated)} estimated)` : "Value of what has arrived"} />
        <StatCard title="Expected" value={rupees(totals.expected)} note={over ? `${rupees(totals.expected - totals.budget)} over budget` : "Likely final material cost"} />
      </div>

      {totals.missingRates > 0 && (
        <p className="flex flex-col gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {totals.missingRates} {totals.missingRates === 1 ? "material has" : "materials have"} no standard rate, so the budget counts {totals.missingRates === 1 ? "it" : "them"} as ₹0.
          </span>
          {onEditRates && (
            <button type="button" onClick={onEditRates} className="shrink-0 font-medium underline underline-offset-2">
              Set rates
            </button>
          )}
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">No material needs, orders or deliveries yet.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-stone-300">
          <table className="w-full min-w-205 text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold text-stone-500">
                <th className="px-4 py-2.5">Material</th>
                <th className="px-3 py-2.5 text-right">Needed</th>
                <th className="px-3 py-2.5 text-right">Standard rate</th>
                <th className="px-3 py-2.5 text-right">Budget</th>
                <th className="px-3 py-2.5 text-right">Ordered</th>
                <th className="px-3 py-2.5 text-right">Spent</th>
                <th className="px-3 py-2.5 text-right">Avg. rate paid</th>
                <th className="px-3 py-2.5 text-right">Expected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((c) => (
                <tr key={c.material.id} className="hover:bg-stone-50">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{c.material.name}</span>
                    {c.overBudget && (
                      <span className="ml-2 align-middle"><Pill tone="bad" icon={FiAlertTriangle}>Over</Pill></span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtQty(c.required)} {c.material.unit}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${c.standardRate === 0 ? "text-amber-700" : ""}`}>{c.standardRate === 0 ? "not set" : rupees(c.standardRate)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{rupees(c.budget)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{rupees(c.orderedValue)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{rupees(c.spent)}{c.estimated > 0 && <span className="text-xs text-stone-500"> *</span>}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{c.averageRate === null ? "—" : rupees(c.averageRate)}</td>
                  <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${c.overBudget ? "text-red-700" : ""}`}>{rupees(c.expected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-stone-500">
        Spent = what has arrived, at each order&rsquo;s rate. * Deliveries recorded without an order are valued at the standard rate. Expected = the budget, or more if orders and deliveries already go past it.
      </p>
    </div>
  );
}
