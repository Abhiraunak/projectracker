"use client";

import { useQuery } from "@tanstack/react-query";
import { useClientProject } from "@/hooks/useClientAdmin";
import { useExpenses } from "@/hooks/useExpenses";
import { labourSummaryKey } from "@/hooks/useLabour";
import { materialPaymentsKey } from "@/hooks/useMaterialPayments";
import { useAccess } from "@/hooks/useProjectAccess";
import { useProjectHub } from "@/hooks/useProjectHub";
import { rupees, rupeesShort } from "@/lib/projects/hub";
import { labourApi } from "@/lib/projects/labour";
import { materialPaymentsApi } from "@/lib/inventory/materialPayments";
import { RadarChart } from "./RadarChart";

const COLORS = { labour: "#3b6fd8", materials: "#e08a1e", expenses: "#8a8780", spent: "#3b6fd8", paid: "#1d9e75" };

/**
 * The top of the Expenditure tab, from figures the project already has (nothing new is saved):
 *  1. project cost against what's spent, and what's left (the profit if nothing more were spent);
 *  2. a radar of where the money goes: spent (earned / delivered) against paid out, by category;
 *  3. money in (from the client) against money out, and what's in hand (admins only: client payments are theirs).
 * Each part shows only what this person may see.
 */
export function MoneyOverview({ projectId }: { projectId: string }) {
  const access = useAccess();
  const hub = useProjectHub(projectId);
  const expenses = useExpenses(projectId);
  // Same keys as the Labour and Materials pages, so their figures are shared and refresh together
  const labour = useQuery({ queryKey: labourSummaryKey(projectId), queryFn: () => labourApi.summary(projectId), enabled: access.can("attendance.view"), staleTime: 30_000 });
  const vendors = useQuery({ queryKey: materialPaymentsKey(projectId), queryFn: () => materialPaymentsApi.list(projectId), enabled: access.can("materials.view"), staleTime: 30_000 });
  const client = useClientProject(access.isAdmin ? projectId : null);

  if (!hub.data || !expenses.data) return <div aria-busy="true" className="h-72 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />;

  const h = hub.data;
  const cat = expenses.data.byCategory;
  const general = cat?.general.total ?? expenses.data.total;
  const labourExp = cat?.labour.total ?? 0;
  const materialExp = cat?.material.total ?? 0;

  // Spent: what the work has cost so far. Paid: what has actually gone out.
  const labourSpent = labour.data?.labour ?? h.labour.earned;
  const labourPaid = labour.data?.paid ?? h.labour.paid;
  const materialSpent = h.materials?.spent ?? vendors.data?.totals.bought ?? 0;
  const materialPaid = vendors.data?.totals.paid ?? 0;
  const expensesTotal = general + labourExp + materialExp;
  const spent = labourSpent + materialSpent + expensesTotal;
  const paidOut = labourPaid + materialPaid + expensesTotal;

  const budget = h.money.budget;
  const hasBudget = h.money.budgetIsSet && budget > 0;
  const left = budget - spent;
  const done = h.progress.percent;
  const spentPct = hasBudget ? Math.round((spent / budget) * 100) : null;
  // If spending keeps pace with the work, the project ends at about this
  const likelyFinal = done >= 5 ? spent / (done / 100) : null;

  const received = client.data?.payments.paid ?? null;

  return (
    <div className="space-y-4">
      {/* 1 · project cost vs spent */}
      <section aria-label="Project cost and spending" className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-stone-900">Project cost vs spent</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Project cost" value={hasBudget ? rupeesShort(budget) : "Not set"} note={hasBudget ? undefined : "Set it in Edit project"} />
          <Stat label="Spent so far" value={rupeesShort(spent)} note={spentPct !== null ? `${spentPct}% of the cost` : undefined} />
          <Stat
            label={left >= 0 ? "Left (profit if no more spend)" : "Over the project cost"}
            value={hasBudget ? rupeesShort(Math.abs(left)) : "–"}
            tone={!hasBudget ? undefined : left >= 0 ? "text-green-700" : "text-red-700"}
          />
          <Stat label="Work done" value={`${done}%`} note="from Progress" />
        </dl>

        <Split
          total={hasBudget ? Math.max(budget, spent) : spent}
          parts={[
            { label: "Labour", value: labourSpent, color: COLORS.labour },
            { label: "Materials", value: materialSpent, color: COLORS.materials },
            { label: "Expenses", value: expensesTotal, color: COLORS.expenses },
          ]}
          left={hasBudget ? Math.max(0, left) : 0}
        />

        {hasBudget && likelyFinal !== null && spent > 0 && (
          <p className="mt-3 text-sm text-stone-600">
            {spentPct}% spent at {done}% done. If spending keeps that pace, the project ends at about{" "}
            <b className="font-semibold tabular-nums text-stone-900">{rupeesShort(likelyFinal)}</b>
            {likelyFinal > budget ? (
              <span className="text-red-700">: about {rupeesShort(likelyFinal - budget)} over the project cost.</span>
            ) : (
              <span className="text-green-700">: about {rupeesShort(budget - likelyFinal)} under the project cost.</span>
            )}
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* 2 · where the money goes */}
        <section aria-label="Where the money goes" className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-stone-900">Where the money goes</h2>
            <div className="flex gap-4 text-xs text-stone-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.spent }} /> Spent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.paid }} /> Paid out
              </span>
            </div>
          </div>
          <RadarChart
            axes={["Labour", "Materials", "Labour exp.", "Material exp.", "General"]}
            series={[
              { key: "spent", label: "Spent", color: COLORS.spent, values: [labourSpent, materialSpent, labourExp, materialExp, general] },
              { key: "paid", label: "Paid out", color: COLORS.paid, values: [labourPaid, materialPaid, labourExp, materialExp, general] },
            ]}
            format={rupees}
          />
          <table className="mt-2 w-full text-sm">
            <thead className="text-xs text-stone-500">
              <tr>
                <th scope="col" className="py-1 text-left font-medium">
                  <span className="sr-only">Category</span>
                </th>
                <th scope="col" className="py-1 text-right font-medium">Spent</th>
                <th scope="col" className="py-1 text-right font-medium">Paid</th>
                <th scope="col" className="py-1 text-right font-medium">To pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 tabular-nums">
              <Row label="Labour" spent={labourSpent} paid={labourPaid} />
              <Row label="Materials" spent={materialSpent} paid={materialPaid} />
              <Row label="Expenses" spent={expensesTotal} paid={expensesTotal} note="paid when entered" />
            </tbody>
          </table>
        </section>

        {/* 3 · money in vs out */}
        <section aria-label="Money in and out" className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-stone-900">Money in vs money out</h2>
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {received !== null ? (
              <Stat label="Received from client" value={rupeesShort(received)} note={client.data && client.data.payments.contract > 0 ? `of ${rupeesShort(client.data.payments.contract)} billed` : undefined} />
            ) : (
              <Stat label="Received from client" value="–" note={access.isAdmin ? "Loading…" : "Only admins see client payments"} />
            )}
            <Stat label="Paid out" value={rupeesShort(paidOut)} note="contractors, vendors, expenses" />
            <Stat
              label={received === null ? "In hand" : received - paidOut >= 0 ? "In hand" : "Paid from own pocket"}
              value={received === null ? "–" : rupeesShort(Math.abs(received - paidOut))}
              tone={received === null ? undefined : received - paidOut >= 0 ? "text-green-700" : "text-red-700"}
            />
          </dl>
          <p className="mt-3 text-xs text-stone-500">Still owed: labour {rupeesShort(Math.max(0, labourSpent - labourPaid))}, materials {rupeesShort(Math.max(0, materialSpent - materialPaid))}.</p>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-stone-50 px-3 py-2.5">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${tone ?? "text-stone-900"}`}>{value}</dd>
      {note && <dd className="text-xs text-stone-500">{note}</dd>}
    </div>
  );
}

/** One bar of the project cost: labour, materials, expenses, and what's left */
function Split({ total, parts, left }: { total: number; parts: { label: string; value: number; color: string }[]; left: number }) {
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);
  return (
    <div className="mt-4">
      <div className="flex h-3.5 overflow-hidden rounded-full bg-stone-100" aria-hidden>
        {parts.map((p) => (
          <span key={p.label} style={{ width: `${pct(p.value)}%`, background: p.color }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            {p.label} <b className="font-semibold tabular-nums text-stone-900">{rupeesShort(p.value)}</b>
          </li>
        ))}
        {left > 0 && (
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-stone-300 bg-stone-100" />
            Left <b className="font-semibold tabular-nums text-stone-900">{rupeesShort(left)}</b>
          </li>
        )}
      </ul>
    </div>
  );
}

function Row({ label, spent, paid, note }: { label: string; spent: number; paid: number; note?: string }) {
  const due = Math.max(0, spent - paid);
  return (
    <tr>
      <th scope="row" className="py-1.5 text-left font-medium text-stone-700">
        {label}
        {note && <span className="block text-xs font-normal text-stone-400">{note}</span>}
      </th>
      <td className="py-1.5 text-right">{rupeesShort(spent)}</td>
      <td className="py-1.5 text-right">{rupeesShort(paid)}</td>
      <td className={`py-1.5 text-right ${due > 0 ? "font-semibold text-amber-700" : "text-stone-400"}`}>{due > 0 ? rupeesShort(due) : "–"}</td>
    </tr>
  );
}