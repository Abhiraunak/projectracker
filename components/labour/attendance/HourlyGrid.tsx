"use client";

import { Fragment, useEffect, useRef, type KeyboardEvent } from "react";
import { FiChevronLeft, FiChevronRight, FiCopy, FiTrash2 } from "react-icons/fi";
import { iconBtn, removeBtn } from "@/components/utilites/fieldStyles";
import { useDragScroll } from "@/hooks/useDragScroll";
import { shortDay, weekday } from "@/lib/attendance/days";
import { dayRateFromHour, dayTotal, hourRateOf, hoursOn, num, payFor, rupees, toInput, workerHours, workerTotal, type WorkerRow } from "@/lib/attendance/form";

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

const cell = "border-b border-stone-200 px-1 py-1";
const field =
  "h-9 w-full min-w-0 rounded border border-stone-300 bg-white px-1.5 text-sm text-stone-900 placeholder:text-stone-300 focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20";
const box = `${field} text-right tabular-nums`; // numbers
const sticky = "sticky left-0 z-10 bg-white";

/**
 * Paid hourly, like a monthly labour sheet: each labourer is two rows, their hours and their overtime (OT), with the
 * days across. Their rate per hour sits beside the name; pay is (hours + OT) × rate, so 8 hours at ₹100 is ₹800.
 * (The form keeps a day rate of 8 × the hourly rate, which is what the team list and the server use.) A blank day
 * means absent. Totals on the right: hours and amount, OT and its amount, and the total.
 * Several days: opens on the newest day, and a drag (mouse), swipe (phone) or the arrows show the earlier ones.
 */
export function HourlyGrid({ days, date, workers, extras, onLabel, onRate, onHours, onSameEveryDay, onRemove, onNavigate }: Props) {
  const columns = days ?? [date];
  const boxRef = useRef<HTMLDivElement>(null);
  const { edges, page, reveal } = useDragScroll(boxRef);

  // Newest day in view just after the names, straight away on first show and smoothly when a later day is added
  const lastDay = columns[columns.length - 1];
  const shownLast = useRef<string | undefined>(undefined);
  useEffect(() => {
    const before = shownLast.current;
    shownLast.current = lastDay;
    if (!days || !lastDay || (before !== undefined && lastDay <= before)) return;
    reveal((el) => {
      const newest = el.querySelector<HTMLElement>("th[data-newest]");
      const names = el.querySelector<HTMLElement>("th[data-names]");
      return newest ? { left: newest.offsetLeft, stickyWidth: names?.offsetWidth ?? 0 } : null;
    }, before !== undefined);
  }, [days, lastDay, reveal]);

  if (days && days.length === 0) return <p className="text-sm text-stone-500">Choose the days above first.</p>;

  const { start, end } = edges;
  const shade = start ? "shadow-[4px_0_6px_-4px_rgba(0,0,0,0.15)]" : "";
  const arrow =
    "flex h-8 w-8 items-center justify-center rounded border border-stone-300 bg-white text-stone-600 hover:text-stone-900 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900";
  const grand = { hours: 0, ot: 0 };
  workers.forEach((w) => {
    const t = workerHours(w, days);
    grand.hours += t.hours;
    grand.ot += t.ot;
  });

  return (
    <div className="min-w-0">
      {days && (start || end) && (
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
        className={`relative overflow-x-auto overscroll-x-contain scrollbar-thin data-[dragging=true]:cursor-grabbing data-[dragging=true]:select-none ${start || end ? "cursor-grab" : ""}`}
      >
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-500">
              <th scope="col" data-names className={`${cell} ${sticky} ${shade} w-32 min-w-32 font-medium sm:w-44 sm:min-w-44`}>
                Labourer
              </th>
              <th scope="col" className={`${cell} w-20 min-w-20 text-right font-medium sm:w-24 sm:min-w-24`}>
                Rate / hour
                <span className="block font-normal text-stone-400">₹ per hour</span>
              </th>
              {columns.map((d) => (
                <th key={d} scope="col" data-newest={d === lastDay || undefined} className={`${cell} w-16 min-w-16 text-right font-medium`}>
                  <span className="block">{weekday(d)}</span>
                  <span className="block text-stone-900">{shortDay(d)}</span>
                </th>
              ))}
              <th scope="col" className={`${cell} min-w-16 text-right font-medium`}>
                Hours
              </th>
              <th scope="col" className={`${cell} min-w-24 text-right font-medium`}>
                Amount
              </th>
              <th scope="col" className={`${cell} min-w-24 text-right font-medium`}>
                Total
              </th>
              <th scope="col" className={cell}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w, index) => {
              const name = w.label.trim() || `Labourer ${index + 1}`;
              const rate = num(w.dayRate);
              const t = workerHours(w, days);
              const total = workerTotal(w, days, "hourly");
              return (
                <Fragment key={w.id}>
                  <tr>
                    <td className={`${cell} ${sticky} ${shade} border-b-0`}>
                      <input
                        id={`worker-${index}-label`}
                        type="text"
                        maxLength={40}
                        aria-label={`Labourer ${index + 1} name`}
                        value={w.label}
                        onKeyDown={(e) => onNavigate(e, index, "label")}
                        onChange={(e) => onLabel(w.id, e.target.value)}
                        placeholder="Name"
                        className={`${field} px-2 font-medium`}
                      />
                    </td>
                    <td className={`${cell} border-b-0`}>
                      <input
                        id={`worker-${index}-rate`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        aria-label={`${name}: rate per hour`}
                        value={hourRateOf(w.dayRate)}
                        onKeyDown={(e) => onNavigate(e, index, "rate")}
                        onChange={(e) => onRate(w.id, dayRateFromHour(toInput(e.target.value)))}
                        placeholder="₹"
                        className={box}
                      />
                    </td>
                    {columns.map((d, di) => (
                      <td key={d} className={`${cell} border-b-0`}>
                        <input
                          id={`worker-${index}-h-${di}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={24}
                          step="any"
                          aria-label={`${name}, hours, ${weekday(d)} ${shortDay(d)}`}
                          value={days ? (w.hoursByDay[d] ?? "") : w.hours}
                          onKeyDown={(e) => onNavigate(e, index, `h-${di}`)}
                          onChange={(e) => onHours(w.id, days ? d : null, "hours", toInput(e.target.value))}
                          placeholder="–"
                          className={box}
                        />
                      </td>
                    ))}
                    <td className={`${cell} border-b-0 text-right tabular-nums text-stone-700`}>{t.hours || "–"}</td>
                    <td className={`${cell} border-b-0 text-right tabular-nums text-stone-700`}>{t.hours ? rupees(payFor(t.hours, 0, rate)) : "–"}</td>
                    <td rowSpan={2} className={`${cell} text-right font-semibold tabular-nums`}>
                      {rupees(total)}
                    </td>
                    <td rowSpan={2} className={`${cell} whitespace-nowrap text-right`}>
                      {days && days.length > 1 && (
                        <button type="button" onClick={() => onSameEveryDay(w.id)} title="Copy the first day's hours and OT to every day" aria-label={`Same hours every day for ${name}`} className={iconBtn}>
                          <FiCopy aria-hidden />
                        </button>
                      )}
                      <button type="button" onClick={() => onRemove(w.id)} disabled={workers.length === 1} aria-label={`Remove ${name} from this entry`} className={`p-1.5 ${removeBtn}`}>
                        <FiTrash2 aria-hidden />
                      </button>
                    </td>
                  </tr>
                  <tr className="bg-orange-50/40">
                    <th scope="row" className={`${cell} ${sticky} ${shade} bg-orange-50! py-1 text-left text-xs font-semibold text-orange-800`}>
                      <span className="sr-only">{name}, </span>OT
                    </th>
                    <td className={cell} />
                    {columns.map((d, di) => (
                      <td key={d} className={cell}>
                        <input
                          id={`worker-${index}-ot-${di}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={24}
                          step="any"
                          aria-label={`${name}, overtime hours, ${weekday(d)} ${shortDay(d)}`}
                          value={days ? (w.otByDay[d] ?? "") : w.ot}
                          onKeyDown={(e) => onNavigate(e, index, `ot-${di}`)}
                          onChange={(e) => onHours(w.id, days ? d : null, "ot", toInput(e.target.value))}
                          placeholder="–"
                          className={`${box} h-8 border-orange-200`}
                        />
                      </td>
                    ))}
                    <td className={`${cell} text-right tabular-nums text-orange-800`}>{t.ot || "–"}</td>
                    <td className={`${cell} text-right tabular-nums text-orange-800`}>{t.ot ? rupees(payFor(0, t.ot, rate)) : "–"}</td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="text-xs text-stone-500">
              <th scope="row" className={`${sticky} ${shade} px-1.5 py-2 text-left font-medium`}>
                Paid that day{num(extras) > 0 ? ` (with ${rupees(num(extras))} extras)` : ""}
              </th>
              <td />
              {columns.map((d) => (
                <td key={d} className="px-1 py-2 text-right font-semibold tabular-nums text-stone-900">
                  {rupees(days ? dayTotal(workers, d, extras, "hourly") : workers.reduce((s, w) => s + payFor(hoursOn(w, null).hours, hoursOn(w, null).ot, num(w.dayRate)), 0) + num(extras))}
                </td>
              ))}
              <td className="px-1 py-2 text-right tabular-nums">
                {grand.hours} h{grand.ot ? <span className="block text-orange-800">+{grand.ot} OT</span> : null}
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}