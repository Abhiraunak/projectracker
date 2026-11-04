"use client";

import { useQuery } from "@tanstack/react-query";
import { useExpenses } from "@/hooks/useExpenses";
import { labourSummaryKey } from "@/hooks/useLabour";
import { useProject } from "@/hooks/useLabourProjects";
import { useAccess } from "@/hooks/useProjectAccess";
import { useProjectHub } from "@/hooks/useProjectHub";
import { rupees } from "@/lib/projects/hub";
import { labourApi } from "@/lib/projects/labour";

const COLORS = { labour: "#378ADD", material: "#BA7517", general: "#888780" };

/**
 * The top of the Expenditure tab, kept simple and made only from figures the project already has:
 *  1. what the project should cost (the project cost you set, and the BOQ amount) against what has been spent;
 *  2. one bar each for where it went: labour, material, general;
 *  3. work-wise: what was set for each work, what has been given, and what is left to pay.
 */
export function MoneyOverview({ projectId }: { projectId: string }) {
  const access = useAccess();
  const hub = useProjectHub(projectId);
  const expenses = useExpenses(projectId);
  const project = useProject(projectId); // the work items (Progress)
  // Same key as the Labour page, so the figures are shared and refresh together
  const labour = useQuery({ queryKey: labourSummaryKey(projectId), queryFn: () => labourApi.summary(projectId), enabled: access.can("attendance.view"), staleTime: 30_000 });

  if (!hub.data || !expenses.data) return <div aria-busy="true" className="h-72 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />;

  const h = hub.data;
  const cat = expenses.data.byCategory;
  // Labour is the work done (attendance); labour and material expenses go into their own bar
  const labourSpent = (labour.data?.labour ?? h.labour.earned) + (cat?.labour.total ?? 0);
  const materialSpent = (h.materials?.spent ?? 0) + (cat?.material.total ?? 0);
  const generalSpent = cat?.general.total ?? (cat ? 0 : expenses.data.total);
  const spent = labourSpent + materialSpent + generalSpent;

  const projectCost = h.money.budgetIsSet ? h.money.budget : null;
  const boqTotal = h.boqs && h.boqs.length > 0 ? h.boqs.reduce((s, b) => s + b.grandTotal, 0) : null;
  // Spent is measured against the project cost you set; without one, against the BOQ
  const against = projectCost ?? boqTotal;
  const againstName = projectCost !== null ? "the project cost" : "the BOQ";
  const pct = against ? Math.round((spent / against) * 100) : null;
  const left = against !== null ? against - spent : null;

  return (
    <div className="space-y-4">
      {/* 1 · what it should cost vs what has been spent */}
      <section aria-label="Cost and spent" className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Stat label="Project cost" value={projectCost !== null ? rupees(projectCost) : "Not set"} note={projectCost === null ? "Set it with Edit on the project" : undefined} />
          <Stat label="Total BOQ amount" value={boqTotal !== null ? rupees(boqTotal) : "No BOQ linked"} note={h.boqs && h.boqs.length > 1 ? `${h.boqs.length} BOQs added up` : undefined} />
          <Stat
            label="Spent so far"
            value={rupees(spent)}
            note={pct !== null && left !== null ? (left >= 0 ? `${pct}% of ${againstName} · ${rupees(left)} left` : `${rupees(-left)} over ${againstName}`) : "Labour + material + general"}
            tone={left !== null && left < 0 ? "text-red-700" : undefined}
          />
        </dl>
        {against !== null && against > 0 && (
          <div
            role="progressbar"
            aria-label={`Spent: ${pct}% of ${againstName}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, pct ?? 0)}
            className="mt-4 h-2.5 overflow-hidden rounded-full bg-stone-100"
          >
            <div className={`h-full rounded-full ${left !== null && left < 0 ? "bg-red-600" : "bg-blue-600"}`} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
          </div>
        )}
      </section>

      {/* 2 · where it went */}
      <section aria-label="Where it went" className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-stone-900">Where it went</h2>
        <SpendBars
          parts={[
            { label: "Labour", value: labourSpent, color: COLORS.labour },
            { label: "Material", value: materialSpent, color: COLORS.material },
            { label: "General", value: generalSpent, color: COLORS.general },
          ]}
        />
      </section>

      {/* 3 · work-wise */}
      <WorkTable tasks={project.data?.tasks ?? null} loading={project.isPending} />
    </div>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-stone-50 px-2 py-2.5 sm:px-3">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className={`mt-0.5 truncate text-xl font-semibold tabular-nums ${tone ?? "text-stone-900"}`}>{value}</dd>
      {note && <dd className="text-xs text-stone-500">{note}</dd>}
    </div>
  );
}

/** One bar each, tallest = the biggest spend, the amount on top */
function SpendBars({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...parts.map((p) => p.value));
  return (
    <div className="mt-4">
      <div className="flex h-44 items-end gap-4 border-b border-stone-300 px-2 sm:gap-10 sm:px-6" role="img" aria-label={parts.map((p) => `${p.label} ${rupees(p.value)}`).join(", ")}>
        {parts.map((p) => (
          <div key={p.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            <span className="mb-1 truncate text-xs font-semibold tabular-nums text-stone-800">{rupees(p.value)}</span>
            <span aria-hidden className="block w-full max-w-24 rounded-t-md" style={{ height: `${Math.max(p.value > 0 ? 2 : 0, (p.value / max) * 85)}%`, background: p.color }} />
          </div>
        ))}
      </div>
      <div className="flex gap-4 px-2 pt-1.5 text-center text-sm text-stone-700 sm:gap-10 sm:px-6">
        {parts.map((p) => (
          <span key={p.label} className="min-w-0 flex-1 truncate">
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Each work item: what was set for it (the agreed amount), what has been given, and what is left to pay */
function WorkTable({ tasks, loading }: { tasks: { id: string; work: string; stipulated: number; paid: number }[] | null; loading: boolean }) {
  const th = "px-2 py-2 text-xs sm:px-3 font-medium uppercase tracking-wide text-stone-500";
  const rows = (tasks ?? []).filter((t) => t.work.trim() || t.stipulated > 0 || t.paid > 0);
  const set = rows.reduce((s, t) => s + t.stipulated, 0);
  const given = rows.reduce((s, t) => s + t.paid, 0);
  const leftAll = rows.reduce((s, t) => s + Math.max(0, t.stipulated - t.paid), 0);

  return (
    <section aria-label="Work-wise" className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <h2 className="border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-900">Work-wise</h2>
      {loading ? (
        <div aria-busy="true" className="m-4 h-24 animate-pulse rounded-lg bg-stone-100 motion-reduce:animate-none" />
      ) : rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-stone-500">No work items yet. Add them in Progress.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100">
              <th scope="col" className={`${th} text-left`}>
                Work
              </th>
              <th scope="col" className={`${th} hidden text-right sm:table-cell`}>
                Set for it
              </th>
              <th scope="col" className={`${th} text-right`}>
                Given<span className="sm:hidden"> of set</span>
              </th>
              <th scope="col" className={`${th} text-right`}>
                Left to pay
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 tabular-nums">
            {rows.map((t) => {
              const left = t.stipulated - t.paid;
              return (
                <tr key={t.id}>
                  <th scope="row" className="px-2 py-2.5 sm:px-3 text-left font-medium text-stone-900">
                    {t.work.trim() || "Work item"}
                  </th>
                  <td className="hidden whitespace-nowrap px-2 py-2.5 sm:px-3 text-right text-stone-700 sm:table-cell">{rupees(t.stipulated)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 sm:px-3 text-right text-stone-700">
                    {t.paid > 0 ? rupees(t.paid) : "–"}
                    {/* phone: what was set sits under what was given */}
                    <span className="block text-xs text-stone-500 sm:hidden">of {rupees(t.stipulated)}</span>
                  </td>
                  <td className={`whitespace-nowrap px-2 py-2.5 sm:px-3 text-right font-semibold ${left > 0.5 ? "text-amber-700" : left < -0.5 ? "text-red-700" : "text-emerald-700"}`}>
                    {left > 0.5 ? rupees(left) : left < -0.5 ? `${rupees(-left)} extra` : "Paid"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-stone-300 bg-stone-50 font-semibold tabular-nums text-stone-900">
              <th scope="row" className="px-2 py-2.5 sm:px-3 text-left">
                Total
              </th>
              <td className="hidden whitespace-nowrap px-2 py-2.5 sm:px-3 text-right sm:table-cell">{rupees(set)}</td>
              <td className="whitespace-nowrap px-2 py-2.5 sm:px-3 text-right">
                {rupees(given)}
                <span className="block text-xs font-normal text-stone-500 sm:hidden">of {rupees(set)}</span>
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 sm:px-3 text-right">{rupees(leftAll)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  );
}