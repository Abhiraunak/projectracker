"use client";

import { PrintArea } from "@/components/utilites/PrintArea";
import { qty, totalAt, type RegisterItem, type SiteItem } from "@/lib/equipment/api";
import { rupees } from "@/lib/projects/hub";
import { CATEGORY_LABEL, longDate, todayLocal } from "./shared";

const COMPANY = "street-house";
const th = "border-b-2 border-black py-2 pr-3 text-left font-semibold";
const td = "border-b border-stone-300 py-1.5 pr-3 align-top";

/** The whole register: every item, how many, and where they are */
export function PrintRegister({ items, heading, onDone }: { items: RegisterItem[]; heading: string; onDone: () => void }) {
  const title = `${COMPANY} equipment list`;
  return (
    <PrintArea id="equipment-print-root" title={title} onDone={onDone}>
      <Header title={title} sub={heading} count={items.length} />
      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={th}>No.</th>
            <th className={th}>Name</th>
            <th className={th}>Kind</th>
            <th className={`${th} text-right`}>Total</th>
            <th className={`${th} text-right`}>Yard</th>
            <th className={th}>At sites</th>
            <th className={th}>Owned / hired</th>
            <th className={`${th} text-right`}>Cost</th>
            <th className={`${th} text-right`}>Market value</th>
            <th className={th}>Maker&apos;s serial</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td className={`${td} whitespace-nowrap font-mono`}>{i.number}</td>
              <td className={td}>{i.name}</td>
              <td className={td}>{CATEGORY_LABEL[i.category]}</td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                {qty(i.total)} {i.unit}
              </td>
              <td className={`${td} text-right tabular-nums`}>{i.yard ? qty(i.yard) : "-"}</td>
              <td className={td}>{i.sites.length ? i.sites.map((s) => `${s.title}: ${qty(s.qty)}`).join(", ") : "-"}</td>
              <td className={td}>{i.ownership === "hired" ? `Hired${i.supplier ? ` (${i.supplier})` : ""}` : "Owned"}</td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{money(totalAt(i.total, i.unitCost))}</td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{money(totalAt(i.total, i.marketValue))}</td>
              <td className={td}>{i.code ?? "-"}</td>
            </tr>
          ))}
        </tbody>
        <TotalsRow before={7} items={items.map((i) => [totalAt(i.total, i.unitCost), totalAt(i.total, i.marketValue)])} after={1} />
      </table>
      <Footer />
    </PrintArea>
  );
}

/** One site: what is there now, how many, and since when */
export function PrintSite({ items, site, onDone }: { items: SiteItem[]; site: string; onDone: () => void }) {
  const title = `Equipment at ${site}`;
  return (
    <PrintArea id="equipment-print-root" title={title} onDone={onDone}>
      <Header title={title} sub={COMPANY} count={items.length} />
      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={th}>No.</th>
            <th className={th}>Name</th>
            <th className={th}>Kind</th>
            <th className={`${th} text-right`}>Here</th>
            <th className={th}>Since</th>
            <th className={th}>Owned / hired</th>
            <th className={`${th} text-right`}>Cost</th>
            <th className={`${th} text-right`}>Market value</th>
            <th className={th}>Maker&apos;s serial</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td className={`${td} whitespace-nowrap font-mono`}>{i.number}</td>
              <td className={td}>{i.name}</td>
              <td className={td}>{CATEGORY_LABEL[i.category]}</td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                {qty(i.here)} {i.unit}
              </td>
              <td className={`${td} whitespace-nowrap`}>{i.since ? longDate(i.since) : "-"}</td>
              <td className={td}>{i.ownership === "hired" ? `Hired${i.supplier ? ` (${i.supplier})` : ""}` : "Owned"}</td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{money(totalAt(i.here, i.unitCost))}</td>
              <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{money(totalAt(i.here, i.marketValue))}</td>
              <td className={td}>{i.code ?? "-"}</td>
            </tr>
          ))}
        </tbody>
        <TotalsRow before={6} items={items.map((i) => [totalAt(i.here, i.unitCost), totalAt(i.here, i.marketValue)])} after={1} />
      </table>
      <Footer />
    </PrintArea>
  );
}

const money = (v: number | null) => (v === null ? "-" : rupees(v));

/** The bottom line: total cost and total market value of everything listed */
function TotalsRow({ before, items, after }: { before: number; items: [number | null, number | null][]; after: number }) {
  const cost = items.reduce((s, [c]) => s + (c ?? 0), 0);
  const value = items.reduce((s, [, v]) => s + (v ?? 0), 0);
  if (!cost && !value) return null;
  return (
    <tfoot>
      <tr className="border-t-2 border-black">
        <td colSpan={before} className="py-2 pr-3 text-right font-bold">
          Total
        </td>
        <td className="whitespace-nowrap py-2 pr-3 text-right font-bold tabular-nums">{rupees(cost)}</td>
        <td className="whitespace-nowrap py-2 pr-3 text-right font-bold tabular-nums">{rupees(value)}</td>
        <td colSpan={after} />
      </tr>
    </tfoot>
  );
}

function Header({ title, sub, count }: { title: string; sub: string; count: number }) {
  return (
    <div className="flex items-end justify-between gap-6 border-b-2 border-black pb-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm">{sub}</p>
      </div>
      <dl className="text-right text-sm">
        <div>
          <dt className="inline font-semibold">Printed: </dt>
          <dd className="inline">{longDate(todayLocal())}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Items: </dt>
          <dd className="inline">{count}</dd>
        </div>
      </dl>
    </div>
  );
}

function Footer() {
  return (
    <div className="mt-12 flex justify-between gap-8 text-sm">
      <p className="w-56 border-t border-black pt-1">Checked by</p>
      <p className="w-56 border-t border-black pt-1 text-right">Signature</p>
    </div>
  );
}