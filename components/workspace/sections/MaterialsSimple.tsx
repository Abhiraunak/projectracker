"use client";

import { lazy, memo, Suspense, useState } from "react";
import type { IconType } from "react-icons";
import { FiBox, FiEdit2, FiFileText, FiImage, FiPaperclip, FiPlus, FiPrinter, FiTrash2 } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useMaterialPurchases, useRemovePurchase } from "@/hooks/useMaterialPurchases";
import { useProjectHub } from "@/hooks/useProjectHub";
import { describeError } from "@/lib/api";
import type { Purchase } from "@/lib/inventory/purchases";
import { shortDate } from "@/lib/projects/hub";
import { EmptyState, SectionError, SectionSkeleton } from "../ui";
import { ArrivalBar, DeliveryLog } from "./materials/DeliveryLog";
// import { FromBoqDialog } from "./materials/FromBoqDialog"; FiList,
import { MaterialsPrint } from "./materials/MaterialsPrint";
import { PurchaseDialog } from "./materials/PurchaseDialog";
import { money, qtyText } from "./materials/purchaseFormat";

// Expenses download only when someone opens them
const ExpensesSection = lazy(() => import("./ExpensesSection"));

type View = "materials" | "expenses";
const VIEWS: { key: View; label: string; hint: string; Icon: IconType }[] = [
  { key: "materials", label: "Materials", hint: "Ordered, arrived, amount", Icon: FiBox },
  { key: "expenses", label: "Expenses", hint: "Material and general", Icon: FiPaperclip },
];

const outline = "inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:border-stone-500";

/**
 * The Materials tab, kept simple: one list of materials with what was ordered, what has arrived and the amount,
 * a Print button (the same print as Equipment), and Expenses (material and general) beside it, like the Labour page.
 */
export default function MaterialsSimple({ projectId }: { projectId: string }) {
  const book = useMaterialPurchases(projectId);
  const canAdd = useCan("stock.receive");
  const site = useProjectHub(projectId).data?.project.title ?? "this site"; // already loaded by the project page
  const [view, setView] = useState<View>("materials");
  const [opened, setOpened] = useState<Set<View>>(() => new Set(["materials"]));
  const [dialog, setDialog] = useState<{ editing: Purchase | null } | null>(null);
  // const [fromBoq, setFromBoq] = useState(false);
  const [logFor, setLogFor] = useState<string | null>(null); // the material whose deliveries are open
  const [printing, setPrinting] = useState(false);

  const show = (v: View) => {
    setView(v);
    setOpened((s) => (s.has(v) ? s : new Set(s).add(v)));
  };

  if (book.isPending) return <SectionSkeleton />;
  if (book.isError) return <SectionError error={book.error} onRetry={() => void book.refetch()} />;
  const { items, total, names } = book.data;
  const open = logFor ? items.find((i) => i.id === logFor) : null; // follows the list, so it updates after a delivery

  return (
    <div className="space-y-5">
      <section aria-label="Materials total" className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Total spent on materials</p>
          <p className="mt-0.5 text-3xl font-semibold tabular-nums text-stone-900">{money(total)}</p>
          <p className="text-xs text-stone-500">{items.length === 0 ? "Nothing added yet" : `${items.length} ${items.length === 1 ? "material" : "materials"}`}</p>
        </div>
      </section>

      <div role="group" aria-label="Show" className="grid grid-cols-2 gap-2 sm:gap-3">
        {VIEWS.map(({ key, label, hint, Icon }) => {
          const on = view === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => show(key)}
              className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 text-left text-sm font-semibold transition-colors sm:px-4 ${on ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-800 hover:border-stone-400"
                }`}
            >
              <Icon aria-hidden className="shrink-0 text-lg" />
              <span className="min-w-0">
                <span className="block truncate">{label}</span>
                <span className={`hidden truncate text-xs font-normal sm:block ${on ? "text-stone-300" : "text-stone-500"}`}>{hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div hidden={view !== "materials"} className="space-y-3">
        <div className="flex flex-wrap justify-end gap-2">
          {items.length > 0 && (
            <button type="button" onClick={() => setPrinting(true)} className={outline}>
              <FiPrinter aria-hidden /> Print
            </button>
          )}
          {canAdd && (
            <>
              {/* <button type="button" onClick={() => setFromBoq(true)} className={outline}>
                <FiList aria-hidden /> From BOQ
              </button> */}
              <button
                type="button"
                onClick={() => setDialog({ editing: null })}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800"
              >
                <FiPlus aria-hidden /> Add material
              </button>
            </>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyState title="No materials added yet" hint={canAdd ? "Use Add material: e.g. 5000 bricks at ₹8." : undefined} />
        ) : (
          <MaterialsTable projectId={projectId} items={items} total={total} canEdit={canAdd} onEdit={(p) => setDialog({ editing: p })} onLog={(p) => setLogFor(p.id)} />
        )}
      </div>

      {opened.has("expenses") && (
        <div hidden={view !== "expenses"}>
          <Suspense fallback={<SectionSkeleton />}>
            <ExpensesSection projectId={projectId} sections={["material", "general"]} />
          </Suspense>
        </div>
      )}

      {open && <DeliveryLog projectId={projectId} purchase={open} canEdit={canAdd} onClose={() => setLogFor(null)} />}
      {/* {fromBoq && <FromBoqDialog projectId={projectId} onClose={() => setFromBoq(false)} />} */}
      {dialog && <PurchaseDialog projectId={projectId} names={names} editing={dialog.editing} onClose={() => setDialog(null)} />}
      {printing && <MaterialsPrint items={items} total={total} site={site} onDone={() => setPrinting(false)} />}
    </div>
  );
}

const th = "px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-stone-500";

const MaterialsTable = memo(function MaterialsTable({
  projectId,
  items,
  total,
  canEdit,
  onEdit,
  onLog,
}: {
  projectId: string;
  items: Purchase[];
  total: number;
  canEdit: boolean;
  onEdit: (p: Purchase) => void;
  onLog: (p: Purchase) => void;
}) {
  return (
    <section aria-label="Materials" className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <table className="w-full text-sm sm:table-fixed">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50">
            <th scope="col" className={`${th} hidden w-10 sm:table-cell`}>
              #
            </th>
            <th scope="col" className={th}>
              Material
            </th>
            <th scope="col" className={`${th} text-right sm:w-36`}>
              Ordered
            </th>
            <th scope="col" className={`${th} hidden md:table-cell md:w-56`}>
              Arrived
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
          {items.map((p, i) => (
            <Row key={p.id} projectId={projectId} n={i + 1} p={p} canEdit={canEdit} onEdit={onEdit} onLog={onLog} />
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-stone-200 bg-stone-50">
            {/* phone: Material + Ordered; wider: + #; wide: + Arrived */}
            <th scope="row" colSpan={2} className="px-3 py-2.5 text-right text-sm font-medium text-stone-600 sm:hidden">
              Total
            </th>
            <th scope="row" colSpan={3} className="hidden px-3 py-2.5 text-right text-sm font-medium text-stone-600 sm:table-cell md:hidden">
              Total
            </th>
            <th scope="row" colSpan={4} className="hidden px-3 py-2.5 text-right text-sm font-medium text-stone-600 md:table-cell">
              Total
            </th>
            <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-stone-900">{money(total)}</td>
            <td className="hidden sm:table-cell" />
          </tr>
        </tfoot>
      </table>
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
        <span className="block text-xs text-stone-500">× {money(p.rate)}</span>
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
      <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-stone-900">{money(p.amount)}</td>
      <td className="hidden whitespace-nowrap px-2 py-1.5 text-right sm:table-cell">{actions}</td>
    </tr>
  );
});