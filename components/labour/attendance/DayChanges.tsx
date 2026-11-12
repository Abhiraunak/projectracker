"use client";

import { useState } from "react";
import { FiSliders } from "react-icons/fi";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { iconBtn } from "@/components/utilites/fieldStyles";
import { shortDay, weekday } from "@/lib/attendance/days";
import { dayChanged, dayRateFromHour, hourRateOf, hoursOn, num, payFor, rupees, STANDARD_HOURS, toInput, type WorkerRow } from "@/lib/attendance/form";

const box =
  "h-11 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-2.5 text-right text-[15px] tabular-nums text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20";

/**
 * The button beside a labourer that opens their days, to change a day that was different: a different rate that day
 * (the rate went up or down) or rupees paid on top (paid extra, food, a small job). A dot on the button means some day
 * is changed. With one day, only the extra (the rate box in the sheet is that day's rate).
 */
export function DayChangesButton({ worker, days, date, daily, onChange }: { worker: WorkerRow; days: string[] | null; date: string; daily: boolean; onChange: (patch: Partial<WorkerRow>) => void }) {
  const [open, setOpen] = useState(false);
  const name = worker.label.trim() || "this labourer";
  const changed = (days ?? [null]).some((d) => dayChanged(worker, d));
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Change a day: other rate or extra paid" aria-label={`Change a day for ${name}${changed ? " (some days changed)" : ""}`} className={`relative ${iconBtn}`}>
        <FiSliders aria-hidden />
        {changed && <span aria-hidden className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-[#111111]" />}
      </button>
      {open && <DayChangesDialog worker={worker} days={days} date={date} daily={daily} onClose={() => setOpen(false)} onSave={(p) => (onChange(p), setOpen(false))} />}
    </>
  );
}

function DayChangesDialog({ worker, days, date, daily, onClose, onSave }: { worker: WorkerRow; days: string[] | null; date: string; daily: boolean; onClose: () => void; onSave: (patch: Partial<WorkerRow>) => void }) {
  const several = days !== null;
  const list = days ?? [date];
  // Rates are typed per day when paid by day, per hour when paid hourly; kept as day rates
  const shown = (dayRate: number | "") => (daily ? dayRate : hourRateOf(dayRate));
  const kept = (v: number | "") => (daily ? v : dayRateFromHour(v));
  const [rates, setRates] = useState<Record<string, number | "">>(() => Object.fromEntries(list.map((d) => [d, several ? (worker.rateByDay[d] ?? "") : ""])));
  const [extras, setExtras] = useState<Record<string, number | "">>(() => Object.fromEntries(list.map((d) => [d, several ? (worker.extraByDay[d] ?? "") : worker.extra])));
  const usual = num(worker.dayRate);
  const unit = daily ? "day" : "hour";

  const amountOn = (d: string) => {
    const { hours, ot } = hoursOn(worker, several ? d : null);
    const rate = rates[d] === "" || rates[d] === undefined ? usual : num(rates[d]!);
    return payFor(hours, ot, rate) + num(extras[d] ?? "");
  };

  const save = () =>
    onSave(
      several
        ? {
            rateByDay: Object.fromEntries(list.filter((d) => rates[d] !== "" && rates[d] !== undefined && rates[d] !== usual).map((d) => [d, rates[d]!])),
            extraByDay: Object.fromEntries(list.filter((d) => num(extras[d] ?? "") > 0).map((d) => [d, extras[d]!])),
          }
        : { extra: extras[date] ?? "" }
    );

  return (
    <ModalDialog open onClose={onClose} label={`Change a day for ${worker.label}`} size="lg">
      {/* opened from inside a table cell: undo its right-aligned, no-wrap text */}
      <div className="whitespace-normal text-left">
      <DialogHeader
        title={`${worker.label.trim() || "Labourer"}: change a day`}
        subtitle={`Usual rate ${rupees(daily ? usual : usual / STANDARD_HOURS)} a ${unit}. Leave the rate blank to use it; add rupees on top when paid extra.`}
        onClose={onClose}
      />
      <div className="space-y-3 p-4 sm:p-5">
        <div className={`hidden gap-2 px-1 text-xs font-medium text-stone-500 sm:grid ${several ? "grid-cols-[1fr_8rem_8rem_7rem]" : "grid-cols-[1fr_8rem_7rem]"}`}>
          <span>Day</span>
          {several && <span className="text-right">Rate that day (₹ / {unit})</span>}
          <span className="text-right">Extra paid (₹)</span>
          <span className="text-right">Amount</span>
        </div>
        <ul className="space-y-2">
          {list.map((d) => {
            const { hours, ot } = hoursOn(worker, several ? d : null);
            return (
              <li key={d} className={`grid items-center gap-2 rounded-xl border border-stone-200 p-2.5 sm:border-0 sm:p-1 ${several ? "grid-cols-2 sm:grid-cols-[1fr_8rem_8rem_7rem]" : "grid-cols-2 sm:grid-cols-[1fr_8rem_7rem]"}`}>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-sm font-medium text-stone-900">
                    {weekday(d)} {shortDay(d)}
                  </p>
                  <p className="text-xs text-stone-500">{daily ? (hours >= STANDARD_HOURS ? "Present" : "Absent") : hours + ot ? `${hours} h${ot ? ` + ${ot} OT` : ""}` : "Absent"}</p>
                </div>
                {several && (
                  <label className="block text-xs text-stone-500 sm:text-[0px]">
                    Rate that day
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={shown(rates[d] ?? "")}
                      onChange={(e) => setRates((r) => ({ ...r, [d]: kept(toInput(e.target.value)) }))}
                      placeholder={String(shown(usual) || "₹")}
                      aria-label={`${weekday(d)} ${shortDay(d)}: rate that day, per ${unit}`}
                      className={`${box} mt-1 sm:mt-0`}
                    />
                  </label>
                )}
                <label className="block text-xs text-stone-500 sm:text-[0px]">
                  Extra paid
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={extras[d] ?? ""}
                    onChange={(e) => setExtras((x) => ({ ...x, [d]: toInput(e.target.value) }))}
                    placeholder="0"
                    aria-label={`${weekday(d)} ${shortDay(d)}: extra paid`}
                    className={`${box} mt-1 sm:mt-0`}
                  />
                </label>
                <p className={`text-right text-[15px] font-semibold tabular-nums text-stone-900 ${several ? "col-span-2 sm:col-span-1" : ""}`}>{rupees(amountOn(d))}</p>
              </li>
            );
          })}
        </ul>
        {!several && <p className="text-xs text-stone-500">For a different rate on this one day, change the rate in the sheet.</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-stone-200 pt-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-4 text-sm font-medium text-stone-600 hover:bg-stone-100">
            Cancel
          </button>
          <button type="button" onClick={save} className="min-h-11 rounded-lg bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-700">
            Apply
          </button>
        </div>
      </div>
      </div>
    </ModalDialog>
  );
}