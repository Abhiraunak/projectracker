"use client";

import { memo } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { iconBtn } from "@/components/utilites/fieldStyles";
import type { AttendanceRecord } from "@/lib/attendanceApi";
import { formatDay, rupees } from "@/lib/attendance/form";

/** Saved entries: date, trade, contractor, labourers, notes, total, with edit and delete */
export const RecordsTable = memo(function RecordsTable({
  records,
  dimmed,
  onEdit,
  onDelete,
}: {
  records: AttendanceRecord[];
  /** Showing the previous page while the next loads */
  dimmed?: boolean;
  onEdit: (r: AttendanceRecord) => void;
  onDelete: (r: AttendanceRecord) => void;
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
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-stone-50">
              <td className="whitespace-nowrap px-4 py-3 text-stone-600">{formatDay(r.date)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                {r.trade ? <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">{r.trade}</span> : <span className="text-xs text-amber-700">Not set</span>}
              </td>
              <td className="px-4 py-3 font-medium">{r.contractorName}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {r.workers.map((w) => (
                    <span key={w.id} className="rounded border border-stone-200 px-2 py-0.5 text-xs text-stone-600">
                      {w.label}: {rupees(w.amount)}
                    </span>
                  ))}
                </div>
              </td>
              <td className="max-w-40 truncate px-4 py-3 text-stone-500" title={r.notes}>
                {r.notes || "-"}
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{rupees(r.totalAmount)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button type="button" onClick={() => onEdit(r)} aria-label={`Edit entry for ${r.contractorName} on ${formatDay(r.date)}`} className={iconBtn}>
                  <FiEdit2 aria-hidden />
                </button>
                <button type="button" onClick={() => onDelete(r)} aria-label={`Delete entry for ${r.contractorName} on ${formatDay(r.date)}`} className={`${iconBtn} hover:bg-red-50 hover:text-red-600`}>
                  <FiTrash2 aria-hidden />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
