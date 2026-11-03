"use client";

import { lazy, memo, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { FiArrowLeft, FiChevronRight, FiEdit2, FiList, FiPlus, FiTrash2 } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useDeleteEstimate, useMaterialEstimates } from "@/hooks/useMaterialEstimates";
import { describeError } from "@/lib/api";
import type { MaterialEstimate } from "@/lib/inventory/estimates";
import { useMaterialBook } from "@/hooks/useProjectPages";
import { hrefFor, onPlaceClick, useWorkspaceItem } from "@/hooks/useWorkspacePlace";
import { rupees, rupeesShort, shortDate } from "@/lib/projects/hub";
import { quantity, type MaterialBook, type MaterialTile, type OrderState, type SheetMaterial } from "@/lib/projects/pages";
import { EmptyState, SectionError, SectionSkeleton } from "../ui";

// The full inventory screen (stock entries, requests, orders, log) downloads only when someone opens it
const FullInventory = lazy(() => import("./MaterialsSection"));
// The Add material dialog downloads when it is first opened
const AddMaterialDialog = lazy(() => import("./materials/AddMaterialDialog").then((m) => ({ default: m.AddMaterialDialog })));

const FULL = "all"; // ?i=all: the full inventory screen

/**
 * Phase 3: materials as tiles (Bricks, Steel, RMC / CC, Sand, Cement, then the rest), and a sheet per tile:
 * what's needed, each order with its vendor and amount, and the tally of used against still to come.
 *
 * One request brings the tiles and every sheet, so opening a tile is instant. Tile → sheet → back all happen
 * in place (the address changes to ?…&i=steel), and the back button works.
 */
export default function MaterialsBook({ projectId }: { projectId: string }) {
  const item = useWorkspaceItem(); // re-renders this section only, when a tile is opened or closed
  const book = useMaterialBook(projectId);
  const canAdd = useCan("requirements.create");
  const estimates = useMaterialEstimates(projectId);
  const [dialog, setDialog] = useState<MaterialEstimate | "new" | null>(null);
  const byMaterial = useMemo(() => {
    const m = new Map<string, MaterialEstimate[]>();
    for (const e of estimates.data?.items ?? []) m.set(e.material.id, [...(m.get(e.material.id) ?? []), e]);
    return m;
  }, [estimates.data]);
  const dialogEl = dialog && (
    <Suspense fallback={null}>
      <AddMaterialDialog projectId={projectId} editing={dialog === "new" ? null : dialog} onClose={() => setDialog(null)} />
    </Suspense>
  );
  const addButton = canAdd && (
    <button
      type="button"
      onClick={() => setDialog("new")}
      onPointerEnter={() => void import("./materials/AddMaterialDialog")}
      className="flex min-h-10 items-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800"
    >
      <FiPlus aria-hidden /> Add material
    </button>
  );

  // The Inventory page in the menu opens on this project next time too
  useEffect(() => {
    try {
      window.localStorage.setItem("active-project", projectId);
    } catch {
      /* storage blocked: nothing to remember */
    }
  }, [projectId]);

  const home = useMemo(() => ({ projectId, section: "materials" as const, item: null }), [projectId]);

  if (item === FULL)
    return (
      <div className="space-y-4">
        <BackLink place={home} label="Material tiles" />
        <Suspense fallback={<SectionSkeleton />}>
          <FullInventory projectId={projectId} />
        </Suspense>
      </div>
    );

  if (book.isPending) return <SectionSkeleton />;
  if (book.isError) return <SectionError error={book.error} onRetry={() => void book.refetch()} />;

  const sheet = item ? book.data.sheets[item] : undefined;
  if (item && sheet)
    return (
      <div className="space-y-4">
        <BackLink place={home} label="All materials" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{sheet.label}</h2>
          {addButton}
        </div>
        {sheet.materials.map((m) => (
          <MaterialSheet key={m.material.id} m={m} added={byMaterial.get(m.material.id)} projectId={projectId} canEdit={canAdd} onEdit={setDialog} />
        ))}
        {dialogEl}
      </div>
    );

  return (
    <>
      <Tiles projectId={projectId} book={book.data} action={addButton} />
      {dialogEl}
    </>
  );
}

function BackLink({ place, label }: { place: { projectId: string; section: "materials"; item: null }; label: string }) {
  return (
    <a href={hrefFor(place)} onClick={onPlaceClick(place)} className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900">
      <FiArrowLeft aria-hidden /> {label}
    </a>
  );
}

/* ------------------------------------ tiles ------------------------------------ */

const Tiles = memo(function Tiles({ projectId, book, action }: { projectId: string; book: MaterialBook; action?: ReactNode }) {
  const full = { projectId, section: "materials" as const, item: FULL };
  return (
    <div className="space-y-4">
      {action && <div className="flex justify-end">{action}</div>}
      {book.tiles.length === 0 ? (
        <EmptyState title="No materials planned yet" hint="Add a material and how much is needed, plan materials from the BOQ, or record an order or a delivery, and they'll show here." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {book.tiles.map((t) => (
            <TileCard key={t.key} projectId={projectId} tile={t} />
          ))}
        </ul>
      )}
      <a
        href={hrefFor(full)}
        onClick={onPlaceClick(full)}
        onPointerEnter={() => void import("./MaterialsSection")}
        className="flex min-h-12 items-center gap-3 rounded-xl border border-stone-200 px-4 text-sm font-medium text-stone-700 hover:border-stone-400"
      >
        <FiList aria-hidden className="text-stone-400" />
        <span className="flex-1">Full inventory: stock entries, requests, orders and log</span>
        <FiChevronRight aria-hidden className="text-stone-400" />
      </a>
    </div>
  );
});

const TileCard = memo(function TileCard({ projectId, tile: t }: { projectId: string; tile: MaterialTile }) {
  const place = { projectId, section: "materials" as const, item: t.key };
  const q = t.quantity;
  const usedPct = q && q.required > 0 ? Math.min(100, Math.round((q.utilised / q.required) * 100)) : null;
  const status =
    t.lateOrders > 0
      ? { text: `${t.lateOrders} ${t.lateOrders === 1 ? "order" : "orders"} late`, tone: "text-red-700" }
      : t.toOrder > 0
        ? { text: t.materials === 1 ? "More to order" : `${t.toOrder} of ${t.materials} to order`, tone: "text-amber-700" }
        : t.arriving > 0
          ? { text: `${t.arriving} ${t.arriving === 1 ? "order" : "orders"} on the way`, tone: "text-stone-500" }
          : { text: "In order", tone: "text-emerald-700" };

  return (
    <li>
      <a
        href={hrefFor(place)}
        onClick={onPlaceClick(place)}
        className="flex h-full min-h-36 flex-col justify-between gap-3 rounded-xl border border-stone-200 p-4 transition-colors hover:border-stone-400 focus-visible:border-stone-900 focus-visible:outline-none active:bg-stone-50"
      >
        <span>
          <span className="flex items-center justify-between gap-2">
            <span className="font-semibold text-stone-900">{t.label}</span>
            {t.materials > 1 && <span className="text-xs text-stone-400">{t.materials} types</span>}
          </span>
          <span className={`mt-0.5 block text-xs ${status.tone}`}>{status.text}</span>
        </span>
        <span>
          {q ? (
            <span className="block text-sm text-stone-600">
              <span className="font-semibold tabular-nums text-stone-900">{quantity(q.utilised)}</span> of {quantity(q.required, q.unit)} used
            </span>
          ) : (
            <span className="block text-sm text-stone-600">
              <span className="font-semibold tabular-nums text-stone-900">{rupeesShort(t.spent)}</span> of {rupeesShort(t.budget)}
            </span>
          )}
          <span aria-hidden className="mt-2 block h-1.5 overflow-hidden rounded-full bg-stone-100">
            <span className="block h-full rounded-full bg-orange-500" style={{ width: `${usedPct ?? (t.budget > 0 ? Math.min(100, (t.spent / t.budget) * 100) : 0)}%` }} />
          </span>
        </span>
      </a>
    </li>
  );
});

/* ------------------------------------ sheet ------------------------------------ */

const STATE: Record<OrderState, { label: string; tone: string }> = {
  received: { label: "Received", tone: "text-emerald-700" },
  part: { label: "Part received", tone: "text-stone-600" },
  waiting: { label: "On the way", tone: "text-stone-600" },
  late: { label: "Late", tone: "text-red-700" },
};

/** One material, laid out like the client's sketch: what's needed, the orders, then the tally */
const MaterialSheet = memo(function MaterialSheet({
  m,
  added,
  projectId,
  canEdit,
  onEdit,
}: {
  m: SheetMaterial;
  added?: MaterialEstimate[];
  projectId: string;
  canEdit: boolean;
  onEdit: (e: MaterialEstimate) => void;
}) {
  const unit = m.material.unit;
  return (
    <article className="overflow-hidden rounded-xl border border-stone-200">
      <header className="border-b border-stone-200 bg-stone-50 px-4 py-3 sm:px-5">
        <h3 className="font-semibold text-stone-900">{m.material.name}</h3>
        <p className="mt-0.5 text-sm text-stone-600">
          Required <b className="font-semibold tabular-nums text-stone-900">{quantity(m.required, unit)}</b>
          {m.rate > 0 && (
            <>
              {" "}
              · {rupees(m.rate)}/{unit} · amount <b className="font-semibold tabular-nums text-stone-900">{rupeesShort(m.budget)}</b>
            </>
          )}
        </p>
        {m.vendors.length > 0 && <p className="mt-0.5 truncate text-xs text-stone-500">Vendor: {m.vendors.join(", ")}</p>}
      </header>

      {added && added.length > 0 && <AddedNeeds items={added} unit={unit} projectId={projectId} canEdit={canEdit} onEdit={onEdit} />}

      {m.orders.length > 0 ? (
        // A table on wider screens; on a phone each order folds into two lines, so nothing scrolls sideways
        <div role="table" aria-label={`Orders for ${m.material.name}`} className="text-sm">
          <div role="row" className="hidden grid-cols-[1fr_8rem_6rem_8rem_8rem] gap-2 border-b border-stone-100 px-5 py-2 text-xs text-stone-500 sm:grid">
            <span role="columnheader">Order</span>
            <span role="columnheader" className="text-right">Quantity</span>
            <span role="columnheader" className="text-right">Rate</span>
            <span role="columnheader" className="text-right">Amount</span>
            <span role="columnheader" className="text-right">Status</span>
          </div>
          {m.orders.map((o) => (
            <div
              role="row"
              key={o.id}
              className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 border-b border-stone-100 px-4 py-2.5 last:border-b-0 sm:grid-cols-[1fr_8rem_6rem_8rem_8rem] sm:items-center sm:gap-2 sm:px-5"
            >
              <span role="cell" className="min-w-0">
                <span className="font-medium">Order {String(o.number).padStart(2, "0")}</span>
                <span className="block truncate text-xs text-stone-500">{[shortDate(o.createdAt), o.vendor, o.reference].filter(Boolean).join(" · ")}</span>
              </span>
              <span role="cell" className="text-right tabular-nums sm:order-none">
                <span className="sm:hidden font-medium">{rupees(o.amount)}</span>
                <span className="hidden sm:inline">{quantity(o.quantity, unit)}</span>
              </span>
              <span role="cell" className="text-xs tabular-nums text-stone-500 sm:text-right sm:text-sm sm:text-stone-900">
                <span className="sm:hidden">
                  {quantity(o.quantity, unit)} × {rupees(o.rate)}
                </span>
                <span className="hidden sm:inline">{rupees(o.rate)}</span>
              </span>
              <span role="cell" className="hidden text-right font-medium tabular-nums sm:block">
                {rupees(o.amount)}
              </span>
              <span role="cell" className={`text-right text-xs ${STATE[o.state].tone}`}>
                {STATE[o.state].label}
                {o.state === "part" && <span className="text-stone-500"> · {quantity(o.receivedQty)} in</span>}
                {(o.state === "waiting" || o.state === "late") && o.expectedDelivery && <span className="text-stone-500"> · due {shortDate(o.expectedDelivery)}</span>}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-3 text-sm text-stone-500 sm:px-5">No orders yet.</p>
      )}

      <dl className="grid grid-cols-2 border-t border-stone-200 sm:grid-cols-4">
        <Tally label="Utilised" value={quantity(m.utilised, unit)} />
        <Tally label="In store" value={quantity(m.inStore, unit)} />
        <Tally label="Pending delivery" value={quantity(m.pendingDelivery, unit)} />
        <Tally label="Still to order" value={quantity(m.pendingOrder, unit)} tone={m.pendingOrder > 0 ? "text-amber-700" : undefined} />
      </dl>
    </article>
  );
});

function Tally({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border-stone-200 px-4 py-3 even:border-l [&:nth-child(n+3)]:border-t sm:px-5 sm:[&:nth-child(n+2)]:border-l sm:[&:nth-child(n+3)]:border-t-0">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className={`mt-0.5 font-semibold tabular-nums ${tone ?? "text-stone-900"}`}>{value}</dd>
    </div>
  );
}

const METHOD_NOTE = { quantity: "", steel: "steel rows", volume: "concrete rows" } as const;

/** What was added by hand for this material (not from the BOQ): each part of "Required", with edit and remove */
function AddedNeeds({ items, unit, projectId, canEdit, onEdit }: { items: MaterialEstimate[]; unit: string; projectId: string; canEdit: boolean; onEdit: (e: MaterialEstimate) => void }) {
  const remove = useDeleteEstimate(projectId);
  return (
    <div className="border-b border-stone-200 text-sm">
      <p className="px-4 pt-2.5 text-xs font-medium text-stone-500 sm:px-5">Added by hand</p>
      <ul className="divide-y divide-stone-100">
        {items.map((e) => {
          const rows = e.method === "steel" ? e.steel.length : e.method === "volume" ? e.volume.length : 0;
          const detail = [rows ? `${rows} ${METHOD_NOTE[e.method]}` : "", e.wastagePercent ? `${e.wastagePercent}% wastage` : "", e.notes].filter(Boolean).join(" · ");
          return (
            <li key={e.id} className="flex items-center gap-3 px-4 py-2 sm:px-5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-stone-900">{e.title || "Added by hand"}</span>
                {detail && <span className="block truncate text-xs text-stone-500">{detail}</span>}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{quantity(e.quantity, unit)}</span>
              {canEdit && (
                <span className="flex shrink-0">
                  <button type="button" onClick={() => onEdit(e)} aria-label={`Edit ${e.title || addedName(e)}`} className="rounded p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-900">
                    <FiEdit2 aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Remove ${quantity(e.quantity, unit)}${e.title ? ` for ${e.title}` : ""} from what's needed?`)) remove.mutate(e.id);
                    }}
                    aria-label={`Remove ${e.title || addedName(e)}`}
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
        <p role="alert" className="px-4 pb-2 text-sm text-red-700 sm:px-5">
          {describeError(remove.error)}
        </p>
      )}
    </div>
  );
}
const addedName = (e: MaterialEstimate) => `${e.material.name} added by hand`;