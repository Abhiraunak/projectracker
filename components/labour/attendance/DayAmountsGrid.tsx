"use client";

import type { KeyboardEvent } from "react";
import { FiCopy, FiTrash2 } from "react-icons/fi";
import { iconBtn, inputBase, removeBtn } from "@/components/utilites/fieldStyles";
import { shortDay, weekday } from "@/lib/attendance/days";
import { dayTotal, num, rupees, toInput, workerTotal, type WorkerRow } from "@/lib/attendance/form";

interface Props {
  days: string[];
  workers: WorkerRow[];
  extras: number | "";
  onLabel: (id: string, label: string) => void;
  onAmount: (id: string, day: string, value: number | "") => void;
  onSameEveryDay: (id: string) => void;
  onRemove: (id: string) => void;
  onNavigate: (e: KeyboardEvent, index: number, field: string) => void;
}

/**
 * Several days: labourers down the side, the chosen days across the top; type what each labourer was paid on each
 * day. The label column stays put while the days scroll sideways. Row totals on the right, day totals at the bottom.
 */
export function DayAmountsGrid({ days, workers, extras, onLabel, onAmount, onSameEveryDay, onRemove, onNavigate }: Props) {
  if (days.length === 0) return <p className="text-sm text-stone-500">Choose the days above first.</p>;
  const cell = "border-b border-stone-200 px-1.5 py-1.5";
  return (
    <div className="-mx-4 overflow-x-auto px-4 scrollbar-thin">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-500">
            <th scope="col" className={`${cell} sticky left-0 z-10 min-w-40 bg-white font-medium`}>
              Labourer
            </th>
            {days.map((d) => (
              <th key={d} scope="col" className={`${cell} min-w-24 text-right font-medium`}>
                <span className="block">{weekday(d)}</span>
                <span className="block text-stone-900">{shortDay(d)}</span>
              </th>
            ))}
            <th scope="col" className={`${cell} min-w-24 text-right font-medium`}>
              Total
            </th>
            <th scope="col" className={cell}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {workers.map((w, index) => (
            <tr key={w.id}>
              <td className={`${cell} sticky left-0 z-10 bg-white`}>
                <input
                  id={`worker-${index}-label`}
                  type="text"
                  maxLength={40}
                  aria-label={`Labourer ${index + 1} label`}
                  value={w.label}
                  onKeyDown={(e) => onNavigate(e, index, "label")}
                  onChange={(e) => onLabel(w.id, e.target.value)}
                  placeholder="Label (e.g. L1)"
                  className={inputBase}
                />
              </td>
              {days.map((d, di) => (
                <td key={d} className={cell}>
                  <input
                    id={`worker-${index}-day-${di}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    aria-label={`${w.label || `Labourer ${index + 1}`}, ${weekday(d)} ${shortDay(d)}`}
                    value={w.amounts[d] ?? ""}
                    onKeyDown={(e) => onNavigate(e, index, `day-${di}`)}
                    onChange={(e) => onAmount(w.id, d, toInput(e.target.value))}
                    placeholder="0"
                    className={`${inputBase} text-right tabular-nums`}
                  />
                </td>
              ))}
              <td className={`${cell} text-right font-semibold tabular-nums`}>{rupees(workerTotal(w, days))}</td>
              <td className={`${cell} whitespace-nowrap text-right`}>
                {days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onSameEveryDay(w.id)}
                    title="Copy the first amount to every day"
                    aria-label={`Same amount every day for ${w.label || `labourer ${index + 1}`}`}
                    className={iconBtn}
                  >
                    <FiCopy aria-hidden />
                  </button>
                )}
                <button type="button" onClick={() => onRemove(w.id)} disabled={workers.length === 1} aria-label={`Remove labourer ${index + 1}`} className={`p-1.5 ${removeBtn}`}>
                  <FiTrash2 aria-hidden />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="text-xs text-stone-500">
            <th scope="row" className="sticky left-0 z-10 bg-white px-1.5 py-2 text-left font-medium">
              Paid that day{num(extras) > 0 ? ` (with ${rupees(num(extras))} extras)` : ""}
            </th>
            {days.map((d) => (
              <td key={d} className="px-1.5 py-2 text-right font-semibold tabular-nums text-stone-900">
                {rupees(dayTotal(workers, d, extras))}
              </td>
            ))}
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
