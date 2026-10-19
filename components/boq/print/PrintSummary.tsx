import type { BoqTotals } from "@/lib/boq/calc";
import { fmtLakhs, fmtMoney, fmtPercent } from "@/lib/boq/format";
import type { BoqDocument } from "@/lib/boq/types";

/** The SUMMARY page as printed, with the signature block */
export function PrintSummary({ doc, totals }: { doc: BoqDocument; totals: BoqTotals }) {
  const including = totals.additions.map((a) => a.adjustment.label).filter(Boolean).join(", ");
  return (
    <section>
      <table>
        <thead>
          <tr className="shade">
            <th style={{ width: "8%" }}>S. No.</th>
            <th>SECTIONS</th>
            <th style={{ width: "12%" }}>Rs.</th>
            <th style={{ width: "22%" }} className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {totals.sheets.map(({ sheet, total }, i) => (
            <tr key={sheet.id}>
              <td className="center">{i + 1}</td>
              <td>{sheet.name}</td>
              <td>Rs.</td>
              <td className="num">{fmtMoney(total)}</td>
            </tr>
          ))}
          <tr className="bold shade">
            <td />
            <td>TOTAL- A</td>
            <td>Rs.</td>
            <td className="num">{fmtMoney(totals.totalA)}</td>
          </tr>
          {totals.deductions.map(({ adjustment, amount }) => (
            <tr key={adjustment.id}>
              <td />
              <td>{adjustment.label}</td>
              <td>{fmtPercent(adjustment.percent)}</td>
              <td className="num">{fmtMoney(amount)}</td>
            </tr>
          ))}
          {totals.deductions.length > 0 && (
            <tr className="bold shade">
              <td />
              <td>TOTAL- B (after deductions)</td>
              <td>Rs.</td>
              <td className="num">{fmtMoney(totals.totalB)}</td>
            </tr>
          )}
          {totals.additions.map(({ adjustment, amount }) => (
            <tr key={adjustment.id}>
              <td />
              <td>{adjustment.label}</td>
              <td>{fmtPercent(adjustment.percent)}</td>
              <td className="num">{fmtMoney(amount)}</td>
            </tr>
          ))}
          <tr className="bold shade">
            <td colSpan={2}>{including ? `TOTAL (Including ${including})` : "TOTAL"}</td>
            <td>Rs.</td>
            <td className="num">{fmtMoney(totals.grandTotal)}</td>
          </tr>
          <tr className="bold">
            <td colSpan={3}>Say</td>
            <td className="num">{fmtLakhs(totals.sayLakhs)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "36pt" }}>
        {(["left", "right"] as const).map((side) => (
          <div key={side} style={{ width: "45%", textAlign: side === "right" ? "right" : "left" }}>
            <div>{doc.signatures[`${side}Label` as const]}</div>
            <div style={{ height: "36pt" }} />
            <div className="bold" style={{ borderTop: "0.5pt solid #000", paddingTop: "2pt" }}>{doc.signatures[`${side}Name` as const] || "\u00a0"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
