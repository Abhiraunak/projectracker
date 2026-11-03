"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { FiChevronLeft, FiChevronRight, FiCopy, FiTrash2 } from "react-icons/fi";
import { useDragScroll } from "@/hooks/useDragScroll";
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
 *
 * The grid stays inside its card. It opens scrolled to the newest day (and the totals), and moves there again when a
 * later day is added; earlier days are a drag (mouse), a swipe (phone) or the arrows away.
 */
export function DayAmountsGrid(props: Props) {
  if (props.days.length === 0) return <p className="text-sm text-stone-500">Choose the days above first.</p>;
  return <Grid {...props} />;
}

function Grid({ days, workers, extras, onLabel, onAmount, onSameEveryDay, onRemove, onNavigate }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const { edges, page, reveal } = useDragScroll(boxRef);

  // Newest day in view, just after the names, with the totals beside it: straight away on first show, smoothly
  // when a later day is added. (Scrolling to the very end would hide it behind the names on a phone.)
  const lastDay = days[days.length - 1];
  const shownLast = useRef<string | undefined>(undefined);
  useEffect(() => {
    const before = shownLast.current;
    shownLast.current = lastDay;
    if (!lastDay || (before !== undefined && lastDay <= before)) return;
    reveal((box) => {
      const newest = box.querySelector<HTMLElement>("th[data-newest]");
      const names = box.querySelector<HTMLElement>("th[data-names]");
      return newest ? { left: newest.offsetLeft, stickyWidth: names?.offsetWidth ?? 0 } : null;
    }, before !== undefined);
  }, [lastDay, reveal]);

  const cell = "border-b border-stone-200 px-1.5 py-1.5";
  const { start, end } = edges;
  const arrow =
    "flex h-8 w-8 items-center justify-center rounded border border-stone-300 bg-white text-stone-600 hover:text-stone-900 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900";
  return (
    <div className="min-w-0">
      {(start || end) && (
        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-stone-500">
          <span>
            {days.length} days · <span className="hidden sm:inline">drag sideways</span>
            <span className="sm:hidden">swipe</span> to see {start ? "earlier" : "later"} days
          </span>
          <span className="flex gap-1">
            <button type="button" onClick={() => page(-1)} disabled={!start} aria-label="Earlier days" className={arrow}>
              <FiChevronLeft aria-hidden />
            </button>
            <button type="button" onClick={() => page(1)} disabled={!end} aria-label="Later days" className={arrow}>
              <FiChevronRight aria-hidden />
            </button>
          </span>
        </div>
      )}
    <div
      ref={boxRef}
      className={`relative overflow-x-auto overscroll-x-contain scrollbar-thin data-[dragging=true]:cursor-grabbing data-[dragging=true]:select-none ${
        start || end ? "cursor-grab" : ""
      }`}
    >
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-500">
            <th scope="col" data-names className={`${cell} sticky left-0 z-10 w-28 min-w-28 bg-white font-medium sm:w-40 sm:min-w-40 ${start ? "shadow-[4px_0_6px_-4px_rgba(0,0,0,0.15)]" : ""}`}>
              Labourer
            </th>
            {days.map((d) => (
              <th key={d} scope="col" data-newest={d === lastDay || undefined} className={`${cell} min-w-24 text-right font-medium`}>
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
              <td className={`${cell} sticky left-0 z-10 bg-white ${start ? "shadow-[4px_0_6px_-4px_rgba(0,0,0,0.15)]" : ""}`}>
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
            <th scope="row" className={`sticky left-0 z-10 bg-white px-1.5 py-2 text-left font-medium ${start ? "shadow-[4px_0_6px_-4px_rgba(0,0,0,0.15)]" : ""}`}>
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
    </div>
  );
}