"use client";

import { memo, useMemo, useState } from "react";
import { FiChevronDown, FiEdit2, FiLock, FiPlus } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useMeasures } from "@/hooks/useLabourWeeks";
import { shortDate } from "@/lib/projects/hub";
import { weekLabel, type Measure } from "@/lib/projects/labourWeeks";
import { SectionError, SectionSkeleton } from "../../ui";
import { mono } from "../materials/mono";
import { money, qtyText } from "../materials/purchaseFormat";
import { MeasureDialog } from "./MeasureDialog";

/**
 * Contract work: measured work paid by area (or running feet, pieces…) × rate, to a sub-contractor or team head. Grouped
 * by pay week with each week's total; pick a contractor to see only theirs. Entries can be edited (not deleted, like
 * materials); work in a settled week is locked.
 */
export function ContractWork({ projectId }: { projectId: string }) {
  const book = useMeasures(projectId);
  const canWrite = useCan("attendance.write");
  const [only, setOnly] = useState("");
  const [open, setOpen] = useState<{ editing?: Measure } | null>(null);

  const items = useMemo(() => (book.data?.items ?? []).filter((m) => !only || m.contractorName === only), [book.data, only]);
  const weeks = useMemo(() => {
    const by = new Map<string, Measure[]>();
    for (const m of items) by.set(m.weekStart, [...(by.get(m.weekStart) ?? []), m]);
    return [...by.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);
  const names = useMemo(() => [...new Set((book.data?.items ?? []).map((m) => m.contractorName))].sort(), [book.data]);
  const total = Math.round(items.reduce((s, m) => s + m.amount, 0) * 100) / 100;

  if (book.isPending) return <SectionSkeleton />;
  if (book.isError) return <SectionError error={book.error} onRetry={() => void book.refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {names.length > 1 ? (
          <label className={`${mono.fieldLabel} w-full sm:w-72`}>
            <span className="sr-only">Show work of</span>
            <span className="relative block">
              <select value={only} onChange={(e) => setOnly(e.target.value)} className={`${mono.field} mt-0 appearance-none pr-10`}>
                <option value="">Every contractor</option>
                {names.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <FiChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
            </span>
          </label>
        ) : (
          <span />
        )}
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p aria-live="polite" className="text-sm text-[#666666]">
            {items.length} {items.length === 1 ? "entry" : "entries"} · <b className="font-semibold tabular-nums text-[#111111]">{money(total)}</b>
          </p>
          {canWrite && (
            <button type="button" onClick={() => setOpen({})} className={mono.primary}>
              <FiPlus aria-hidden /> Contract work
            </button>
          )}
        </div>
      </div>

      {weeks.length === 0 ? (
        <div className={`${mono.card} px-6 py-14 text-center`}>
          <p className="text-[17px] font-semibold text-[#111111]">No contract work yet</p>
          <p className="mt-1.5 text-sm text-[#666666]">For work paid by measurement, like tiles at ₹28 a sqft: log what was measured each week and it counts in that week&apos;s pay.</p>
        </div>
      ) : (
        weeks.map(([start, list]) => (
          <section key={start} aria-label={`Week ${weekLabel(start)}`} className={`${mono.card} overflow-hidden`}>
            <header className="flex items-center justify-between gap-3 border-b border-[#EFEFED] bg-[#F7F7F5] px-4 py-3 sm:px-5">
              <h3 className="text-sm font-semibold text-[#111111]">Week {weekLabel(start)}</h3>
              <span className="text-sm font-semibold tabular-nums text-[#111111]">{money(list.reduce((s, m) => s + m.amount, 0))}</span>
            </header>
            <ul className="divide-y divide-[#EFEFED]">
              {list.map((m) => (
                <Item key={m.id} m={m} canEdit={canWrite && !m.locked} onEdit={() => setOpen({ editing: m })} />
              ))}
            </ul>
          </section>
        ))
      )}

      {open && <MeasureDialog projectId={projectId} editing={open.editing} onClose={() => setOpen(null)} />}
    </div>
  );
}

const Item = memo(function Item({ m, canEdit, onEdit }: { m: Measure; canEdit: boolean; onEdit: () => void }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-[#111111]">{m.work}</p>
        <p className="truncate text-sm text-[#666666]">
          {m.contractorName}
          {m.trade ? ` · ${m.trade}` : ""} · {shortDate(m.date)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <p className="text-sm tabular-nums text-[#333333]">
          {qtyText(m.quantity)} {m.unit} × {money(m.rate)}
        </p>
        <p className="ml-auto w-28 text-right text-[15px] font-semibold tabular-nums text-[#111111] sm:ml-0">{money(m.amount)}</p>
        <span className="flex w-10 justify-end">
          {m.locked ? (
            <span title="In a settled week" className="inline-flex h-10 w-10 items-center justify-center text-[#8C8C8C]">
              <FiLock aria-label="Locked: settled week" />
            </span>
          ) : (
            canEdit && (
              <button type="button" onClick={onEdit} aria-label={`Edit ${m.work}`} className={mono.icon}>
                <FiEdit2 aria-hidden />
              </button>
            )
          )}
        </span>
      </div>
    </li>
  );
});