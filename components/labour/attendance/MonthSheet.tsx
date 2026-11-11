"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiPrinter } from "react-icons/fi";
import { ChipInput } from "@/components/utilites/ChipInput";
import { PrintArea } from "@/components/utilites/PrintArea";
import { useDragScroll } from "@/hooks/useDragScroll";
import { useMonthSheet } from "@/hooks/useAttendance";
import { describeError } from "@/lib/api";
import type { MonthResponse, MonthSheetRow } from "@/lib/attendanceApi";
import { formatDay, rupees } from "@/lib/attendance/form";

/** This month in local time ("2026-11"); toISOString() would give last month on the 1st early in the morning */
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y!, m! - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthName = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};
const hrs = (n: number) => (n ? String(Math.round(n * 100) / 100) : "");
const rate = (n: number | null) => (n === null ? "" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);

/**
 * One contractor's month, like the paper labour sheet: each labourer down the side (hours, then OT), days 1–31
 * across, then hours, rate per hour, amount and total. Underneath, the account: owed from before + this month −
 * paid = carried to next month. Prints on one landscape page.
 */
export function MonthSheet({ projectId }: { projectId: string }) {
  const [month, setMonth] = useState(thisMonth);
  const [picked, setPicked] = useState(""); // empty: the contractor entered most recently
  const sheet = useMonthSheet(projectId, month, picked || undefined);
  const [printing, setPrinting] = useState(false);
  const data = sheet.data;
  const contractor = data?.contractor?.name ?? picked;
  const title = contractor ? `Labour payment: ${contractor} team, ${monthName(month)}` : `Labour payment, ${monthName(month)}`;

  return (
    <section aria-label="Month sheet" className="rounded border border-stone-300">
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Month sheet</h2>
          <p className="text-xs text-stone-500">Every labourer, every day: hours, OT, amount, and the month&apos;s account</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded border border-stone-300">
            <button type="button" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month" className="p-2 text-stone-600 hover:text-stone-900">
              <FiChevronLeft aria-hidden />
            </button>
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              aria-label="Month"
              className="h-9 w-36 border-x border-stone-300 bg-white px-2 text-sm focus:outline-none"
            />
            <button type="button" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month" className="p-2 text-stone-600 hover:text-stone-900">
              <FiChevronRight aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setPrinting(true)}
            disabled={!data || data.sheet.rows.length === 0}
            className="flex h-9 items-center gap-2 rounded border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
          >
            <FiPrinter aria-hidden /> Print
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {data && data.contractors.length > 0 && (
          <div>
            <p id="month-contractor" className="mb-1.5 text-sm text-stone-500">
              Contractor
            </p>
            <ChipInput
              id="month-contractor-chips"
              labelledBy="month-contractor"
              value={contractor}
              onChange={(v) => v && setPicked(v)}
              choices={data.contractors.map((c) => c.name)}
              allowCustom={false}
              size="sm"
            />
          </div>
        )}

        {sheet.isPending ? (
          <div aria-busy="true" className="h-48 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />
        ) : sheet.isError ? (
          <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{describeError(sheet.error)}</p>
            <button type="button" onClick={() => sheet.refetch()} className="mt-2 font-medium underline">
              Try again
            </button>
          </div>
        ) : !data?.contractor ? (
          <p className="p-6 text-center text-sm text-stone-500">No attendance yet. Entries saved above show here month by month.</p>
        ) : (
          <div className={`space-y-4 transition-opacity ${sheet.isPlaceholderData ? "opacity-60" : ""}`}>
            {data.sheet.rows.length === 0 ? (
              <p className="rounded border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
                No attendance for {contractor} in {monthName(month)}.
              </p>
            ) : (
              <>
                <ScrollBox>
                  <SheetTable data={data} />
                </ScrollBox>
                <LabourerTotals data={data} />
              </>
            )}
            <StatementCard data={data} month={month} />
          </div>
        )}
      </div>

      {printing && data && (
        <PrintArea id="month-sheet-print" title={title} onDone={() => setPrinting(false)}>
          <style>{`@page { size: A4 landscape; margin: 8mm; }`}</style>
          <div className="text-black">
            <h1 className="text-base font-bold">{title}</h1>
            <p className="mb-2 text-[10px]">
              Printed {formatDay(new Date().toISOString().slice(0, 10))}
            </p>
            <SheetTable data={data} print />
            <div className="mt-3 w-80 text-[10px]">
              <StatementLines data={data} month={month} />
            </div>
            <div className="mt-8 flex justify-between text-[10px]">
              <span>Checked by: ____________________</span>
              <span>Contractor&apos;s signature: ____________________</span>
            </div>
          </div>
        </PrintArea>
      )}
    </section>
  );
}

/** The sheet scrolls sideways inside its card (drag with a mouse, swipe on a phone) */
function ScrollBox({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { edges } = useDragScroll(ref);
  return (
    <div
      ref={ref}
      className={`relative overflow-x-auto rounded border border-stone-200 scrollbar-thin data-[dragging=true]:cursor-grabbing data-[dragging=true]:select-none ${edges.start || edges.end ? "cursor-grab" : ""}`}
    >
      {children}
    </div>
  );
}

/** The sheet itself; `print` makes it small enough for one landscape page, with no sticky column */
function SheetTable({ data, print = false }: { data: MonthResponse; print?: boolean }) {
  const { sheet } = data;
  const totals = print; // on screen the totals have their own table below, so the days fit
  const days = useMemo(() => Array.from({ length: sheet.daysInMonth }, (_, i) => i + 1), [sheet.daysInMonth]);
  const anyHourly = sheet.rows.some((r) => r.hourly);
  const t = print ? "text-[7px] leading-tight" : "text-xs";
  const c = print ? "border border-stone-400 px-0.5 py-px" : "border-b border-r border-stone-200 px-1 py-1";
  const name = print ? `${c} text-left font-semibold whitespace-nowrap overflow-hidden text-ellipsis` : `${c} sticky left-0 z-10 min-w-32 whitespace-nowrap bg-white text-left font-semibold`;
  const num = `${c} text-right tabular-nums`;
  const day = print ? `${c} text-center tabular-nums` : `${c} min-w-8 text-center tabular-nums`;

  return (
    <table className={`w-full border-separate border-spacing-0 ${t} ${print ? "table-fixed border-collapse" : ""}`}>
      {print && (
        // Paper: names and totals get the room they need, the days share the rest
        <colgroup>
          <col style={{ width: "11%" }} />
          {days.map((d) => (
            <col key={d} />
          ))}
          <col style={{ width: "3.6%" }} />
          {anyHourly && <col style={{ width: "4.8%" }} />}
          <col style={{ width: "6.6%" }} />
          <col style={{ width: "7%" }} />
        </colgroup>
      )}
      <thead>
        <tr className="bg-stone-50 text-stone-600">
          <th scope="col" className={`${name} bg-stone-50!`}>
            Labourer
          </th>
          {days.map((d) => (
            <th key={d} scope="col" className={`${day} font-semibold`}>
              {d}
            </th>
          ))}
          {totals && (
            <>
              <th scope="col" className={`${num} font-semibold`}>
                Hours
              </th>
              {anyHourly && (
                <th scope="col" className={`${num} font-semibold`}>
                  Rate/h
                </th>
              )}
              <th scope="col" className={`${num} font-semibold`}>
                Amount
              </th>
              <th scope="col" className={`${num} font-semibold`}>
                Total
              </th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {sheet.rows.map((r) => (
          <SheetRows key={r.key} row={r} days={days} anyHourly={anyHourly} totals={totals} name={name} num={num} day={day} />
        ))}
        {sheet.extrasTotal > 0 && (
          <tr>
            <th scope="row" className={name}>
              Extras
            </th>
            {days.map((d) => (
              <td key={d} className={day}>
                {sheet.extras[String(d)] ? Math.round(sheet.extras[String(d)]!) : ""}
              </td>
            ))}
            {totals && (
              <>
                <td className={num} />
                {anyHourly && <td className={num} />}
                <td className={num}>{rupees(sheet.extrasTotal)}</td>
                <td className={`${num} font-semibold`}>{rupees(sheet.extrasTotal)}</td>
              </>
            )}
          </tr>
        )}
      </tbody>
      {totals && (
      <tfoot>
        <tr className="bg-stone-50 font-semibold text-stone-900">
          <th scope="row" className={`${name} bg-stone-50!`}>
            Total
          </th>
          {days.map((d) => (
            <td key={d} className={day} />
          ))}
          <td className={num}>
            {hrs(sheet.totals.hours)}
            {sheet.totals.otHours ? <span className="block text-orange-800">+{hrs(sheet.totals.otHours)}</span> : null}
          </td>
          {anyHourly && <td className={num} />}
          <td className={num}>
            {rupees(sheet.totals.amount)}
            {sheet.totals.otAmount ? <span className="block text-orange-800">+{rupees(sheet.totals.otAmount)}</span> : null}
          </td>
          <td className={`${num} ${print ? "" : "text-sm"}`}>{rupees(sheet.totals.total)}</td>
        </tr>
      </tfoot>
      )}
    </table>
  );
}

/** One labourer: hours and OT rows when paid hourly (like the paper sheet), else one row of amounts */
function SheetRows({ row: r, days, anyHourly, totals, name, num, day }: { row: MonthSheetRow; days: number[]; anyHourly: boolean; totals: boolean; name: string; num: string; day: string }) {
  if (!r.hourly) {
    return (
      <tr>
        <th scope="row" className={name}>
          {r.name}
        </th>
        {days.map((d) => (
          <td key={d} className={day}>
            {r.days[String(d)] ? Math.round(r.days[String(d)]!.amount) : ""}
          </td>
        ))}
        {totals && (
          <>
            <td className={num} />
            {anyHourly && <td className={num} />}
            <td className={num}>{rupees(r.amount)}</td>
            <td className={`${num} font-semibold`}>{rupees(r.total)}</td>
          </>
        )}
      </tr>
    );
  }
  return (
    <Fragment>
      <tr>
        <th scope="row" className={name}>
          {r.name}
        </th>
        {days.map((d) => (
          <td key={d} className={day}>
            {hrs(r.days[String(d)]?.hours ?? 0)}
          </td>
        ))}
        {totals && (
          <>
            <td className={num}>{hrs(r.hours)}</td>
            <td className={num}>{rate(r.hourlyRate)}</td>
            <td className={num}>{rupees(r.amount)}</td>
            <td rowSpan={2} className={`${num} align-middle font-semibold`}>
              {rupees(r.total)}
            </td>
          </>
        )}
      </tr>
      <tr className="bg-orange-50/60 text-orange-900">
        <th scope="row" className={`${name} bg-orange-50! font-medium`}>
          <span className="sr-only">{r.name}, </span>OT
        </th>
        {days.map((d) => (
          <td key={d} className={day}>
            {hrs(r.days[String(d)]?.ot ?? 0)}
          </td>
        ))}
        {totals && (
          <>
            <td className={num}>{hrs(r.otHours)}</td>
            <td className={num}>{rate(r.hourlyRate)}</td>
            <td className={num}>{r.otAmount ? rupees(r.otAmount) : ""}</td>
          </>
        )}
      </tr>
    </Fragment>
  );
}

/** Each labourer's month: hours and amount, OT and its amount, and the total (the sheet's right-hand columns) */
function LabourerTotals({ data }: { data: MonthResponse }) {
  const { rows, totals, extrasTotal } = data.sheet;
  const th = "px-3 py-2 text-right font-medium";
  const td = "px-3 py-2 text-right tabular-nums";
  return (
    <div className="relative overflow-x-auto rounded border border-stone-200">
      <table className="w-full text-sm">
        <caption className="px-3 py-2 text-left text-sm font-semibold text-stone-900">Totals by labourer</caption>
        <thead className="border-y border-stone-200 bg-stone-50 text-xs text-stone-500">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Labourer
            </th>
            <th scope="col" className={th}>
              Rate / day
            </th>
            <th scope="col" className={th}>
              Hours
            </th>
            <th scope="col" className={th}>
              Amount
            </th>
            <th scope="col" className={`${th} text-orange-800`}>
              OT hours
            </th>
            <th scope="col" className={`${th} text-orange-800`}>
              OT amount
            </th>
            <th scope="col" className={th}>
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium">
                {r.name}
              </th>
              <td className={`${td} text-stone-500`}>{r.dayRate !== null ? rupees(r.dayRate) : "Typed"}</td>
              <td className={td}>{r.hourly ? hrs(r.hours) || "0" : "–"}</td>
              <td className={td}>{rupees(r.amount)}</td>
              <td className={`${td} text-orange-800`}>{r.hourly ? hrs(r.otHours) || "0" : "–"}</td>
              <td className={`${td} text-orange-800`}>{r.otAmount ? rupees(r.otAmount) : "–"}</td>
              <td className={`${td} font-semibold`}>{rupees(r.total)}</td>
            </tr>
          ))}
          {extrasTotal > 0 && (
            <tr>
              <th scope="row" className="px-3 py-2 text-left font-medium">
                Extras
              </th>
              <td colSpan={5} />
              <td className={`${td} font-semibold`}>{rupees(extrasTotal)}</td>
            </tr>
          )}
        </tbody>
        <tfoot className="border-t-2 border-stone-300 font-semibold">
          <tr>
            <th scope="row" className="px-3 py-2 text-left">
              {rows.length} {rows.length === 1 ? "labourer" : "labourers"}
            </th>
            <td />
            <td className={td}>{hrs(totals.hours) || "–"}</td>
            <td className={td}>{rupees(totals.amount)}</td>
            <td className={`${td} text-orange-800`}>{hrs(totals.otHours) || "–"}</td>
            <td className={`${td} text-orange-800`}>{totals.otAmount ? rupees(totals.otAmount) : "–"}</td>
            <td className={`${td} text-base`}>{rupees(totals.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** The month's account, on screen */
function StatementCard({ data, month }: { data: MonthResponse; month: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="rounded border border-stone-200 p-4 text-sm">
        <h3 className="mb-2 font-semibold">Account for {monthName(month)}</h3>
        <StatementLines data={data} month={month} />
      </div>
      <div className="rounded border border-stone-200 p-4 text-sm">
        <h3 className="mb-2 font-semibold">Payments this month</h3>
        {data.statement.payments.length === 0 ? (
          <p className="text-stone-500">None recorded. Add them under Payments on the Labour page.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {data.statement.payments.map((p) => (
              <li key={p.id} className="flex items-baseline gap-3 py-1.5">
                <span className="w-24 shrink-0 tabular-nums text-stone-500">{formatDay(p.date)}</span>
                <span className="min-w-0 flex-1 truncate text-stone-600">{p.remark || "—"}</span>
                <span className="font-semibold tabular-nums">{rupees(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Owed from before + this month − paid = carried forward; used on screen and on paper */
function StatementLines({ data, month }: { data: MonthResponse; month: string }) {
  const s = data.statement;
  const line = "flex items-baseline justify-between gap-4 py-0.5";
  const signed = (n: number) => (n < 0 ? `− ${rupees(-n)}` : rupees(n));
  return (
    <dl>
      <div className={line}>
        <dt className="text-stone-600">{s.opening < 0 ? "Paid in advance before" : "Owed from before"} {monthName(month)}</dt>
        <dd className="tabular-nums">{signed(s.opening)}</dd>
      </div>
      <div className={line}>
        <dt className="text-stone-600">This month&apos;s attendance</dt>
        <dd className="tabular-nums">+ {rupees(s.earned)}</dd>
      </div>
      <div className={`${line} border-t border-stone-200`}>
        <dt className="text-stone-600">Payable</dt>
        <dd className="font-medium tabular-nums">{signed(s.opening + s.earned)}</dd>
      </div>
      <div className={line}>
        <dt className="text-stone-600">
          Paid this month{s.payments.length ? ` (${s.payments.length})` : ""}
        </dt>
        <dd className="tabular-nums">− {rupees(s.paid)}</dd>
      </div>
      <div className={`${line} border-t-2 border-stone-900 pt-1`}>
        <dt className="font-semibold">{s.closing < 0 ? "Paid in advance" : "Carried to next month"}</dt>
        <dd className={`font-bold tabular-nums ${s.closing > 0 ? "text-amber-700" : ""}`}>{rupees(Math.abs(s.closing))}</dd>
      </div>
    </dl>
  );
}