"use client";

import { memo, useMemo, useState } from "react";
import { FiEdit2, FiFileText, FiImage, FiPlus, FiTrash2 } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useMaterialPurchases, useRemovePurchase } from "@/hooks/useMaterialPurchases";
import { describeError } from "@/lib/api";
import { groupBySection, type Purchase, type SectionGroup } from "@/lib/inventory/purchases";
import { shortDate } from "@/lib/projects/hub";
import { EmptyState, SectionError, SectionSkeleton } from "../ui";
import { ArrivalBar, DeliveryLog } from "./materials/DeliveryLog";
// import { FromBoqDialog } from "./materials/FromBoqDialog"; FiList,
import { PurchaseDialog } from "./materials/PurchaseDialog";
import { money, qtyText } from "./materials/purchaseFormat";

type Dialog = { editing: Purchase | null; section: string };

/**
 * The Materials tab, kept simple: materials listed under their section (Flooring, Concrete…), one table each,
 * with quantity × rate = amount and the bill when there is one. Add material → section, material, quantity, rate.
 */
export default function MaterialsSimple({ projectId }: { projectId: string }) {
  const book = useMaterialPurchases(projectId);
  const canAdd = useCan("stock.receive");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  // const [fromBoq, setFromBoq] = useState(false);
  const [logFor, setLogFor] = useState<string | null>(null); // the material whose deliveries are open
  const groups = useMemo(() => (book.data ? groupBySection(book.data.items, book.data.sections) : []), [book.data]);

  if (book.isPending) return <SectionSkeleton />;
  if (book.isError) return <SectionError error={book.error} onRetry={() => void book.refetch()} />;
  const { items, total, names, sections } = book.data;

  return (
    <div className="space-y-5">
      <section aria-label="Materials total" className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Total spent on materials</p>
          <p className="mt-0.5 text-3xl font-semibold tabular-nums text-stone-900">{money(total)}</p>
          <p className="text-xs text-stone-500">
            {items.length === 0
              ? "Nothing added yet"
              : `${items.length} ${items.length === 1 ? "entry" : "entries"}${sections.length ? ` · ${sections.length} ${sections.length === 1 ? "section" : "sections"}` : ""}`}
          </p>
        </div>
        {canAdd && (
          <div className="flex flex-wrap gap-2">
            {/* <button
              type="button"
              onClick={() => setFromBoq(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:border-stone-500"
            >
              <FiList aria-hidden /> From BOQ
            </button> */}
            <button
              type="button"
              onClick={() => setDialog({ editing: null, section: "" })}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800"
            >
              <FiPlus aria-hidden /> Add material
            </button>
          </div>
        )}
      </section>

      {items.length === 0 ? (
        <EmptyState title="No materials added yet" hint={canAdd ? "Use Add material (e.g. Flooring: 500 sqft tiles at ₹45), or From BOQ to bring in the BOQ's materials." : undefined} />
      ) : (
        groups.map((g) => (
          <SectionTable
            key={g.section || "—"}
            projectId={projectId}
            group={g}
            canEdit={canAdd}
            onAdd={() => setDialog({ editing: null, section: g.section })}
            onEdit={(p) => setDialog({ editing: p, section: p.section })}
            onLog={(p) => setLogFor(p.id)}
          />
        ))
      )}

      {(() => {
        // The open log follows the list, so it updates as soon as a delivery is saved
        const open = logFor ? items.find((i) => i.id === logFor) : null;
        return open ? <DeliveryLog projectId={projectId} purchase={open} canEdit={canAdd} onClose={() => setLogFor(null)} /> : null;
      })()}
      {/* {fromBoq && <FromBoqDialog projectId={projectId} onClose={() => setFromBoq(false)} />} */}
      {dialog && <PurchaseDialog projectId={projectId} names={names} sections={sections} section={dialog.section} editing={dialog.editing} onClose={() => setDialog(null)} />}
    </div>
  );
}

const SectionTable = memo(function SectionTable({
  projectId,
  group: g,
  canEdit,
  onAdd,
  onEdit,
  onLog,
}: {
  projectId: string;
  group: SectionGroup;
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (p: Purchase) => void;
  onLog: (p: Purchase) => void;
}) {
  const title = g.section || "Other materials";
  const th = "px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-stone-500";

  return (
    <section aria-label={title} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-4 py-2.5">
        <h2 className="min-w-0 truncate text-base font-semibold text-stone-900">{title}</h2>
        {canEdit && (
          <button type="button" onClick={onAdd} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-stone-600 hover:bg-white hover:text-stone-900">
            <FiPlus aria-hidden /> Add
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm sm:table-fixed">
          <thead>
            <tr className="border-b border-stone-100">
              <th scope="col" className={`${th} hidden w-10 sm:table-cell`}>
                #
              </th>
              <th scope="col" className={th}>
                Material
              </th>
              <th scope="col" className={`${th} text-right sm:w-32`}>
                Ordered
              </th>
              <th scope="col" className={`${th} hidden md:table-cell md:w-56`}>
                Arrived
              </th>
              <th scope="col" className={`${th} hidden text-right sm:table-cell sm:w-28`}>
                Rate
              </th>
              <th scope="col" className={`${th} text-right sm:w-32`}>
                Amount
              </th>
              <th scope="col" className={`${th} hidden sm:table-cell sm:w-32`}>
                <span className="sr-only">Bill and actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {g.items.map((p, i) => (
              <Row key={p.id} projectId={projectId} n={i + 1} p={p} canEdit={canEdit} onEdit={onEdit} onLog={onLog} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-stone-200 bg-stone-50">
              {/* phone: Material + Ordered; tablet: + # and Rate; wide: + Arrived */}
              <th scope="row" colSpan={2} className="px-3 py-2.5 text-right text-sm font-medium text-stone-600 sm:hidden">
                {g.section ? `${g.section} total` : "Total"}
              </th>
              <th scope="row" colSpan={4} className="hidden px-3 py-2.5 text-right text-sm font-medium text-stone-600 sm:table-cell md:hidden">
                {g.section ? `${g.section} total` : "Total"}
              </th>
              <th scope="row" colSpan={5} className="hidden px-3 py-2.5 text-right text-sm font-medium text-stone-600 md:table-cell">
                {g.section ? `${g.section} total` : "Total"}
              </th>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-stone-900">{money(g.total)}</td>
              <td className="hidden sm:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
});

const Row = memo(function Row({
  projectId,
  n,
  p,
  canEdit,
  onEdit,
  onLog,
}: {
  projectId: string;
  n: number;
  p: Purchase;
  canEdit: boolean;
  onEdit: (p: Purchase) => void;
  onLog: (p: Purchase) => void;
}) {
  const remove = useRemovePurchase(projectId);
  const [confirming, setConfirming] = useState(false);
  const btn = "inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900";

  const actions = confirming ? (
    <span className="inline-flex items-center gap-1">
      <span className="text-stone-600">Delete?</span>
      <button
        type="button"
        disabled={remove.isPending}
        onClick={() => remove.mutate(p.id, { onSettled: () => setConfirming(false) })}
        className="min-h-9 rounded-lg px-2 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {remove.isPending ? "Deleting…" : "Yes"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="min-h-9 rounded-lg px-2 font-medium text-stone-600 hover:bg-stone-100">
        No
      </button>
    </span>
  ) : (
    <span className="inline-flex items-center">
      {p.billUrl ? (
        <a href={p.billUrl} target="_blank" rel="noreferrer" className={btn} aria-label={`Open the bill for ${p.name}`} title="Open the bill">
          {p.billKind === "pdf" ? <FiFileText aria-hidden /> : <FiImage aria-hidden />}
        </a>
      ) : (
        <span aria-hidden className="hidden h-9 w-9 sm:inline-block" /> // keeps the buttons in one column
      )}
      {canEdit && (
        <>
          <button type="button" onClick={() => onEdit(p)} className={btn} aria-label={`Edit ${p.name}`} title="Edit">
            <FiEdit2 aria-hidden />
          </button>
          <button type="button" onClick={() => setConfirming(true)} className={`${btn} hover:bg-red-50 hover:text-red-700`} aria-label={`Delete ${p.name}`} title="Delete">
            <FiTrash2 aria-hidden />
          </button>
        </>
      )}
    </span>
  );

  return (
    <tr className="align-top">
      <td className="hidden px-3 py-2.5 tabular-nums text-stone-400 sm:table-cell">{n}</td>
      <td className="px-3 py-2.5">
        <p className="font-medium text-stone-900">{p.name}</p>
        <p className="text-xs text-stone-500">
          {shortDate(p.date)}
          {p.note && ` · ${p.note}`}
        </p>
        {/* narrower screens: what has arrived sits under the name (tap it for the log) */}
        <button type="button" onClick={() => onLog(p)} className="mt-1.5 block w-full max-w-56 rounded-lg text-left md:hidden" aria-label={`Deliveries of ${p.name}`}>
          <ArrivalBar p={p} compact />
        </button>
        {/* phone: the buttons sit under the name */}
        <div className="-ml-2 mt-1 sm:hidden">{actions}</div>
        {remove.isError && (
          <p role="alert" className="text-xs text-red-700">
            {describeError(remove.error)}
          </p>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-stone-700">
        {qtyText(p.quantity)} {p.unit}
        <span className="block text-xs text-stone-500 sm:hidden">× {money(p.rate)}</span>
      </td>
      <td className="hidden px-3 py-2 md:table-cell">
        <button
          type="button"
          onClick={() => onLog(p)}
          className="-mx-2 block w-[calc(100%+1rem)] rounded-lg px-2 py-1 text-left hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          aria-label={`Deliveries of ${p.name}: ${p.arrived} of ${p.quantity} arrived`}
          title="Open the deliveries"
        >
          <ArrivalBar p={p} />
        </button>
      </td>
      <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-stone-700 sm:table-cell">{money(p.rate)}</td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-stone-900">{money(p.amount)}</td>
      <td className="hidden whitespace-nowrap px-2 py-1.5 text-right sm:table-cell">{actions}</td>
    </tr>
  );
});