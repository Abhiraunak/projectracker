"use client";

import { Fragment, memo, useDeferredValue, useState } from "react";
import { FiChevronDown, FiDownload, FiEdit2, FiFileText, FiImage, FiPlus, FiPrinter, FiSearch, FiTruck, FiX } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useMaterialPurchases } from "@/hooks/useMaterialPurchases";
import { useProjectHub } from "@/hooks/useProjectHub";
import type { Purchase } from "@/lib/inventory/purchases";
import { shortDate } from "@/lib/projects/hub";
import { SectionError, SectionSkeleton } from "../ui";
import { DeliveriesTable } from "./materials/DeliveriesTable";
import { ArrivalMeter, DeliveriesPanel, leftText } from "./materials/DeliveryLog";
import { QuickDelivery } from "./materials/QuickDelivery";
import { MaterialsPrint } from "./materials/MaterialsPrint";
import { mono } from "./materials/mono";
import { PurchaseDialog } from "./materials/PurchaseDialog";
import { EstimateImportDialog } from "./materials/EstimateImportDialog";
import { money, qtyText } from "./materials/purchaseFormat";

/** Lower case, spaces squeezed: "  Red  Bricks" and "red bricks" match */
export const norm = (v: string | null | undefined) => (v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
/** A material matches when its name, note or unit has the search in it */
const materialMatches = (p: Purchase, q: string) => !q || [p.name, p.note, p.unit, p.section].some((v) => norm(v).includes(q));

type View = "materials" | "deliveries";
const VIEWS: { key: View; label: string }[] = [
  { key: "materials", label: "Materials" },
  { key: "deliveries", label: "Delivery log" },
];

/**
 * The Materials tab, in the dashboard's monochrome look:
 *  - the planned cost of everything (quantity × rate) against what the deliveries cost (spent so far);
 *  - Materials: S.No, material, quantity (at the rate), ordered (what has come), still to come, planned cost and
 *    spent; Deliveries opens that material's deliveries right inside its row, with Add delivery there;
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
  const [fromEstimate, setFromEstimate] = useState(false); // "From estimate": bring the Material estimate's lines in

  // the material whose deliveries are open; `log`: open with the Log delivery form ready
  const [openId, setOpenId] = useState<string | null>(null); // the material whose deliveries are open in its row
  const toggle = (id: string) => setOpenId((o) => (o === id ? null : id));
  const [quick, setQuick] = useState(false); // Log delivery from the top: pick the material, then the numbers
  const [printing, setPrinting] = useState(false);
  const [search, setSearch] = useState(""); // one search for both tabs
  const q = norm(useDeferredValue(search)); // typing stays smooth on a long list

  const show = (v: View) => {
    setView(v);
    setOpened((s) => (s.has(v) ? s : new Set(s).add(v)));
  };

  if (book.isPending) return <SectionSkeleton />;
  if (book.isError) return <SectionError error={book.error} onRetry={() => void book.refetch()} />;
  const { items, total, names } = book.data;
  const spent = book.data.spentTotal ?? 0; // older servers don't send it
  const deliveries = items.reduce((s, p) => s + p.deliveries.length, 0);
  const pct = total > 0 ? Math.round((spent / total) * 100) : null;
  const over = spent > total + 0.5 && total > 0;
  const shown = q ? items.filter((p) => materialMatches(p, q)) : items;

  return (
    <div className="space-y-6">
      {/* planned cost against what was spent */}
      <section aria-label="Material cost" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Figure label="Planned cost" value={money(total)} note={`${items.length} ${items.length === 1 ? "material" : "materials"} · quantity × rate`} />
        <Figure
          label="Spent so far"
          value={money(spent)}
          note={pct === null ? "What the deliveries cost" : over ? `${money(spent - total)} over the plan` : `${pct}% of the planned cost`}
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
            {view === "materials" && canAdd && (
              <button type="button" onClick={() => setFromEstimate(true)} className={mono.secondary}>
                <FiDownload aria-hidden /> From estimate
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

      {items.length > 0 && (
        <MaterialSearch
          value={search}
          onChange={setSearch}
          label={view === "materials" ? "Search materials" : "Search deliveries by material"}
          note={q ? `${shown.length} of ${items.length} ${items.length === 1 ? "material" : "materials"}` : null}
        />
      )}

      <div hidden={view !== "materials"}>
        {items.length === 0 ? (
          <div className={`${mono.card} px-6 py-14 text-center`}>
            <p className="text-[17px] font-semibold text-[#111111]">No materials added yet</p>
            {canAdd && <p className="mt-1.5 text-sm text-[#666666]">Use Add material (for example 5,000 bricks at ₹8), or From estimate to bring in the Material estimate.</p>}
          </div>
        ) : shown.length === 0 ? (
          <div className={`${mono.card} px-6 py-12 text-center`}>
            <p className="text-[17px] font-semibold text-[#111111]">No material matches “{search.trim()}”</p>
            <p className="mt-1.5 text-sm text-[#666666]">Check the spelling, or clear the search to see every material.</p>
            <button type="button" onClick={() => setSearch("")} className={`${mono.secondary} mt-4`}>
              Clear search
            </button>
          </div>
        ) : (
          <>
            {/* phones and small tablets: one card per material, big buttons */}
            <MaterialCards
              items={shown}
              searching={!!q}
              total={total}
              spent={spent}
              canEdit={canAdd}
              onEdit={(p) => setDialog({ editing: p })}
              projectId={projectId}
              openId={openId}
              onToggle={toggle}
            />
            {/* wider screens: the table */}
            <div className="hidden md:block">
              <MaterialsTable projectId={projectId} items={shown} canEdit={canAdd} onEdit={(p) => setDialog({ editing: p })} openId={openId} onToggle={toggle} />
            </div>
          </>
        )}
      </div>

      {opened.has("deliveries") && (
        <div hidden={view !== "deliveries"}>
          {/* your DeliveriesTable takes the materials to show: the search filters them here */}
          <DeliveriesTable projectId={projectId} items={shown} canEdit={canAdd} />
        </div>
      )}

      {quick && <QuickDelivery projectId={projectId} items={items} onClose={() => setQuick(false)} />}
      {fromEstimate && <EstimateImportDialog projectId={projectId} onClose={() => setFromEstimate(false)} />}
      {dialog && <PurchaseDialog projectId={projectId} names={names} editing={dialog.editing} onClose={() => setDialog(null)} />}
      {printing && <MaterialsPrint items={items} total={total} spent={spent} site={site} onDone={() => setPrinting(false)} />}
    </div>
  );
}

const searchField = mono.field.replace("mt-1.5 ", ""); // no gap above: the magnifier sits centred

/** The search box, in the monochrome look, with a clear button and how many match */
function MaterialSearch({ value, onChange, label, note }: { value: string; onChange: (v: string) => void; label: string; note: string | null }) {
  return (
    <div role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-md">
        <FiSearch aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8C8C]" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onChange("")}
          aria-label={label}
          placeholder={label}
          enterKeyHint="search"
          autoComplete="off"
          className={`${searchField} h-12 pl-10 pr-11 sm:h-11 [&::-webkit-search-cancel-button]:hidden`}
        />
        {value && (
          <button type="button" onClick={() => onChange("")} aria-label="Clear search" className={`${mono.icon} absolute right-1 top-1/2 -translate-y-1/2`}>
            <FiX aria-hidden />
          </button>
        )}
      </div>
      {note && (
        <p aria-live="polite" className="text-sm text-[#666666]">
          {note}
        </p>
      )}
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
  searching,
  canEdit,
  onEdit,
  projectId,
  openId,
  onToggle,
}: {
  items: Purchase[];
  total: number;
  spent: number;
  /** while searching the list is partial, so the totals of every material are left out */
  searching: boolean;
  canEdit: boolean;
  onEdit: (p: Purchase) => void;
  projectId: string;
  openId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-3 md:hidden">
      <ul className="space-y-3">
        {items.map((p, i) => (
          <MaterialCard key={p.id} n={i + 1} p={p} canEdit={canEdit} onEdit={onEdit} projectId={projectId} open={openId === p.id} onToggle={onToggle} />
        ))}
      </ul>
      <div hidden={searching} className={`${mono.card} grid grid-cols-2 gap-3 px-5 py-4`}>
        <div className="min-w-0">
          <p className={mono.label}>Total planned cost</p>
          <p className="mt-0.5 truncate text-lg font-semibold tabular-nums text-[#111111]">{money(total)}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className={mono.label}>Total spent so far</p>
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
  projectId,
  open,
  onToggle,
}: {
  n: number;
  p: Purchase;
  canEdit: boolean;
  onEdit: (p: Purchase) => void;
  projectId: string;
  open: boolean;
  onToggle: (id: string) => void;
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
          <AddedHistory p={p} />
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
            {qtyText(p.arrived)} <span className="text-[#666666]">of {qtyText(p.quantity)} {p.unit} ordered</span>
          </span>
          <span className={`tabular-nums ${left.cls}`}>{p.state === "part" || p.state === "none" ? `${left.text} to come` : left.text}</span>
        </div>
        <ArrivalMeter p={p} />
      </div>

      {/* planned cost and spent */}
      <dl className="mt-3 grid grid-cols-2 gap-2">
        <div className={mono.tile}>
          <dt className={mono.label}>Planned cost</dt>
          <dd className="mt-0.5 truncate text-[15px] font-semibold tabular-nums text-[#111111]">{money(p.amount)}</dd>
        </div>
        <div className={mono.tile}>
          <dt className={mono.label}>Spent so far</dt>
          <dd className={`mt-0.5 truncate text-[15px] font-semibold tabular-nums ${over ? "text-[#B3261E]" : "text-[#111111]"}`}>{money(p.spent ?? 0)}</dd>
        </div>
      </dl>

      {/* one big button: the deliveries open right here, with Add delivery */}
      <button
        type="button"
        onClick={() => onToggle(p.id)}
        aria-expanded={open}
        className={`${mono.secondary} mt-3 h-12 w-full px-3 font-semibold`}
      >
        <FiTruck aria-hidden /> Deliveries
        {p.deliveries.length > 0 && <span className="font-normal tabular-nums text-[#666666]">· {p.deliveries.length}</span>}
        <FiChevronDown aria-hidden className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="-mx-4 mt-3 border-t border-[#EFEFED] px-4 pt-4">
          <DeliveriesPanel projectId={projectId} purchase={p} canEdit={canEdit} />
        </div>
      )}
    </li>
  );
});

/* ------------------------------------------ the table ------------------------------------------ */

const MaterialsTable = memo(function MaterialsTable({
  projectId,
  items,
  canEdit,
  onEdit,
  openId,
  onToggle,
}: {
  projectId: string;
  items: Purchase[];
  canEdit: boolean;
  onEdit: (p: Purchase) => void;
  openId: string | null;
  onToggle: (id: string) => void;
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
                Still to come
              </th>
              <th scope="col" className={`${mono.th} text-right`}>
                Planned cost
              </th>
              <th scope="col" className={`${mono.th} text-right`}>
                Spent
              </th>
              <th scope="col" className={`${mono.th} w-46`}>
                <span className="sr-only">Deliveries, bill and actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFEFED]">
            {items.map((p, i) => (
              <Row key={p.id} n={i + 1} p={p} canEdit={canEdit} onEdit={onEdit} projectId={projectId} open={openId === p.id} onToggle={onToggle} />
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
  projectId,
  open,
  onToggle,
}: {
  n: number;
  p: Purchase;
  canEdit: boolean;
  onEdit: (p: Purchase) => void;
  projectId: string;
  open: boolean;
  onToggle: (id: string) => void;
}) {
  const left = leftText(p);
  const over = p.spent > p.amount + 0.5;

  return (
    <Fragment>
      <tr className={`align-top ${open ? "bg-[#FAFAF9]" : ""}`}>
        <td className={`${mono.td} tabular-nums text-[#8C8C8C]`}>{n}</td>
        <td className={mono.td}>
          <p className="font-medium text-[#111111]">{p.name}</p>
          <p className="mt-0.5 text-xs text-[#666666]">
            {shortDate(p.date)}
            {p.note && ` · ${p.note}`}
          </p>
          <AddedHistory p={p} />
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
            <button
              type="button"
              onClick={() => onToggle(p.id)}
              aria-expanded={open}
              className={`${mono.secondary} min-h-10 px-3 text-sm ${open ? "border-[#111111]" : ""}`}
              aria-label={`Deliveries of ${p.name}: ${qtyText(p.arrived)} of ${qtyText(p.quantity)} came`}
            >
              <FiTruck aria-hidden /> Deliveries <FiChevronDown aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`} />
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
      {/* the deliveries, right under the material, with Add delivery */}
      {open && (
        <tr className="bg-[#FAFAF9]">
          <td colSpan={8} className="border-t border-[#EFEFED] px-4 pb-5 pt-4 sm:pl-14">
            <DeliveriesPanel projectId={projectId} purchase={p} canEdit={canEdit} />
          </td>
        </tr>
      )}
    </Fragment>
  );
});
/**
 * When more of a material was added later: the first lot and each addition with its date,
 * e.g. "10,000 on 1 Nov · +5,000 on 8 Nov". Nothing when it was added once.
 */
function AddedHistory({ p }: { p: Purchase }) {
  const adds = p.additions ?? [];
  if (adds.length === 0) return null;
  return (
    <ul aria-label={`How ${p.name} was added`} className="mt-1 flex flex-wrap gap-1">
      <li className="rounded-md bg-[#F1F1EF] px-1.5 py-0.5 text-[11px] tabular-nums text-[#333333]">
        {qtyText(p.firstQuantity ?? p.quantity)} on {shortDate(p.date)}
      </li>
      {adds.map((a) => (
        <li key={a.id} title={a.note || `Added by ${a.addedBy}`} className="rounded-md bg-[#111111] px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
          +{qtyText(a.quantity)} on {shortDate(a.date)}
        </li>
      ))}
    </ul>
  );
}