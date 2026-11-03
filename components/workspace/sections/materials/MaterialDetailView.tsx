"use client";

import { lazy, Suspense, useState, type ReactNode } from "react";
import { FiArrowDown, FiArrowUp, FiEdit2, FiFileText, FiTrash2 } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useDeleteEstimate, useMaterialEstimates } from "@/hooks/useMaterialEstimates";
import { useMaterialDetail } from "@/hooks/useMaterialsTab";
import { describeError } from "@/lib/api";
import { rupees } from "@/lib/projects/hub";
import { qty, type LogEntry, type MaterialDetail } from "@/lib/inventory/materialsTab";
import type { MaterialEstimate } from "@/lib/inventory/estimates";
import { SectionError, SectionSkeleton } from "../../ui";
import { BarChart, Legend } from "./BarChart";
import { MoveDialog, type MoveMode } from "./MoveDialog";

const AddMaterialDialog = lazy(() => import("./AddMaterialDialog").then((m) => ({ default: m.AddMaterialDialog })));

const day = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const fmtDay = (ymd: string) => day.format(new Date(`${ymd}T00:00:00Z`));

const KIND: Record<LogEntry["type"], { label: string; sign: 1 | -1 | 0; tone: string }> = {
  RECEIVED: { label: "Received", sign: 1, tone: "text-emerald-700" },
  ISSUED: { label: "Issued", sign: -1, tone: "text-rose-700" },
  ADJUSTMENT_IN: { label: "Corrected up", sign: 1, tone: "text-emerald-700" },
  ADJUSTMENT_OUT: { label: "Corrected down", sign: -1, tone: "text-rose-700" },
  RESERVED: { label: "Set aside", sign: 0, tone: "text-stone-500" },
  RELEASED: { label: "Released", sign: 0, tone: "text-stone-500" },
};

/**
 * One material: Required · In stock · Issued at the top, the bar graph of what came in and went out each month,
 * what needs it (BOQ sections and what was added by hand), and the log of every receipt and issue, newest first.
 */
export default function MaterialDetailView({ projectId, materialId }: { projectId: string; materialId: string }) {
  const detail = useMaterialDetail(projectId, materialId);
  const canReceive = useCan("stock.receive");
  const canIssue = useCan("stock.issue");
  const canAdjust = useCan("stock.adjust");
  const [moving, setMoving] = useState<MoveMode | null>(null);

  if (detail.isPending) return <SectionSkeleton />;
  if (detail.isError) return <SectionError error={detail.error} onRetry={() => void detail.refetch()} />;
  const d = detail.data;
  const unit = d.material.unit;
  const btn = "flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:border-stone-500 hover:text-stone-900";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold text-stone-900">{d.material.name}</h2>
          <p className="text-sm text-stone-500">
            Counted in {unit}
            {d.material.rate > 0 && ` · ${rupees(d.material.rate)} per ${unit}`}
          </p>
        </div>
        <div className="flex gap-2">
          {canReceive && (
            <button type="button" onClick={() => setMoving("RECEIVED")} className={btn}>
              <FiArrowDown aria-hidden className="text-emerald-700" /> Received
            </button>
          )}
          {canIssue && (
            <button type="button" onClick={() => setMoving("ISSUED")} disabled={d.inStock <= 0} className={`${btn} disabled:opacity-40`}>
              <FiArrowUp aria-hidden className="text-rose-700" /> Issued
            </button>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        <Big label="Required" value={qty(d.needed)} unit={unit} />
        <Big label="In stock" value={qty(d.inStock)} unit={unit} note={canAdjust ? <button type="button" onClick={() => setMoving("CORRECT")} className="font-medium text-stone-600 underline underline-offset-2 hover:text-stone-900">Correct stock</button> : undefined} />
        <Big label="Issued" value={qty(d.issued)} unit={unit} note={d.lastIssued ? `last ${fmtDay(d.lastIssued)}` : "not yet"} />
      </dl>

      <section aria-label="Received and issued by month" className="rounded-xl border border-stone-200 p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-stone-900">Each month, in {unit}</h3>
          <Legend />
        </div>
        <BarChart months={d.months} series={d.chart} format={(n) => `${qty(n)} ${unit}`} axis={(n) => qty(n)} />
        {d.stillNeeded > 0 && (
          <p className="mt-2 text-xs text-stone-500">
            Still to issue {qty(d.stillNeeded)} {unit}
            {d.toOrder > 0 && <span className="text-amber-700"> · still to buy {qty(d.toOrder)} {unit}</span>}
          </p>
        )}
      </section>

      <Needs projectId={projectId} d={d} />
      <Log entries={d.log} unit={unit} />

      {moving && <MoveDialog projectId={projectId} material={{ id: d.material.id, name: d.material.name, unit, inStock: d.inStock }} mode={moving} onClose={() => setMoving(null)} />}
    </div>
  );
}

function Big({ label, value, unit, note }: { label: string; value: string; unit: string; note?: ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200 px-3 py-3 sm:px-4">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-1 truncate text-lg font-semibold tabular-nums text-stone-900 sm:text-xl">
        {value} <span className="text-xs font-normal text-stone-400">{unit}</span>
      </dd>
      {note && <dd className="mt-0.5 truncate text-xs text-stone-500">{note}</dd>}
    </div>
  );
}

/** What needs this material: BOQ items by section, and what was added by hand (editable here) */
function Needs({ projectId, d }: { projectId: string; d: MaterialDetail }) {
  const canEdit = useCan("requirements.create");
  const estimates = useMaterialEstimates(projectId);
  const remove = useDeleteEstimate(projectId);
  const [editing, setEditing] = useState<MaterialEstimate | null>(null);
  if (d.needs.length === 0) return null;
  const byId = new Map((estimates.data?.items ?? []).map((e) => [e.id, e]));
  const unit = d.material.unit;

  return (
    <section aria-label="Needed for" className="overflow-hidden rounded-xl border border-stone-200">
      <h3 className="border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-900">Needed for</h3>
      <ul className="divide-y divide-stone-100 text-sm">
        {d.needs.map((n) => {
          const est = n.estimateId ? byId.get(n.estimateId) : undefined;
          return (
            <li key={n.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-stone-900">{n.label || n.section}</span>
                <span className="block truncate text-xs text-stone-500">
                  {n.estimateId ? "Added by hand" : n.section}
                  {n.issued > 0 && ` · issued ${qty(n.issued)} ${unit}`}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {qty(n.required)} {unit}
              </span>
              {canEdit && est && (
                <span className="flex shrink-0">
                  <button type="button" onClick={() => setEditing(est)} aria-label={`Edit ${n.label || "this need"}`} className="rounded p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-900">
                    <FiEdit2 aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Remove ${qty(n.required)} ${unit}${n.label ? ` for ${n.label}` : ""} from what's needed?`)) remove.mutate(est.id);
                    }}
                    aria-label={`Remove ${n.label || "this need"}`}
                    className="rounded p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    <FiTrash2 aria-hidden />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {remove.isError && (
        <p role="alert" className="px-4 pb-2 text-sm text-red-700">
          {describeError(remove.error)}
        </p>
      )}
      {editing && (
        <Suspense fallback={null}>
          <AddMaterialDialog projectId={projectId} editing={editing} onClose={() => setEditing(null)} />
        </Suspense>
      )}
    </section>
  );
}

/** Every receipt and issue, newest first: date, what, note (vendor, bill), who, and ± quantity */
function Log({ entries, unit }: { entries: LogEntry[]; unit: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? entries : entries.slice(0, 15);
  return (
    <section aria-label="Log" className="overflow-hidden rounded-xl border border-stone-200">
      <h3 className="border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-900">Log</h3>
      {entries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-stone-500">Nothing received or issued yet.</p>
      ) : (
        <ul className="divide-y divide-stone-100 text-sm">
          {shown.map((e) => {
            const k = KIND[e.type];
            const details = [e.vendorName, e.note, e.boqItem ? [e.boqItem.code, e.boqItem.title].filter(Boolean).join(" ") : ""].filter(Boolean).join(" · ");
            return (
              <li key={e.id} className="flex items-start gap-3 px-4 py-2.5">
                <span className="w-24 shrink-0 pt-0.5 text-xs tabular-nums text-stone-500">{fmtDay(e.date)}</span>
                <span className="min-w-0 flex-1">
                  <span className={`font-medium ${k.tone}`}>{k.label}</span>
                  {details && <span className="text-stone-600"> · {details}</span>}
                  <span className="block text-xs text-stone-400">
                    {e.by}
                    {e.billUrl && (
                      <>
                        {" · "}
                        <a href={e.billUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-stone-600 underline underline-offset-2">
                          <FiFileText aria-hidden /> Bill
                        </a>
                      </>
                    )}
                  </span>
                </span>
                <span className={`shrink-0 pt-0.5 font-semibold tabular-nums ${k.tone}`}>
                  {k.sign > 0 ? "+ " : k.sign < 0 ? "− " : ""}
                  {qty(e.quantity)} <span className="text-xs font-normal text-stone-400">{unit}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {entries.length > 15 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="w-full border-t border-stone-100 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50">
          {all ? "Show fewer" : `Show all ${entries.length}`}
        </button>
      )}
    </section>
  );
}