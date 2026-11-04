"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { describeDays, weekday } from "@/lib/attendance/days";
import { dayTotal, formatDay, num, rupees, workerHours, workerTotal, type AttendanceForm } from "@/lib/attendance/form";

/*
 * Rendered into <body> and shown only when printing. While printing, every other part of the page is hidden,
 * so only this slip comes out on paper.
 */
const PRINT_CSS = `
  @page { margin: 16mm; }
  @media print {
    /* Hide the whole app (sidebar, header, tabs, everything) except the slip */
    body > *:not(#attendance-print-root) { display: none !important; }

    /* App shells often lock the page to screen height, which would clip a long slip */
    html, body {
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }

    /* Always black on white, even if the app is in dark mode */
    #attendance-print-root {
      display: block !important;
      position: static !important;
      background: #fff !important;
      color: #000 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    #attendance-print-root * { color: #000 !important; }
  }
`;

/** True in the browser, false while rendering on the server: the portal needs document.body.
 *  useSyncExternalStore gives the right answer on the first browser render, without an effect or a second render. */
const noSubscription = () => () => {};
const useIsBrowser = () => useSyncExternalStore(noSubscription, () => true, () => false);

/** The payment slip for what is in the form now. `days` is the chosen days in several-days mode, else null. */
export function PrintSlip({ title, form, total, days }: { title: string; form: AttendanceForm; total: number; days: string[] | null }) {
  const mounted = useIsBrowser();
  if (!mounted) return null;

  // Only rows that actually have an amount, so empty rows don't print
  const mode = form.payMode;
  const rows = form.workers.filter((w) => workerTotal(w, days, mode) > 0);
  const extras = num(form.extras) * (days ? days.length : 1);

  return (
    <>
      <style>{PRINT_CSS}</style>
      {createPortal(
        <div id="attendance-print-root" className="hidden text-black">
          <h1 className="text-2xl font-bold">{title}</h1>

          <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <Fact label="Contractor" value={form.contractorName.trim() || "-"} />
            <Fact label="Trade" value={form.trade.trim() || "-"} />
            <Fact label={days ? "Days" : "Date"} value={days ? describeDays(days) : formatDay(form.date)} />
          </dl>

          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="w-12 py-2 pr-2 font-semibold">No.</th>
                <th className="py-2 font-semibold">Labourer</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-3 text-center">
                    No amounts entered
                  </td>
                </tr>
              ) : (
                rows.map((w, i) => (
                  <tr key={w.id} className="border-b border-stone-300">
                    <td className="py-2 pr-2">{i + 1}</td>
                    <td className="py-2">
                      {w.label.trim() || "Labour"}
                      {mode === "hourly" && <HoursNote hours={workerHours(w, days).hours} ot={workerHours(w, days).ot} dayRate={num(w.dayRate)} />}
                    </td>
                    <td className="py-2 text-right tabular-nums">{rupees(workerTotal(w, days, mode))}</td>
                  </tr>
                ))
              )}
              {extras > 0 && (
                <tr className="border-b border-stone-300">
                  <td />
                  <td className="py-2">Extras / additional cost{days && days.length > 1 ? ` (${rupees(num(form.extras))} a day)` : ""}</td>
                  <td className="py-2 text-right tabular-nums">{rupees(extras)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black">
                <td />
                <td className="py-3 text-base font-bold">{days ? `Total for ${days.length} ${days.length === 1 ? "day" : "days"}` : "Total"}</td>
                <td className="py-3 text-right text-base font-bold tabular-nums">{rupees(total)}</td>
              </tr>
            </tfoot>
          </table>

          {days && days.length > 0 && (
            <table className="mt-6 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="py-2 font-semibold">Day</th>
                  <th className="py-2 text-right font-semibold">Paid that day</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d} className="border-b border-stone-300">
                    <td className="py-1.5">
                      {weekday(d)} {formatDay(d)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{rupees(dayTotal(form.workers, d, form.extras, mode))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {form.notes.trim() && (
            <p className="mt-6 text-sm">
              <span className="font-semibold">Notes:</span> {form.notes.trim()}
            </p>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

/** Paid hourly: "224 h + 97 h OT at ₹1,300 a day" */
function HoursNote({ hours, ot, dayRate }: { hours: number; ot: number; dayRate: number }) {
  return (
    <span className="ml-2 text-xs">
      ({hours} h{ot ? ` + ${ot} h OT` : ""} at {rupees(dayRate)} a day)
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="font-semibold">{label}:</dt>
      <dd>{value}</dd>
    </div>
  );
}