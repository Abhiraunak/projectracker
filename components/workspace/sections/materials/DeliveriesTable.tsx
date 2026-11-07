"use client";

import { memo, useMemo, useState } from "react";
import { FiChevronDown, FiFileText, FiImage } from "react-icons/fi";
import type { Delivery, Purchase } from "@/lib/inventory/purchases";
import { shortDate } from "@/lib/projects/hub";
import { mono } from "./mono";
import { money, qtyText } from "./purchaseFormat";

type Line = Delivery & { purchaseId: string; material: string; unit: string; presetRate: number };

const th = "py-3 text-xs font-medium text-[#666666]";
const td = "py-3.5 align-top";

/**
 * The Delivery log tab: every delivery of every material in one table, newest first: date, material, quantity, rate
 * paid (with the preset rate under it when it differs), amount, who logged it and the bill. The count and the total
 * actually spent sit above it. Pick a material to see only its deliveries.
 */
export const DeliveriesTable = memo(function DeliveriesTable({ items }: { projectId?: string; items: Purchase[]; canEdit?: boolean }) {
  const [only, setOnly] = useState(""); // a purchase id, or "" for every material

  const all = useMemo<Line[]>(
    () =>
      items
        .flatMap((p) => p.deliveries.map((d) => ({ ...d, purchaseId: p.id, material: p.name, unit: p.unit, presetRate: p.rate })))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [items]
  );
  const lines = only ? all.filter((l) => l.purchaseId === only) : all;
  const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  const withDeliveries = items.filter((p) => p.deliveries.length > 0);
  const hasBills = lines.some((l) => l.billUrl); // the bill column shows only when there is a bill to open

  if (all.length === 0)
    return (
      <div className={`${mono.card} px-6 py-14 text-center`}>
        <p className="text-[17px] font-semibold text-[#111111]">No deliveries yet</p>
        <p className="mt-1.5 text-sm text-[#666666]">Log a delivery from a material on the Materials tab; every delivery then shows here.</p>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className={`${mono.fieldLabel} w-full sm:w-72`}>
          <span aria-hidden>Material</span>
          <span className="relative block">
            <select value={only} onChange={(e) => setOnly(e.target.value)} aria-label="Show deliveries of" className={`${mono.field} appearance-none pr-10`}>
              <option value="">All materials</option>
              {withDeliveries.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <FiChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 mt-0.75 -translate-y-1/2 text-[#666666]" />
          </span>
        </label>
        {/* the total lives here, above the list, so the table needs no footer */}
        <p aria-live="polite" className="text-sm text-[#666666]">
          {lines.length} {lines.length === 1 ? "delivery" : "deliveries"} · <b className="font-semibold tabular-nums text-[#111111]">{money(total)}</b> spent
        </p>
      </div>

      {/* phones: one card per delivery */}
      <ul aria-label="Deliveries" className="space-y-3 md:hidden">
        {lines.map((l) => (
          <LineCard key={l.id} l={l} />
        ))}
      </ul>

      {/* wider screens: the table */}
      <section aria-label="Delivery log" className={`${mono.card} hidden overflow-hidden md:block`}>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-180 table-fixed text-sm">
            <colgroup>
              <col className="w-16" />
              <col className="w-[13%]" />
              <col />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[15%]" />
              <col className="w-[14%]" />
              {hasBills && <col className="w-16" />}
            </colgroup>
            <thead>
              <tr className="border-b border-[#EFEFED] bg-[#F7F7F5]">
                <th scope="col" className={`${th} pl-5 pr-2 text-left`}>
                  S.No
                </th>
                <th scope="col" className={`${th} px-3 text-left`}>
                  Date
                </th>
                <th scope="col" className={`${th} px-3 text-left`}>
                  Material
                </th>
                <th scope="col" className={`${th} px-3 text-right`}>
                  Quantity
                </th>
                <th scope="col" className={`${th} px-3 text-right`}>
                  Rate
                </th>
                <th scope="col" className={`${th} px-3 text-right`}>
                  Amount
                </th>
                <th scope="col" className={`${th} text-left ${hasBills ? "px-3" : "pl-6 pr-5"}`}>
                  Logged by
                </th>
                {hasBills && (
                  <th scope="col" className={`${th} pr-3`}>
                    <span className="sr-only">Bill</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEFED]">
              {lines.map((l, i) => (
                <LineRow key={l.id} n={i + 1} l={l} hasBills={hasBills} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
});

function BillLink({ l }: { l: Line }) {
  if (!l.billUrl) return null;
  return (
    <a href={l.billUrl} target="_blank" rel="noreferrer" className={mono.icon} aria-label={`Open the bill of ${l.material}, ${shortDate(l.date)}`} title="Open the bill">
      {l.billKind === "pdf" ? <FiFileText aria-hidden /> : <FiImage aria-hidden />}
    </a>
  );
}

const LineRow = memo(function LineRow({ n, l, hasBills }: { n: number; l: Line; hasBills: boolean }) {
  const differs = Math.abs(l.rate - l.presetRate) > 0.004;
  return (
    <tr className="transition-colors duration-180 hover:bg-[#FAFAF9] motion-reduce:transition-none">
      <td className={`${td} pl-5 pr-2 tabular-nums text-[#8C8C8C]`}>{n}</td>
      <td className={`${td} whitespace-nowrap px-3 text-[#111111]`}>{shortDate(l.date)}</td>
      <td className={`${td} truncate px-3 font-medium text-[#111111]`} title={l.material}>
        {l.material}
      </td>
      <td className={`${td} whitespace-nowrap px-3 text-right tabular-nums text-[#111111]`}>
        {qtyText(l.quantity)} <span className="text-[#666666]">{l.unit}</span>
      </td>
      <td className={`${td} whitespace-nowrap px-3 text-right tabular-nums text-[#333333]`}>
        {money(l.rate)}
        {differs && <span className="mt-0.5 block text-xs text-[#8C8C8C]">preset {money(l.presetRate)}</span>}
      </td>
      <td className={`${td} whitespace-nowrap px-3 text-right font-semibold tabular-nums text-[#111111]`}>{money(l.amount)}</td>
      <td className={`${td} truncate text-[#666666] ${hasBills ? "px-3" : "pl-6 pr-5"}`} title={l.addedBy}>
        {l.addedBy}
      </td>
      {hasBills && (
        <td className="py-1.5 pr-3 text-right">
          <BillLink l={l} />
        </td>
      )}
    </tr>
  );
});

const LineCard = memo(function LineCard({ l }: { l: Line }) {
  const differs = Math.abs(l.rate - l.presetRate) > 0.004;
  return (
    <li className={`${mono.card} px-4 py-3.5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-[#111111]">{l.material}</p>
          <p className="text-sm text-[#666666]">
            {shortDate(l.date)} · {l.addedBy}
          </p>
        </div>
        <p className="shrink-0 text-right text-[17px] font-semibold tabular-nums text-[#111111]">{money(l.amount)}</p>
      </div>
      <div className="mt-2 flex min-h-10 items-center justify-between gap-3">
        <p className="min-w-0 text-sm tabular-nums text-[#333333]">
          {qtyText(l.quantity)} {l.unit} × {money(l.rate)}
          {differs && <span className="text-[#8C8C8C]"> · preset {money(l.presetRate)}</span>}
        </p>
        <span className="-my-1 -mr-2 shrink-0">
          <BillLink l={l} />
        </span>
      </div>
    </li>
  );
});