"use client";

import { memo } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { iconBtn } from "@/components/utilites/fieldStyles";
import type { AttendanceListItem } from "@/lib/attendanceApi";
import { formatDay, rupees } from "@/lib/attendance/form";

/** Each labourer's pay over all the days saved together (one chip per labourer instead of one per day) */
function labourerTotals(r: AttendanceListItem) {
  if (!r.batch) return r.workers.map((w) => ({ key: w.id, label: w.label, amount: w.amount }));
  const byLabel = new Map<string, number>();
  for (const d of r.batch.days) for (const w of d.workers) byLabel.set(w.label, (byLabel.get(w.label) ?? 0) + w.amount);
  return [...byLabel].map(([label, amount]) => ({ key: label, label, amount }));
}

/** "3–11/11/2026", "28/10–2/11/2026", "30/12/2026–2/1/2027" */
function dayRange(from: string, to: string) {
  if (from === to) return formatDay(from);
  const [fy, fm, fd] = from.split("-");
  const [ty, tm, td] = to.split("-");
  const n = (s: string | undefined) => String(Number(s));
  if (fy !== ty) return `${formatDay(from)}–${formatDay(to)}`;
  if (fm !== tm) return `${n(fd)}/${n(fm)}–${n(td)}/${n(tm)}/${ty}`;
  return `${n(fd)}–${n(td)}/${n(tm)}/${ty}`;
}

/**
 * Saved entries: date, trade, contractor, labourers, notes, total, with edit and delete.
 * Days saved together are one row: their date range and number of days, each labourer's pay over all of them, and
 * the total; edit opens every day together and delete removes them together.
 */
export const RecordsTable = memo(function RecordsTable({
  records,
  dimmed,
  onEdit,
  onDelete,
}: {
  records: AttendanceListItem[];
  /** Showing the previous page while the next loads */
  dimmed?: boolean;
  onEdit: (r: AttendanceListItem) => void;
  onDelete: (r: AttendanceListItem) => void;
}) {
  return (
    // relative: keeps the hidden "Actions" label inside the scroll box, so phones don't scroll the whole page sideways
    <div className={`relative overflow-x-auto transition-opacity ${dimmed ? "opacity-60" : ""}`}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 text-stone-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Date</th>
            <th scope="col" className="px-4 py-3 font-medium">Trade</th>
            <th scope="col" className="px-4 py-3 font-medium">Contractor</th>
            <th scope="col" className="px-4 py-3 font-medium">Labourers</th>
            <th scope="col" className="px-4 py-3 font-medium">Notes</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          {records.map((r) => {
            const batch = r.batch && r.batch.from && r.batch.to ? r.batch : null;
            const when = batch ? `${batch.count} days, ${formatDay(batch.from!)} to ${formatDay(batch.to!)}` : formatDay(r.date);
            return (
              <tr key={batch ? batch.id : r.id} className="hover:bg-stone-50">
                <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                  {batch ? (
                    <>
                      <span className="block">{dayRange(batch.from!, batch.to!)}</span>
                      <span className="mt-0.5 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800">{batch.count} days</span>
                    </>
                  ) : (
                    formatDay(r.date)
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {r.trade ? <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">{r.trade}</span> : <span className="text-xs text-amber-700">Not set</span>}
                </td>
                <td className="px-4 py-3 font-medium">{r.contractorName}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {labourerTotals(r).map((w) => (
                      <span key={w.key} className="rounded border border-stone-200 px-2 py-0.5 text-xs text-stone-600">
                        {w.label}: {rupees(w.amount)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="max-w-40 truncate px-4 py-3 text-stone-500" title={r.notes}>
                  {r.notes || "-"}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{rupees(batch ? batch.totalAmount : r.totalAmount)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onEdit(r)}
                    aria-label={`Edit ${batch ? "all " : ""}entry for ${r.contractorName}, ${when}`}
                    title={batch ? `Edit all ${batch.count} days` : "Edit"}
                    className={iconBtn}
                  >
                    <FiEdit2 aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(r)}
                    aria-label={`Delete ${batch ? "all " : ""}entry for ${r.contractorName}, ${when}`}
                    title={batch ? `Delete all ${batch.count} days` : "Delete"}
                    className={`${iconBtn} hover:bg-red-50 hover:text-red-600`}
                  >
                    <FiTrash2 aria-hidden />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});