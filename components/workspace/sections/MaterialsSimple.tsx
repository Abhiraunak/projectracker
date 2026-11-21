"use client";

import { Fragment, memo, useDeferredValue, useState, type ReactNode } from "react";
import { FiArchive, FiChevronDown, FiClipboard, FiCornerUpLeft, FiDownload, FiEdit2, FiFileText, FiImage, FiPlus, FiPrinter, FiSearch, FiTrash2, FiTruck, FiX } from "react-icons/fi";
import { ConfirmDeleteDialog } from "@/components/utilites/Confirmdeletedialog";
import { describeError } from "@/lib/api";
import { useCan } from "@/hooks/useProjectAccess";
import { useArchivePurchase, useMaterialPurchases, useRemovePurchases } from "@/hooks/useMaterialPurchases";
import { useProjectHub } from "@/hooks/useProjectHub";
import type { Purchase } from "@/lib/inventory/purchases";
import { shortDate } from "@/lib/projects/hub";
import { SectionError, SectionSkeleton } from "../ui";
import { DeliveriesPanel, leftText } from "./materials/DeliveryLog";
import { MaterialsPrint } from "./materials/MaterialsPrint";
import { mono } from "./materials/mono";
import { PurchaseDialog } from "./materials/PurchaseDialog";
import { EstimateImportDialog } from "./materials/EstimateImportDialog";
import { money, qtyText } from "./materials/purchaseFormat";

/** Lower case, spaces squeezed: "  Red  Bricks" and "red bricks" match */
export const norm = (v: string | null | undefined) => (v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
/** A material matches when its name, note or unit has the search in it */
const materialMatches = (p: Purchase, q: string) => !q || [p.name, p.note, p.unit, p.section].some((v) => norm(v).includes(q));

/**
 * The Materials tab, kept simple:
 *  - two tiles: the planned cost of everything (quantity × rate, blue) and what the deliveries cost (spent so far, green;
 *    red once it goes over the plan);
 *  - search, Add material, From estimate and Print;
 *  - the list: S.No, material, quantity (at the rate), ordered (what has come), still to come, planned cost and spent.
 *    Deliveries opens that material's deliveries right inside its row, with Add delivery there;
 *  - Archived materials at the bottom (counted nowhere), to restore or delete.
 */
export default function MaterialsSimple({ projectId }: { projectId: string }) {
  const book = useMaterialPurchases(projectId);
  const canAdd = useCan("stock.receive");
  const site = useProjectHub(projectId).data?.project.title ?? "this site"; // already loaded by the project page
  const [dialog, setDialog] = useState<{ editing: Purchase | null } | null>(null);
  const [fromEstimate, setFromEstimate] = useState(false); // "From estimate": bring the Material estimate's lines in
  const [openId, setOpenId] = useState<string | null>(null); // the material whose deliveries are open in its row
  const toggle = (id: string) => setOpenId((o) => (o === id ? null : id));
  const archive = useArchivePurchase(projectId);
  const onArchive = (p: Purchase) => {
    if (openId === p.id) setOpenId(null);
    archive.mutate({ purchaseId: p.id, archived: true });
  };
  const [printing, setPrinting] = useState(false);
  const [search, setSearch] = useState("");
  const q = norm(useDeferredValue(search)); // typing stays smooth on a long list

  if (book.isPending) return <SectionSkeleton />;
  if (book.isError) return <SectionError error={book.error} onRetry={() => void book.refetch()} />;
  const { items, total, names } = book.data;
  const spent = book.data.spentTotal ?? 0; // older servers don't send it
  const pct = total > 0 ? Math.round((spent / total) * 100) : null;
  const over = spent > total + 0.5 && total > 0;
  const shown = q ? items.filter((p) => materialMatches(p, q)) : items;

  return (
    <div className="space-y-6">
      {/* planned cost against what was spent */}
      <section aria-label="Material cost" className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <Figure tone="blue" icon={<FiClipboard aria-hidden />} label="Planned cost" value={money(total)} note={`${items.length} ${items.length === 1 ? "material" : "materials"} · quantity × rate`} />
        <Figure
          tone={over ? "red" : "green"}
          icon={<FiFileText aria-hidden />}
          label="Spent so far"
          value={money(spent)}
          note={pct === null ? "What the deliveries cost" : over ? `${money(spent - total)} over the plan` : `${pct}% of the planned cost`}
          meter={pct === null ? null : Math.min(100, pct)}
        />
      </section>

      {/* search, then the buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {items.length > 0 && (
          <div className="min-w-0 flex-1">
            <MaterialSearch value={search} onChange={setSearch} label="Search materials" note={q ? `${shown.length} of ${items.length} ${items.length === 1 ? "material" : "materials"}` : null} />
          </div>
        )}
        <div className={`grid grid-cols-2 gap-2 sm:flex sm:flex-wrap ${items.length === 0 ? "sm:ml-auto" : ""}`}>
          {canAdd && (
            <button type="button" onClick={() => setDialog({ editing: null })} className={`${mono.primary} col-span-2 h-12 sm:h-auto`}>
              <FiPlus aria-hidden /> Add material
            </button>
          )}
          {canAdd && (
            <button type="button" onClick={() => setFromEstimate(true)} className={mono.secondary}>
              <FiDownload aria-hidden /> From estimate
            </button>
          )}
          {items.length > 0 && (
            <button type="button" onClick={() => setPrinting(true)} className={mono.secondary}>
              <FiPrinter aria-hidden /> Print
            </button>
          )}
        </div>
      </div>

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
            onArchive={onArchive}
            projectId={projectId}
            openId={openId}
            onToggle={toggle}
          />
          {/* wider screens: the table */}
          <div className="hidden md:block">
            <MaterialsTable projectId={projectId} items={shown} canEdit={canAdd} onEdit={(p) => setDialog({ editing: p })} onArchive={onArchive} openId={openId} onToggle={toggle} />
          </div>
        </>
      )}

      {archive.isError && (
        <p role="alert" className="text-sm text-[#B3261E]">
          {describeError(archive.error)}
        </p>
      )}
      {/* archived materials: off the list, counted nowhere; restore, or delete one or many */}
      {(book.data.archived?.length ?? 0) > 0 && <ArchivedMaterials projectId={projectId} items={book.data.archived!} canEdit={canAdd} />}

      {fromEstimate && <EstimateImportDialog projectId={projectId} onClose={() => setFromEstimate(false)} />}
      {dialog && <PurchaseDialog projectId={projectId} names={names} editing={dialog.editing} onClose={() => setDialog(null)} />}
      {printing && <MaterialsPrint items={items} total={total} spent={spent} site={site} onDone={() => setPrinting(false)} />}
    </div>
  );
}

/* Colour, used sparingly: blue = planned, green = spent / all here, amber = still to come, red = over the plan */
const TONE = {
  blue: { tile: "border-[#B5D4F4] bg-[#E6F1FB]", label: "text-[#185FA5]", value: "text-[#0C447C]", track: "bg-[#B5D4F4]", fill: "bg-[#185FA5]" },
  green: { tile: "border-[#9FE1CB] bg-[#E1F5EE]", label: "text-[#0F6E56]", value: "text-[#085041]", track: "bg-[#9FE1CB]", fill: "bg-[#0F6E56]" },
  red: { tile: "border-[#F7C1C1] bg-[#FCEBEB]", label: "text-[#A32D2D]", value: "text-[#791F1F]", track: "bg-[#F7C1C1]", fill: "bg-[#A32D2D]" },
} as const;

/** How much of a material has come, as a thin bar: amber while little has come, blue past half, green when all is here */
function OrderedMeter({ p }: { p: Purchase }) {
  const pct = p.quantity > 0 ? Math.min(100, (p.arrived / p.quantity) * 100) : 0;
  const fill = p.state === "all" || p.state === "extra" ? "bg-[#1D9E75]" : pct >= 50 ? "bg-[#378ADD]" : "bg-[#BA7517]";
  return (
    <span aria-hidden className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#EFEFED]">
      <span className={`block h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
    </span>
  );
}

/** "Still to come" as a small label: amber with how much, or green "All here" / "… extra" */
function ToCome({ p }: { p: Purchase }) {
  const left = leftText(p);
  const done = p.state === "all" || p.state === "extra";
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${done ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-[#FAEEDA] text-[#854F0B]"}`}>
      {left.text}
    </span>
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

function Figure({ tone, icon, label, value, note, meter }: { tone: keyof typeof TONE; icon: ReactNode; label: string; value: string; note: string; meter?: number | null }) {
  const t = TONE[tone];
  return (
    <div className={`h-full min-w-0 rounded-[22px] border px-4 py-3.5 sm:px-5 sm:py-4 ${t.tile}`}>
      <p className={`flex items-center gap-1.5 text-xs ${t.label}`}>
        {icon} {label}
      </p>
      <p className={`mt-1 truncate text-xl font-semibold tabular-nums tracking-[-0.01em] sm:text-2xl ${t.value}`}>{value}</p>
      {meter !== undefined && meter !== null && (
        <span aria-hidden className={`mt-2.5 block h-1.5 overflow-hidden rounded-full ${t.track}`}>
          <span className={`block h-full rounded-full ${t.fill}`} style={{ width: `${meter}%` }} />
        </span>
      )}
      <p className={`mt-1.5 truncate text-xs ${t.label}`}>{note}</p>
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
  onArchive,
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
  onArchive: (p: Purchase) => void;
  projectId: string;
  openId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-3 md:hidden">
      <ul className="space-y-3">
        {items.map((p, i) => (
          <MaterialCard key={p.id} n={i + 1} p={p} canEdit={canEdit} onEdit={onEdit} onArchive={onArchive} projectId={projectId} open={openId === p.id} onToggle={onToggle} />
        ))}
      </ul>
      <div hidden={searching} className={`${mono.card} grid grid-cols-2 gap-3 px-5 py-4`}>
        <div className="min-w-0">
          <p className={mono.label}>Total planned cost</p>
          <p className="mt-0.5 truncate text-lg font-semibold tabular-nums text-[#0C447C]">{money(total)}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className={mono.label}>Total spent so far</p>
          <p className={`mt-0.5 truncate text-lg font-semibold tabular-nums ${spent > total + 0.5 ? "text-[#A32D2D]" : "text-[#085041]"}`}>{money(spent)}</p>
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
  onArchive,
  projectId,
  open,
  onToggle,
}: {
  n: number;
  p: Purchase;
  canEdit: boolean;
  onEdit: (p: Purchase) => void;
  onArchive: (p: Purchase) => void;
  projectId: string;
  open: boolean;
  onToggle: (id: string) => void;
}) {
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
            <button type="button" onClick={() => onArchive(p)} className={mono.icon} aria-label={`Archive ${p.name}`} title="Archive (takes it off the list)">
              <FiArchive aria-hidden />
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
          <ToCome p={p} />
        </div>
        <OrderedMeter p={p} />
      </div>

      {/* planned cost and spent */}
      <dl className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-[#E6F1FB] px-4 py-3">
          <dt className="text-xs text-[#185FA5]">Planned cost</dt>
          <dd className="mt-0.5 truncate text-[15px] font-semibold tabular-nums text-[#0C447C]">{money(p.amount)}</dd>
        </div>
        <div className={`rounded-2xl px-4 py-3 ${over ? "bg-[#FCEBEB]" : "bg-[#E1F5EE]"}`}>
          <dt className={`text-xs ${over ? "text-[#A32D2D]" : "text-[#0F6E56]"}`}>Spent so far</dt>
          <dd className={`mt-0.5 truncate text-[15px] font-semibold tabular-nums ${over ? "text-[#791F1F]" : "text-[#085041]"}`}>{money(p.spent ?? 0)}</dd>
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
  onArchive,
  openId,
  onToggle,
}: {
  projectId: string;
  items: Purchase[];
  canEdit: boolean;
  onEdit: (p: Purchase) => void;
  onArchive: (p: Purchase) => void;
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
              <Row key={p.id} n={i + 1} p={p} canEdit={canEdit} onEdit={onEdit} onArchive={onArchive} projectId={projectId} open={openId === p.id} onToggle={onToggle} />
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
  onArchive,
  projectId,
  open,
  onToggle,
}: {
  n: number;
  p: Purchase;
  canEdit: boolean;
  onEdit: (p: Purchase) => void;
  onArchive: (p: Purchase) => void;
  projectId: string;
  open: boolean;
  onToggle: (id: string) => void;
}) {
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
          <OrderedMeter p={p} />
        </td>
        <td className={`${mono.td} text-right`}>
          <ToCome p={p} />
        </td>
        <td className={`${mono.td} whitespace-nowrap text-right tabular-nums text-[#185FA5]`}>{money(p.amount)}</td>
        <td className={`${mono.td} whitespace-nowrap text-right font-semibold tabular-nums ${over ? "text-[#A32D2D]" : "text-[#0F6E56]"}`}>
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
            {canEdit && (
              <button type="button" onClick={() => onArchive(p)} className={mono.icon} aria-label={`Archive ${p.name}`} title="Archive (takes it off the list)">
                <FiArchive aria-hidden />
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

/* ------------------------------------------ archived materials ------------------------------------------ */

/**
 * Materials taken off the list: counted nowhere, deliveries kept. Restore puts one back as it was; Delete removes
 * it for good with its deliveries and bills. Tick several (or Select all) to delete them together: one request, all
 * or nothing, so the database is never left half done.
 */
function ArchivedMaterials({ projectId, items, canEdit }: { projectId: string; items: Purchase[]; canEdit: boolean }) {
  const archive = useArchivePurchase(projectId);
  const remove = useRemovePurchases(projectId);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Purchase[] | null>(null);
  const picked = items.filter((p) => ticked.has(p.id)); // ticks of restored or deleted materials drop out
  const allTicked = picked.length === items.length;
  const tick = (id: string) =>
    setTicked((t) => {
      const next = new Set(t);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const deliveriesOf = (list: Purchase[]) => list.reduce((s, p) => s + p.deliveries.length + (p.archived?.length ?? 0), 0);
  const many = (deleting?.length ?? 0) > 1;
  const dCount = deleting ? deliveriesOf(deleting) : 0;

  return (
    <details className={`${mono.card} group overflow-hidden`}>
      <summary className={`flex min-h-12 cursor-pointer list-none items-center gap-2 px-5 text-sm font-medium text-[#333333] ${mono.ring}`}>
        <FiChevronDown aria-hidden className="transition-transform group-open:rotate-180" />
        Archived materials ({items.length})<span className="ml-auto text-xs font-normal text-[#8C8C8C]">not counted</span>
      </summary>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-3 border-t border-[#EFEFED] bg-[#F7F7F5] px-5 py-2">
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-[#333333]">
            <input
              type="checkbox"
              checked={allTicked}
              ref={(el) => {
                if (el) el.indeterminate = picked.length > 0 && !allTicked;
              }}
              onChange={() => setTicked(allTicked ? new Set() : new Set(items.map((p) => p.id)))}
              className="h-4 w-4 accent-[#111111]"
            />
            Select all
          </label>
          {picked.length > 0 && (
            <button type="button" onClick={() => setDeleting(picked)} className={`${mono.secondary} ml-auto min-h-10 px-3 text-sm text-[#B3261E] hover:bg-[#FCEDEC]`}>
              <FiTrash2 aria-hidden /> Delete selected ({picked.length})
            </button>
          )}
        </div>
      )}

      <ul className="divide-y divide-[#EFEFED] border-t border-[#EFEFED]">
        {items.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 text-sm">
            {canEdit && (
              <input type="checkbox" checked={ticked.has(p.id)} onChange={() => tick(p.id)} aria-label={`Select ${p.name}`} className="h-4 w-4 shrink-0 accent-[#111111]" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[#666666] line-through">{p.name}</span>
              <span className="block text-xs text-[#8C8C8C]">
                {qtyText(p.quantity)} {p.unit} · {money(p.amount)} · {p.deliveries.length} {p.deliveries.length === 1 ? "delivery" : "deliveries"}
              </span>
            </span>
            {canEdit && (
              <span className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => archive.mutate({ purchaseId: p.id, archived: false })}
                  disabled={archive.isPending}
                  className={`${mono.secondary} min-h-10 px-3 text-sm`}
                >
                  <FiCornerUpLeft aria-hidden /> Restore
                </button>
                <button type="button" onClick={() => setDeleting([p])} className={`${mono.secondary} min-h-10 px-3 text-sm text-[#B3261E] hover:bg-[#FCEDEC]`}>
                  <FiTrash2 aria-hidden /> Delete
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      {archive.isError && (
        <p role="alert" className="border-t border-[#EFEFED] px-5 py-3 text-sm text-[#B3261E]">
          {describeError(archive.error)}
        </p>
      )}

      <ConfirmDeleteDialog
        open={deleting !== null}
        onClose={() => {
          setDeleting(null);
          remove.reset();
        }}
        title={many ? `Delete ${deleting!.length} materials?` : "Delete material?"}
        itemName={!many && deleting?.[0] ? deleting[0].name : undefined}
        description={
          many ? (
            <>
              Are you sure you want to delete these <strong className="font-semibold text-stone-900">{deleting!.length} archived materials</strong>?
              <br />
              You can&rsquo;t undo this action.
            </>
          ) : undefined
        }
        warning={dCount > 0 ? `Their ${dCount} ${dCount === 1 ? "delivery" : "deliveries"} and bills are deleted too.` : "Its bill, if any, is deleted too."}
        pending={remove.isPending}
        error={remove.error ? describeError(remove.error) : null}
        onConfirm={() =>
          deleting &&
          remove.mutate(
            deleting.map((p) => p.id),
            {
              onSuccess: () => {
                setDeleting(null);
                setTicked(new Set());
              },
            },
          )
        }
      />
    </details>
  );
}