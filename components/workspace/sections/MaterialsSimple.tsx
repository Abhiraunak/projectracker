"use client";

import { memo, useState } from "react";
import { FiEdit2, FiFileText, FiImage, FiPlus, FiPrinter, FiTruck } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useMaterialPurchases } from "@/hooks/useMaterialPurchases";
import { useProjectHub } from "@/hooks/useProjectHub";
import type { Purchase } from "@/lib/inventory/purchases";
import { shortDate } from "@/lib/projects/hub";
import { SectionError, SectionSkeleton } from "../ui";
import { DeliveriesTable } from "./materials/DeliveriesTable";
import { ArrivalMeter, DeliveryLog, leftText } from "./materials/DeliveryLog";
import { QuickDelivery } from "./materials/QuickDelivery";
import { MaterialsPrint } from "./materials/MaterialsPrint";
import { mono } from "./materials/mono";
import { PurchaseDialog } from "./materials/PurchaseDialog";
import { money, qtyText } from "./materials/purchaseFormat";


type View = "materials" | "deliveries";
const VIEWS: { key: View; label: string }[] = [
  { key: "materials", label: "Materials" },
  { key: "deliveries", label: "Delivery log" },
];

/**
 * The Materials tab, in the dashboard's monochrome look:
 *  - the preset cost of everything ordered against what the deliveries actually cost;
 *  - Materials: S.No, material, ordered (at the preset rate), arrived, left, preset cost and actual spend;
 *    each row opens its deliveries, where Log delivery asks for the quantity and the rate paid;
 *  - Delivery log: every delivery of every material in one table;
 *  - Expenses: material and general expenses.
 */
export default function MaterialsSimple({ projectId }: { projectId: string }) {
  const book = useMaterialPurchases(projectId);
  const canAdd = useCan("stock.receive");
  const site = useProjectHub(projectId).data?.project.title ?? "this site"; // already loaded by the project page
  const [view, setView] = useState<View>("materials");
  const [opened, setOpened] = useState<Set<View>>(() => new Set(["materials"]));
  const [dialog, setDialog] = useState<{ editing: Purchase | null } | null>(null);
  
  // the material whose deliveries are open; `log`: open with the Log delivery form ready
  const [logFor, setLogFor] = useState<{ id: string; log: boolean } | null>(null);
  const [quick, setQuick] = useState(false); // Log delivery from the top: pick the material, then the numbers
  const [printing, setPrinting] = useState(false);

  const show = (v: View) => {
    setView(v);
    setOpened((s) => (s.has(v) ? s : new Set(s).add(v)));
  };

  if (book.isPending) return <SectionSkeleton />;
  if (book.isError) return <SectionError error={book.error} onRetry={() => void book.refetch()} />;
  const { items, total, names } = book.data;
  const spent = book.data.spentTotal ?? 0; // older servers don't send it
  const deliveries = items.reduce((s, p) => s + p.deliveries.length, 0);
  const open = logFor ? items.find((i) => i.id === logFor.id) : null; // follows the list, so it updates after a delivery
  const pct = total > 0 ? Math.round((spent / total) * 100) : null;
  const over = spent > total + 0.5 && total > 0;

  return (
    <div className="space-y-6">
      {/* preset cost against actual spending */}
      <section aria-label="Material cost" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Figure label="Preset cost" value={money(total)} note={`${items.length} ${items.length === 1 ? "material" : "materials"} ordered`} />
        <Figure
          label="Actual spend"
          value={money(spent)}
          note={pct === null ? "What the deliveries cost" : over ? `${money(spent - total)} over the preset` : `${pct}% of the preset cost`}
          tone={over ? "text-[#B3261E]" : undefined}
          meter={pct === null ? null : Math.min(100, pct)}
          meterTone={over ? "bg-[#C4302B]" : "bg-[#111111]"}
        />
        {/* phones: two figures side by side, so Log delivery stays near the top */}
        <div className="hidden sm:block">
          <Figure label="Deliveries logged" value={String(deliveries)} note={deliveries === 0 ? "Nothing has arrived yet" : "See them all in Delivery log"} />
        </div>
      </section>

      {/* Materials · Delivery log · Expenses */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Show" className="inline-flex rounded-xl border border-[#E8E8E6] bg-white p-1">
          {VIEWS.map(({ key, label }) => {
            const on = view === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => show(key)}
                className={`min-h-10 rounded-[10px] px-3.5 text-sm font-medium sm:px-4 ${mono.motion} ${mono.ring} ${on ? "bg-[#111111] text-white" : "text-[#333333] hover:bg-[#F1F1EF]"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {(view === "materials" || view === "deliveries") && (
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            {/* the everyday action on site: first, and full width on a phone */}
            {canAdd && items.length > 0 && (
              <button type="button" onClick={() => setQuick(true)} className={`${mono.primary} col-span-2 h-12 sm:h-auto`}>
                <FiTruck aria-hidden /> Log delivery
              </button>
            )}
            {view === "materials" && canAdd && (
              <button type="button" onClick={() => setDialog({ editing: null })} className={items.length > 0 ? mono.secondary : `${mono.primary} col-span-2`}>
                <FiPlus aria-hidden /> Add material
              </button>
            )}
            {view === "materials" && items.length > 0 && (
              <button type="button" onClick={() => setPrinting(true)} className={`${mono.secondary} max-sm:hidden`}>
                <FiPrinter aria-hidden /> Print
              </button>
            )}
          </div>
        )}
      </div>

      <div hidden={view !== "materials"}>
        {items.length === 0 ? (
          <div className={`${mono.card} px-6 py-14 text-center`}>
            <p className="text-[17px] font-semibold text-[#111111]">No materials added yet</p>
            {canAdd && <p className="mt-1.5 text-sm text-[#666666]">Use Add material: for example 5,000 bricks at ₹8.</p>}
          </div>
        ) : (
          <>
            {/* phones and small tablets: one card per material, big buttons */}
            <MaterialCards
              items={items}
              total={total}
              spent={spent}
              canEdit={canAdd}
              onEdit={(p) => setDialog({ editing: p })}
              onOpen={(p, log) => setLogFor({ id: p.id, log })}
            />
            {/* wider screens: the table */}
            <div className="hidden md:block">
              <MaterialsTable items={items} canEdit={canAdd} onEdit={(p) => setDialog({ editing: p })} onLog={(p) => setLogFor({ id: p.id, log: false })} />
            </div>
          </>
        )}
      </div>

      {opened.has("deliveries") && (
        <div hidden={view !== "deliveries"}>
          <DeliveriesTable projectId={projectId} items={items} canEdit={canAdd} />
        </div>
      )}

      {open && <DeliveryLog projectId={projectId} purchase={open} canEdit={canAdd} startLogging={logFor?.log} onClose={() => setLogFor(null)} />}
      {quick && <QuickDelivery projectId={projectId} items={items} onClose={() => setQuick(false)} />}
      {dialog && <PurchaseDialog projectId={projectId} names={names} editing={dialog.editing} onClose={() => setDialog(null)} />}
      {printing && <MaterialsPrint items={items} total={total} spent={spent} site={site} onDone={() => setPrinting(false)} />}
    </div>
  );
}

function Figure({ label, value, note, tone, meter, meterTone }: { label: string; value: string; note: string; tone?: string; meter?: number | null; meterTone?: string }) {
  return (
    <div className={`${mono.card} h-full min-w-0 px-4 py-3.5 sm:px-5 sm:py-4`}>
      <p className={mono.label}>{label}</p>
      <p className={`mt-1 truncate text-xl font-semibold sm:text-2xl tabular-nums tracking-[-0.01em] ${tone ?? "text-[#111111]"}`}>{value}</p>
      {meter !== undefined && meter !== null && (
        <span aria-hidden className="mt-2.5 block h-1 overflow-hidden rounded-full bg-[#EFEFED]">
          <span className={`block h-full rounded-full ${meterTone}`} style={{ width: `${meter}%` }} />
        </span>
      )}
      <p className={`mt-1.5 truncate text-xs ${tone ?? "text-[#666666]"}`}>{note}</p>
    </div>
  );
}

/* ----------------------------------- phones: one card per material ----------------------------------- */

const MaterialCards = memo(function MaterialCards({
  items,
  total,
  spent,
  canEdit,
  onEdit,
  onOpen,
}: {
  items: Purchase[];
  total: number;
  spent: number;
  canEdit: boolean;
  onEdit: (p: Purchase) => void;
  onOpen: (p: Purchase, log: boolean) => void;
}) {
  return (
    <div className="space-y-3 md:hidden">
      <ul className="space-y-3">
        {items.map((p, i) => (
          <MaterialCard key={p.id} n={i + 1} p={p} canEdit={canEdit} onEdit={onEdit} onOpen={onOpen} />
        ))}
      </ul>
      <div className={`${mono.card} grid grid-cols-2 gap-3 px-5 py-4`}>
        <div className="min-w-0">
          <p className={mono.label}>Total preset cost</p>
          <p className="mt-0.5 truncate text-lg font-semibold tabular-nums text-[#111111]">{money(total)}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className={mono.label}>Total actual spend</p>
          <p className={`mt-0.5 truncate text-lg font-semibold tabular-nums ${spent > total + 0.5 ? "text-[#B3261E]" : "text-[#111111]"}`}>{money(spent)}</p>
        </div>
      </div>
    </div>
  );
});

const MaterialCard = memo(function MaterialCard({
  n,
  p,
  canEdit,
  onEdit,
  onOpen,
}: {
  n: number;
  p: Purchase;
  canEdit: boolean;
  onEdit: (p: Purchase) => void;
  onOpen: (p: Purchase, log: boolean) => void;
}) {
  const left = leftText(p);
  const over = p.spent > p.amount + 0.5;

  return (
    <li className={`${mono.card} px-4 pb-4 pt-3.5`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs tabular-nums text-[#8C8C8C]">{n}</p>
          <p className="wrap-break-word text-[17px] font-semibold leading-snug text-[#111111]">{p.name}</p>
          <p className="mt-0.5 text-sm text-[#666666]">
            {qtyText(p.quantity)} {p.unit} at {money(p.rate)}
            {p.note && ` · ${p.note}`}
          </p>
        </div>
        {canEdit && (
          <span className="-mr-2 flex shrink-0">
            <button type="button" onClick={() => onEdit(p)} className={mono.icon} aria-label={`Edit ${p.name}`} title="Edit">
              <FiEdit2 aria-hidden />
            </button>
          </span>
        )}
      </div>

      {/* arrived and left */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="tabular-nums text-[#111111]">
            {qtyText(p.arrived)} <span className="text-[#666666]">arrived</span>
          </span>
          <span className={`tabular-nums ${left.cls}`}>{p.state === "part" || p.state === "none" ? `${left.text} left` : left.text}</span>
        </div>
        <ArrivalMeter p={p} />
      </div>

      {/* preset cost and actual spend */}
      <dl className="mt-3 grid grid-cols-2 gap-2">
        <div className={mono.tile}>
          <dt className={mono.label}>Preset cost</dt>
          <dd className="mt-0.5 truncate text-[15px] font-semibold tabular-nums text-[#111111]">{money(p.amount)}</dd>
        </div>
        <div className={mono.tile}>
          <dt className={mono.label}>Actual spend</dt>
          <dd className={`mt-0.5 truncate text-[15px] font-semibold tabular-nums ${over ? "text-[#B3261E]" : "text-[#111111]"}`}>{money(p.spent ?? 0)}</dd>
        </div>
      </dl>

      {/* big buttons for the thumb */}
      <div className={`mt-3 grid gap-2 ${canEdit ? "grid-cols-2" : "grid-cols-1"}`}>
        {canEdit && (
          <button type="button" onClick={() => onOpen(p, true)} className={`${mono.secondary} h-12 px-3 font-semibold`}>
            <FiTruck aria-hidden /> Log delivery
          </button>
        )}
        <button type="button" onClick={() => onOpen(p, false)} className={`${mono.secondary} h-12 px-3`}>
          History{p.deliveries.length > 0 && <span className="tabular-nums text-[#666666]">· {p.deliveries.length}</span>}
        </button>
      </div>
    </li>
  );
});

/* ------------------------------------------ the table ------------------------------------------ */

const MaterialsTable = memo(function MaterialsTable({
  items,
  canEdit,
  onEdit,
  onLog,
}: {
  items: Purchase[];
  canEdit: boolean;
  onEdit: (p: Purchase) => void;
  onLog: (p: Purchase) => void;
}) {
  return (
    <section aria-label="Materials" className={`${mono.card} overflow-hidden`}>
      {/* wide on purpose: on a phone it scrolls sideways inside the card, so every column stays readable */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-240 text-sm">
          <thead>
            <tr className="border-b border-[#EFEFED] bg-[#F7F7F5]">
              <th scope="col" className={`${mono.th} w-14`}>
                S.No
              </th>
              <th scope="col" className={mono.th}>
                Material
              </th>
              <th scope="col" className={`${mono.th} text-right`}>
                Quantity
              </th>
              <th scope="col" className={`${mono.th} w-40`}>
                Ordered
              </th>
              <th scope="col" className={`${mono.th} text-right`}>
                Left
              </th>
              <th scope="col" className={`${mono.th} text-right`}>
                Preset cost
              </th>
              <th scope="col" className={`${mono.th} text-right`}>
                Actual spend
              </th>
              <th scope="col" className={`${mono.th} w-46`}>
                <span className="sr-only">Deliveries, bill and actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFEFED]">
            {items.map((p, i) => (
              <Row key={p.id} n={i + 1} p={p} canEdit={canEdit} onEdit={onEdit} onLog={onLog} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});

const Row = memo(function Row({
  n,
  p,
  canEdit,
  onEdit,
  onLog,
}: {
  n: number;
  p: Purchase;
  canEdit: boolean;
  onEdit: (p: Purchase) => void;
  onLog: (p: Purchase) => void;
}) {
  const left = leftText(p);
  const over = p.spent > p.amount + 0.5;

  return (
    <tr className="align-top">
      <td className={`${mono.td} tabular-nums text-[#8C8C8C]`}>{n}</td>
      <td className={mono.td}>
        <p className="font-medium text-[#111111]">{p.name}</p>
        <p className="mt-0.5 text-xs text-[#666666]">
          {shortDate(p.date)}
          {p.note && ` · ${p.note}`}
        </p>
      </td>
      <td className={`${mono.td} whitespace-nowrap text-right tabular-nums`}>
        <span className="text-[#111111]">
          {qtyText(p.quantity)} <span className="text-[#666666]">{p.unit}</span>
        </span>
        <span className="mt-0.5 block text-xs text-[#666666]">
          at {money(p.rate)}
          {p.unit && `/${p.unit}`}
        </span>
      </td>
      <td className={mono.td}>
        <span className="block whitespace-nowrap tabular-nums text-[#111111]">
          {p.arrived > 0 ? (
            <>
              {qtyText(p.arrived)} <span className="text-[#666666]">{p.unit}</span>
            </>
          ) : (
            <span className="text-[#8C8C8C]">Nothing yet</span>
          )}
        </span>
        <ArrivalMeter p={p} />
      </td>
      <td className={`${mono.td} whitespace-nowrap text-right tabular-nums ${left.cls}`}>{left.text}</td>
      <td className={`${mono.td} whitespace-nowrap text-right tabular-nums text-[#111111]`}>{money(p.amount)}</td>
      <td className={`${mono.td} whitespace-nowrap text-right font-semibold tabular-nums ${over ? "text-[#B3261E]" : "text-[#111111]"}`}>
        {p.spent > 0 ? money(p.spent) : <span className="font-normal text-[#8C8C8C]">₹0</span>}
      </td>
      <td className="whitespace-nowrap px-2 py-2 text-right">
        <span className="inline-flex items-center gap-0.5">
          <button type="button" onClick={() => onLog(p)} className={`${mono.secondary} min-h-10 px-3 text-sm`} aria-label={`Deliveries of ${p.name}: ${qtyText(p.arrived)} of ${qtyText(p.quantity)} arrived`}>
            <FiTruck aria-hidden /> Deliveries
          </button>
          {p.billUrl ? (
            <a href={p.billUrl} target="_blank" rel="noreferrer" className={mono.icon} aria-label={`Open the bill for ${p.name}`} title="Open the bill">
              {p.billKind === "pdf" ? <FiFileText aria-hidden /> : <FiImage aria-hidden />}
            </a>
          ) : (
            <span aria-hidden className="inline-block h-10 w-10" /> // keeps the buttons in one column
          )}
          {canEdit && (
            <button type="button" onClick={() => onEdit(p)} className={mono.icon} aria-label={`Edit ${p.name}`} title="Edit">
              <FiEdit2 aria-hidden />
            </button>
          )}
        </span>
      </td>
    </tr>
  );
});