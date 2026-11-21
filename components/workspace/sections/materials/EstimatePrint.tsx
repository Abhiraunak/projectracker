"use client";

import { PrintArea } from "@/components/utilites/PrintArea";
import { longDate, todayLocal } from "../equipment/shared";
import { money, qtyText } from "./purchaseFormat";

const COMPANY = "street-house";
const th = "border-b-2 border-black py-2 pr-3 text-left font-semibold";
const td = "border-b border-stone-300 py-1.5 pr-3 align-top";

export interface EstimatePrintLine {
  name: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

/**
 * A Material estimate on paper, printed the same way as the Materials and Equipment lists (PrintArea): each material
 * with its unit, quantity, rate and amount, then the total and space to sign.
 */
export function EstimatePrint({ name, lines, total, onDone }: { name: string; lines: EstimatePrintLine[]; total: number; onDone: () => void }) {
  const title = `Material estimate · ${name}`;
  return (
    <PrintArea id="estimate-print-root" title={title} onDone={onDone}>
      <div className="flex items-end justify-between gap-6 border-b-2 border-black pb-3">
        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="mt-1 text-sm">Material estimate · {COMPANY}</p>
        </div>
        <dl className="text-right text-sm">
          <div>
            <dt className="inline font-semibold">Printed: </dt>
            <dd className="inline">{longDate(todayLocal())}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Materials: </dt>
            <dd className="inline">{lines.length}</dd>
          </div>
        </dl>
      </div>

      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={th}>No.</th>
            <th className={th}>Material</th>
            <th className={th}>Unit</th>
            <th className={`${th} text-right`}>Quantity</th>
            <th className={`${th} text-right`}>Rate</th>
            <th className={`${th} text-right`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className={td}>{i + 1}</td>
              <td className={td}>{l.name}</td>
              <td className={td}>{l.unit || "-"}</td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{qtyText(l.quantity)}</td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{money(l.rate)}</td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{money(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black">
            <td colSpan={5} className="py-2 pr-3 text-right font-bold">
              Total
            </td>
            <td className="whitespace-nowrap py-2 pr-3 text-right font-bold tabular-nums">{money(total)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-12 flex justify-between gap-8 text-sm">
        <p className="w-56 border-t border-black pt-1">Checked by</p>
        <p className="w-56 border-t border-black pt-1 text-right">Signature</p>
      </div>
    </PrintArea>
  );
}