"use client";

import { PrintArea } from "@/components/utilites/PrintArea";
import type { Purchase } from "@/lib/inventory/purchases";
import { longDate, todayLocal } from "../equipment/shared";
import { money, qtyText } from "./purchaseFormat";

const COMPANY = "street-house";
const th = "border-b-2 border-black py-2 pr-3 text-left font-semibold";
const td = "border-b border-stone-300 py-1.5 pr-3 align-top";

/**
 * The materials list on paper, printed the same way as the Equipment lists (PrintArea): each material with what was
 * ordered (at the preset rate), what has arrived, what is left, the preset cost and the actual spend, then the totals
 * and space to sign.
 */
export function MaterialsPrint({ items, total, spent, site, onDone }: { items: Purchase[]; total: number; spent: number; site: string; onDone: () => void }) {
  const title = `Materials at ${site}`;
  return (
    <PrintArea id="materials-print-root" title={title} onDone={onDone}>
      <div className="flex items-end justify-between gap-6 border-b-2 border-black pb-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm">{COMPANY}</p>
        </div>
        <dl className="text-right text-sm">
          <div>
            <dt className="inline font-semibold">Printed: </dt>
            <dd className="inline">{longDate(todayLocal())}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Materials: </dt>
            <dd className="inline">{items.length}</dd>
          </div>
        </dl>
      </div>

      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={th}>No.</th>
            <th className={th}>Material</th>
            <th className={th}>Date</th>
            <th className={`${th} text-right`}>Ordered</th>
            <th className={`${th} text-right`}>Rate</th>
            <th className={`${th} text-right`}>Arrived</th>
            <th className={`${th} text-right`}>Left</th>
            <th className={`${th} text-right`}>Preset cost</th>
            <th className={`${th} text-right`}>Actual spend</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p, i) => (
            <tr key={p.id}>
              <td className={td}>{i + 1}</td>
              <td className={td}>
                {p.name}
                {p.note && <span className="block text-xs">{p.note}</span>}
              </td>
              <td className={`${td} whitespace-nowrap`}>{longDate(p.date)}</td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                {qtyText(p.quantity)} {p.unit}
              </td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{money(p.rate)}</td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{p.arrived > 0 ? `${qtyText(p.arrived)} ${p.unit}` : "-"}</td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                {p.state === "extra" ? `${qtyText(p.extra)} extra` : p.toCome > 0 ? `${qtyText(p.toCome)} ${p.unit}` : "-"}
              </td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{money(p.amount)}</td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{money(p.spent ?? 0)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black">
            <td colSpan={7} className="py-2 pr-3 text-right font-bold">
              Total
            </td>
            <td className="whitespace-nowrap py-2 pr-3 text-right font-bold tabular-nums">{money(total)}</td>
            <td className="whitespace-nowrap py-2 pr-3 text-right font-bold tabular-nums">{money(spent)}</td>
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