"use client";

import { memo, useState } from "react";
import { FiEdit2, FiFileText, FiImage, FiPlus, FiTrash2 } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useMaterialPurchases, useRemovePurchase } from "@/hooks/useMaterialPurchases";
import { describeError } from "@/lib/api";
import type { Purchase } from "@/lib/inventory/purchases";
import { shortDate } from "@/lib/projects/hub";
import { EmptyState, SectionError, SectionSkeleton } from "../ui";
import { PurchaseDialog } from "./materials/PurchaseDialog";
import { money, qtyText } from "./materials/purchaseFormat";

/**
 * The Materials tab, kept simple: every material bought for the project with its quantity, rate and total,
 * and the bill when there is one. Add material → material, quantity, rate; the total is worked out for you.
 */
export default function MaterialsSimple({ projectId }: { projectId: string }) {
  const book = useMaterialPurchases(projectId);
  const canAdd = useCan("stock.receive");
  const [dialog, setDialog] = useState<{ editing: Purchase | null } | null>(null);

  if (book.isPending) return <SectionSkeleton />;
  if (book.isError) return <SectionError error={book.error} onRetry={() => void book.refetch()} />;
  const { items, total, materials, names } = book.data;

  return (
    <div className="space-y-4">
      <section aria-label="Materials total" className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Total spent on materials</p>
          <p className="mt-0.5 text-3xl font-semibold tabular-nums text-stone-900">{money(total)}</p>
          <p className="text-xs text-stone-500">
            {items.length === 0 ? "Nothing added yet" : `${items.length} ${items.length === 1 ? "entry" : "entries"} · ${materials.length} ${materials.length === 1 ? "material" : "materials"}`}
          </p>
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={() => setDialog({ editing: null })}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800"
          >
            <FiPlus aria-hidden /> Add material
          </button>
        )}
      </section>

      {materials.length > 1 && (
        <section aria-label="By material" className="flex flex-wrap gap-2">
          {materials.map((m) => (
            <span key={`${m.name}|${m.unit}`} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600">
              <b className="font-semibold text-stone-900">{m.name}</b> {qtyText(m.quantity)} {m.unit} ·{" "}
              <span className="tabular-nums text-stone-900">{money(m.amount)}</span>
            </span>
          ))}
        </section>
      )}

      {items.length === 0 ? (
        <EmptyState title="No materials added yet" hint={canAdd ? "Use Add material: e.g. 5000 bricks at ₹8 each." : undefined} />
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {items.map((p) => (
            <Row key={p.id} projectId={projectId} p={p} canEdit={canAdd} onEdit={() => setDialog({ editing: p })} />
          ))}
        </ul>
      )}

      {dialog && <PurchaseDialog projectId={projectId} names={names} editing={dialog.editing} onClose={() => setDialog(null)} />}
    </div>
  );
}

const Row = memo(function Row({ projectId, p, canEdit, onEdit }: { projectId: string; p: Purchase; canEdit: boolean; onEdit: () => void }) {
  const remove = useRemovePurchase(projectId);
  const [confirming, setConfirming] = useState(false);
  const btn = "inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900";

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-stone-900">{p.name}</p>
        <p className="text-sm tabular-nums text-stone-600">
          {qtyText(p.quantity)} {p.unit} × {money(p.rate)}
        </p>
        <p className="truncate text-xs text-stone-500">
          {shortDate(p.date)}
          {p.note && ` · ${p.note}`}
        </p>
      </div>

      <p className="text-right text-base font-semibold tabular-nums text-stone-900">{money(p.amount)}</p>

      <div className="flex items-center">
        {p.billUrl ? (
          <a href={p.billUrl} target="_blank" rel="noreferrer" className={btn} aria-label={`Open the bill for ${p.name}`} title="Open the bill">
            {p.billKind === "pdf" ? <FiFileText aria-hidden /> : <FiImage aria-hidden />}
          </a>
        ) : (
          <span aria-hidden className="h-10 w-10" /> // keeps the amounts in one column
        )}
        {canEdit && !confirming && (
          <>
            <button type="button" onClick={onEdit} className={btn} aria-label={`Edit ${p.name}`} title="Edit">
              <FiEdit2 aria-hidden />
            </button>
            <button type="button" onClick={() => setConfirming(true)} className={`${btn} hover:bg-red-50 hover:text-red-700`} aria-label={`Delete ${p.name}`} title="Delete">
              <FiTrash2 aria-hidden />
            </button>
          </>
        )}
        {confirming && (
          <span className="flex items-center gap-1 text-sm">
            <span className="text-stone-600">Delete?</span>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate(p.id, { onSettled: () => setConfirming(false) })}
              className="min-h-10 rounded-lg px-2 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {remove.isPending ? "Deleting…" : "Yes"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="min-h-10 rounded-lg px-2 font-medium text-stone-600 hover:bg-stone-100">
              No
            </button>
          </span>
        )}
      </div>
      {remove.isError && (
        <p role="alert" className="w-full text-xs text-red-700">
          {describeError(remove.error)}
        </p>
      )}
    </li>
  );
});