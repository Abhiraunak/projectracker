"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { AttendanceRecord, OpenSheet, Register } from "@/lib/attendanceApi";
import { formatDay, rupees } from "@/lib/attendance/form";
import { shortDay, weekday } from "@/lib/attendance/days";

/**
 * A contractor's open sheet, printed: labourers down, days across (12 days to a table, more continue on the next
 * page), each labourer's hours and amount, the day totals, and what is still to pay. A4 landscape with "Page X of Y"
 * at the bottom of every page, like the BOQ print (Chrome and Edge print it; Firefox and Safari leave it out).
 */
const CSS = `
  @page {
    size: A4 landscape;
    margin: 10mm 10mm 14mm;
    @bottom-center {
      content: "Page " counter(page) " of " counter(pages);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8pt;
      color: #555;
    }
  }
  @media print {
    body.printing-register > *:not(#register-print-root) { display: none !important; }
    body.printing-register > #attendance-print-root { display: none !important; }
    body.printing-register > #register-print-root { display: block !important; }
    html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
    #register-print-root { color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; line-height: 1.3; }
    #register-print-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    #register-print-root table { border-collapse: collapse; width: 100%; margin-top: 6pt; }
    #register-print-root th, #register-print-root td { border: 0.5pt solid #999; padding: 2pt 4pt; }
    #register-print-root thead { display: table-header-group; }
    #register-print-root tr { break-inside: avoid; }
    #register-print-root .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    #register-print-root .center { text-align: center; }
    #register-print-root .shade { background: #f2f2f2; }
    #register-print-root .break { break-before: page; }
  }
`;

const DAYS_PER_TABLE = 12;
const chunk = <T,>(list: T[], n: number) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));
const key = (label: string) => label.trim().toLowerCase();

/** "8", "8 + 2 OT", or the rupees when paid by amount */
function cell(w: AttendanceRecord["workers"][number] | undefined) {
  if (!w) return "–";
  if (w.hours === null || w.hours === undefined) return rupees(w.amount);
  return w.otHours ? `${w.hours} + ${w.otHours}` : String(w.hours);
}

export function RegisterPrint({ open, register, projectTitle, onDone }: { open: OpenSheet; register: Register; projectTitle?: string; onDone: () => void }) {
  const days: AttendanceRecord[] = open.sheet?.days ?? [];

  // Print once it is on the page, then clean up
  useEffect(() => {
    document.body.classList.add("printing-register");
    const done = () => {
      document.body.classList.remove("printing-register");
      onDone();
    };
    window.addEventListener("afterprint", done, { once: true });
    const t = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", done);
      document.body.classList.remove("printing-register");
    };
  }, [onDone]);

  // Labourers in the order they first appear, with their latest rate and totals over the open days
  const people = new Map<string, { label: string; rate: number | null; hours: number; ot: number; amount: number; hourly: boolean }>();
  for (const d of days)
    for (const w of d.workers) {
      const k = key(w.label);
      const p = people.get(k) ?? { label: w.label, rate: null, hours: 0, ot: 0, amount: 0, hourly: false };
      if (w.hourlyRate) p.rate = w.hourlyRate;
      if (w.hours !== null && w.hours !== undefined) p.hourly = true;
      p.hours += w.hours ?? 0;
      p.ot += w.otHours ?? 0;
      p.amount += w.amount;
      people.set(k, p);
    }
  const rows = [...people.values()];
  const earlier = Math.round((register.toPay - register.openTotal) * 100) / 100;
  const first = days[0]?.date;
  const last = days.at(-1)?.date;

  return (
    <>
      <style>{CSS}</style>
      {createPortal(
        <div id="register-print-root" className="hidden">
          <h1 style={{ fontSize: "16pt", fontWeight: 700, margin: 0 }}>Attendance sheet: {open.contractorName}</h1>
          <p style={{ margin: "3pt 0 0", color: "#333" }}>
            {projectTitle ? `${projectTitle} · ` : ""}
            {first && last ? `${formatDay(first)} to ${formatDay(last)} · ${days.length} ${days.length === 1 ? "day" : "days"} not yet settled` : "No open days"} · printed{" "}
            {formatDay(new Date().toISOString().slice(0, 10))}
          </p>

          {chunk(days, DAYS_PER_TABLE).map((part, pi) => (
            <table key={pi} className={pi > 0 ? "break" : undefined}>
              <thead>
                <tr className="shade">
                  <th className="center" style={{ width: "24pt" }}>No.</th>
                  <th style={{ textAlign: "left" }}>Labourer</th>
                  <th className="num">₹ / hour</th>
                  {part.map((d) => (
                    <th key={d.id} className="center">
                      {weekday(d.date)}
                      <br />
                      {shortDay(d.date)}
                    </th>
                  ))}
                  {pi === chunk(days, DAYS_PER_TABLE).length - 1 && (
                    <>
                      <th className="num">Hours</th>
                      <th className="num">Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.label}>
                    <td className="center">{i + 1}</td>
                    <td>{p.label}</td>
                    <td className="num">{p.rate ? rupees(p.rate) : "–"}</td>
                    {part.map((d) => (
                      <td key={d.id} className="center">
                        {cell(d.workers.find((w) => key(w.label) === key(p.label)))}
                      </td>
                    ))}
                    {pi === chunk(days, DAYS_PER_TABLE).length - 1 && (
                      <>
                        <td className="num">{p.hourly ? `${p.hours}${p.ot ? ` + ${p.ot}` : ""}` : "–"}</td>
                        <td className="num" style={{ fontWeight: 700 }}>
                          {rupees(p.amount)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                <tr className="shade">
                  <td />
                  <td style={{ fontWeight: 700 }}>Day total</td>
                  <td />
                  {part.map((d) => (
                    <td key={d.id} className="num" style={{ fontWeight: 700 }}>
                      {rupees(d.totalAmount)}
                    </td>
                  ))}
                  {pi === chunk(days, DAYS_PER_TABLE).length - 1 && (
                    <>
                      <td />
                      <td className="num" style={{ fontWeight: 700 }}>
                        {rupees(register.openTotal)}
                      </td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          ))}

          <table style={{ width: "50%", marginLeft: "auto", marginTop: "10pt", breakInside: "avoid" }}>
            <tbody>
              <tr>
                <td>These days</td>
                <td className="num">{rupees(register.openTotal)}</td>
              </tr>
              <tr>
                <td>{earlier < 0 ? "Paid in advance earlier" : "Still owed from settled weeks"}</td>
                <td className="num">{rupees(Math.abs(earlier))}</td>
              </tr>
              <tr className="shade">
                <td style={{ fontWeight: 700 }}>Still to pay</td>
                <td className="num" style={{ fontWeight: 700 }}>
                  {rupees(register.toPay)}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "36pt", breakInside: "avoid" }}>
            <span style={{ borderTop: "0.5pt solid #000", paddingTop: "3pt", width: "160pt", textAlign: "center" }}>Contractor / team head</span>
            <span style={{ borderTop: "0.5pt solid #000", paddingTop: "3pt", width: "160pt", textAlign: "center" }}>Site engineer</span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}