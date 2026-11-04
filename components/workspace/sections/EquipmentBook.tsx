"use client";

import { memo, useMemo, useState } from "react";
import { FiAlertTriangle, FiArrowLeft, FiChevronRight, FiCornerDownLeft, FiEdit2, FiMinusCircle, FiPlus, FiPrinter, FiSearch, FiTool, FiTruck } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useEquipmentItem, useEquipmentRegister, useSiteEquipment, useUndoMove } from "@/hooks/useEquipment";
import { useProjectHub } from "@/hooks/useProjectHub";
import { hrefFor, onPlaceClick, useWorkspaceItem } from "@/hooks/useWorkspacePlace";
import { describeError } from "@/lib/api";
import { CONDITION_LABEL, hireLabel, qty, totalAt, type CategoryKey, type EquipmentDetail, type HistoryEntry, type MoveKind, type RegisterItem, type SiteItem } from "@/lib/equipment/api";
import { rupees, rupeesShort } from "@/lib/projects/hub";
import { EmptyState, SectionError, SectionSkeleton } from "../ui";
import { EquipmentForm } from "./equipment/EquipmentForm";
import { BringDialog, MoveDialog, type Movable } from "./equipment/MoveDialog";
import { PrintRegister, PrintSite } from "./equipment/EquipmentPrint";
import { CATEGORY_LABEL, ConditionBadge, daysSince, field, longDate, outlineBtn, primaryBtn, todayLocal } from "./equipment/shared";

const REGISTER = "register"; // ?i=register: every item, at every site and in the yard

/**
 * Phase 6: equipment. Three screens in one section, moved between in place (the address keeps ?i=… so back works):
 *   at this site  what is here now, since when, what it is costing, with "Bring equipment here" and "Send back"
 *   register      every item the company has or hires, and where each piece is (the yard and every site)
 *   an item       where it is, hire by site, and its full history, with move / add more / write off
 */
export default function EquipmentBook({ projectId }: { projectId: string }) {
  const item = useWorkspaceItem();
  if (item === REGISTER) return <RegisterView projectId={projectId} />;
  if (item) return <ItemView projectId={projectId} id={item} />;
  return <SiteView projectId={projectId} />;
}

type Dialog =
  | { type: "bring" }
  | { type: "new" }
  | { type: "edit"; item: RegisterItem }
  | { type: "move"; item: Movable; kind: MoveKind; from?: string; to?: string };

/** The dialogs need the register (for the list of sites and items); it is fetched only once a dialog opens */
function Dialogs({ projectId, dialog, onClose }: { projectId: string; dialog: Dialog | null; onClose: () => void }) {
  const register = useEquipmentRegister(dialog !== null);
  if (!dialog) return null;
  if (!register.data) return register.isError ? <p role="alert" className="text-sm text-red-700">{describeError(register.error)}</p> : null;
  const projects = register.data.projects;
  if (dialog.type === "bring") return <BringDialog projectId={projectId} register={register.data} onClose={onClose} />;
  if (dialog.type === "new") return <EquipmentForm projectId={projectId} projects={projects} nextNumber={register.data.nextNumber} onClose={onClose} />;
  if (dialog.type === "edit") return <EquipmentForm projectId={projectId} projects={projects} item={dialog.item} onClose={onClose} />;
  return <MoveDialog item={dialog.item} kind={dialog.kind} projects={projects} from={dialog.from} to={dialog.to} onClose={onClose} />;
}

function Crumbs({ projectId, current }: { projectId: string; current: "site" | "register" | "item" }) {
  const site = { projectId, section: "equipment" as const, item: null };
  const all = { projectId, section: "equipment" as const, item: REGISTER };
  const link = "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900";
  return (
    <nav aria-label="Equipment" className="-ml-2 flex flex-wrap items-center gap-1">
      {current !== "site" && (
        <a href={hrefFor(site)} onClick={onPlaceClick(site)} className={link}>
          <FiArrowLeft aria-hidden /> At this site
        </a>
      )}
      {current === "item" && (
        <a href={hrefFor(all)} onClick={onPlaceClick(all)} className={link}>
          All equipment
        </a>
      )}
    </nav>
  );
}

/* ------------------------------------------- at this site ------------------------------------------- */

function SiteView({ projectId }: { projectId: string }) {
  const site = useSiteEquipment(projectId);
  const canManage = useCan("equipment.manage");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [printing, setPrinting] = useState(false);
  const siteName = useProjectHub(projectId).data?.project.title ?? "this site"; // already loaded by the project page
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const all = { projectId, section: "equipment" as const, item: REGISTER };

  if (site.isPending) return <SectionSkeleton />;
  if (site.isError) return <SectionError error={site.error} onRetry={() => void site.refetch()} />;
  const data = site.data;
  const present = data.categories.filter((c) => data.items.some((i) => i.category === c.key));
  const shown = category ? data.items.filter((i) => i.category === category) : data.items;
  const today = todayLocal();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-600">
          <span className="font-semibold text-stone-900">{data.totals.items}</span> {data.totals.items === 1 ? "item" : "items"} here
          {data.totals.hireThisMonth > 0 && (
            <>
              {" "}
              · <span className="font-semibold text-stone-900">{rupeesShort(data.totals.hireThisMonth)}</span> hire this month
            </>
          )}
          {data.totals.serviceDue > 0 && <span className="ml-2 text-amber-700">· {data.totals.serviceDue} due for service</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <button type="button" onClick={() => setDialog({ type: "bring" })} className={`${primaryBtn} inline-flex items-center gap-2`}>
              <FiTruck aria-hidden /> Bring equipment here
            </button>
          )}
          {canManage && (
            <button type="button" onClick={() => setDialog({ type: "new" })} className={outlineBtn}>
              <FiPlus aria-hidden /> Add equipment
            </button>
          )}
          {data.items.length > 0 && (
            <button type="button" onClick={() => setPrinting(true)} className={outlineBtn}>
              <FiPrinter aria-hidden /> Print
            </button>
          )}
          <a href={hrefFor(all)} onClick={onPlaceClick(all)} className={outlineBtn}>
            All equipment <FiChevronRight aria-hidden />
          </a>
        </div>
      </div>

      {present.length > 1 && (
        <div role="group" aria-label="Kind" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <CategoryChip label={`All (${data.items.length})`} on={category === null} onClick={() => setCategory(null)} />
          {present.map((c) => (
            <CategoryChip key={c.key} label={`${c.label} (${data.items.filter((i) => i.category === c.key).length})`} on={category === c.key} onClick={() => setCategory(c.key)} />
          ))}
        </div>
      )}

      {data.items.length === 0 ? (
        <EmptyState
          title="No equipment at this site"
          hint={canManage ? "Use Bring equipment here to send shuttering or machines from the yard or another site." : "When equipment is sent here, it will show up here."}
        />
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
          {shown.map((i) => (
            <SiteRow key={i.id} projectId={projectId} item={i} today={today} canManage={canManage} onSend={setDialog} />
          ))}
        </ul>
      )}

      {data.earlier.length > 0 && (
        <details className="rounded-xl border border-stone-200">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-medium text-stone-700">
            Here earlier ({data.earlier.length}){data.totals.hireSoFar > 0 && <span className="ml-auto font-normal text-stone-500">{rupees(data.totals.hireSoFar)} hire in all</span>}
          </summary>
          <ul className="divide-y divide-stone-100 border-t border-stone-100 text-sm">
            {data.earlier.map((e) => {
              const place = { projectId, section: "equipment" as const, item: e.id };
              return (
                <li key={e.id}>
                  <a href={hrefFor(place)} onClick={onPlaceClick(place)} className="flex min-h-12 items-center gap-3 px-4 hover:bg-stone-50">
                    <span className="min-w-0 flex-1 truncate">{e.name}</span>
                    <span className="text-stone-500">{qty(e.unitDays)} {e.unit}-days</span>
                    {e.hireSoFar > 0 && <span className="w-24 text-right tabular-nums">{rupees(e.hireSoFar)}</span>}
                  </a>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <Dialogs projectId={projectId} dialog={dialog} onClose={() => setDialog(null)} />
      {printing && <PrintSite items={shown} site={siteName} onDone={() => setPrinting(false)} />}
    </div>
  );
}

/** What the listed equipment cost and what it is worth today (own equipment with those amounts set) */
function ValueTotals({ items }: { items: RegisterItem[] }) {
  const cost = items.reduce((s, i) => s + (totalAt(i.total, i.unitCost) ?? 0), 0);
  const value = items.reduce((s, i) => s + (totalAt(i.total, i.marketValue) ?? 0), 0);
  if (!cost && !value) return null;
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-stone-600">
      <div>
        <dt className="inline">Cost </dt>
        <dd className="inline font-semibold tabular-nums text-stone-900">{rupees(cost)}</dd>
      </div>
      <div>
        <dt className="inline">Current market value </dt>
        <dd className="inline font-semibold tabular-nums text-stone-900">{rupees(value)}</dd>
      </div>
    </dl>
  );
}

function CategoryChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-10 shrink-0 rounded-full border px-3 text-sm transition-colors ${on ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 text-stone-700 hover:border-stone-500"}`}
    >
      {label}
    </button>
  );
}

const SiteRow = memo(function SiteRow({
  projectId,
  item: i,
  today,
  canManage,
  onSend,
}: {
  projectId: string;
  item: SiteItem;
  today: string;
  canManage: boolean;
  onSend: (d: Dialog) => void;
}) {
  const place = { projectId, section: "equipment" as const, item: i.id };
  const due = i.serviceDue && i.serviceDue <= today;
  return (
    <li className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
      <a href={hrefFor(place)} onClick={onPlaceClick(place)} className="min-w-0 flex-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-stone-500">{i.number}</span>
          <span className="font-medium text-stone-900 hover:underline">{i.name}</span>
          <ConditionBadge condition={i.condition} />
          {due && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800">
              <FiTool aria-hidden /> Service due
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs text-stone-500">
          {CATEGORY_LABEL[i.category]}
          {i.since && ` · here since ${longDate(i.since)} (${daysSince(i.since)} days)`}
          {i.ownership === "hired" && ` · hired${i.supplier ? ` from ${i.supplier}` : ""}`}
        </span>
      </a>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <span className="sm:text-right">
          <span className="block font-semibold tabular-nums text-stone-900">
            {qty(i.here)} <span className="font-normal text-stone-500">{i.unit}</span>
          </span>
          {i.hireThisMonth > 0 && <span className="block text-xs tabular-nums text-stone-500">{rupees(i.hireThisMonth)} this month</span>}
        </span>
        {canManage && (
          <button
            type="button"
            onClick={() => onSend({ type: "move", kind: "move", item: { id: i.id, name: i.name, unit: i.unit, yard: 0, sites: [{ projectId, title: "This site", qty: i.here }] }, from: projectId, to: "" })}
            className={outlineBtn}
          >
            <FiCornerDownLeft aria-hidden /> Send back
          </button>
        )}
      </div>
    </li>
  );
});

/* --------------------------------------------- register --------------------------------------------- */

function RegisterView({ projectId }: { projectId: string }) {
  const register = useEquipmentRegister();
  const canManage = useCan("equipment.manage");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [printing, setPrinting] = useState(false);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [retired, setRetired] = useState(false);

  const list = useMemo(() => {
    const words = q.trim().toLowerCase();
    return (register.data?.items ?? [])
      .filter((i) => (retired || !i.retired) && (!category || i.category === category) && (!words || `${i.number} ${i.name} ${i.code ?? ""} ${i.supplier ?? ""}`.toLowerCase().includes(words)))
      .sort((x, y) => Number(y.total > 0) - Number(x.total > 0)); // none left: at the end
  }, [register.data, q, category, retired]);

  if (register.isPending) return <SectionSkeleton />;
  if (register.isError) return <SectionError error={register.error} onRetry={() => void register.refetch()} />;
  const data = register.data;
  const present = data.categories.filter((c) => data.items.some((i) => i.category === c.key && (retired || !i.retired)));
  const anyRetired = data.items.some((i) => i.retired);

  return (
    <div className="space-y-4">
      <Crumbs projectId={projectId} current="register" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <h2 className="flex-1 text-lg font-semibold">All equipment</h2>
        <div className="relative sm:w-64">
          <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" aria-label="Find equipment" placeholder="Find equipment" className={`${field} mt-0 pl-9`} />
        </div>
        {list.length > 0 && (
          <button type="button" onClick={() => setPrinting(true)} className={`${outlineBtn} justify-center`}>
            <FiPrinter aria-hidden /> Print list
          </button>
        )}
        {canManage && (
          <button type="button" onClick={() => setDialog({ type: "new" })} className={`${primaryBtn} inline-flex items-center justify-center gap-2`}>
            <FiPlus aria-hidden /> Add equipment
          </button>
        )}
      </div>

      <ValueTotals items={list} />

      {present.length > 1 && (
        <div role="group" aria-label="Kind" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <CategoryChip label="All" on={category === null} onClick={() => setCategory(null)} />
          {present.map((c) => (
            <CategoryChip key={c.key} label={c.label} on={category === c.key} onClick={() => setCategory(c.key)} />
          ))}
        </div>
      )}

      {data.items.length === 0 ? (
        <EmptyState title="No equipment yet" hint={canManage ? "Add your shuttering, scaffolding and machines once; then send them between the yard and sites." : "Nothing has been added to the register yet."} />
      ) : list.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-500">Nothing matches.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
          {list.map((i) => (
            <RegisterRow key={i.id} projectId={projectId} item={i} />
          ))}
        </ul>
      )}
      {anyRetired && (
        <label className="flex min-h-11 items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={retired} onChange={(e) => setRetired(e.target.checked)} className="h-4 w-4" /> Show retired items
        </label>
      )}

      <Dialogs projectId={projectId} dialog={dialog} onClose={() => setDialog(null)} />
      {printing && (
        <PrintRegister
          items={list}
          heading={[category ? data.categories.find((c) => c.key === category)?.label : "All kinds", q.trim() && `matching "${q.trim()}"`].filter(Boolean).join(" · ")}
          onDone={() => setPrinting(false)}
        />
      )}
    </div>
  );
}

const RegisterRow = memo(function RegisterRow({ projectId, item: i }: { projectId: string; item: RegisterItem }) {
  const place = { projectId, section: "equipment" as const, item: i.id };
  const here = i.sites.find((s) => s.projectId === projectId)?.qty ?? 0;
  return (
    <li>
      <a href={hrefFor(place)} onClick={onPlaceClick(place)} className={`flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-stone-50 ${i.retired ? "opacity-60" : ""}`}>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-stone-500">{i.number}</span>
            <span className="font-medium text-stone-900">{i.name}</span>
            {i.retired && <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">Retired</span>}
            {here > 0 && <span className="rounded bg-orange-50 px-1.5 py-0.5 text-xs font-medium text-orange-800">{qty(here)} here</span>}
          </span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">
            {[i.yard > 0 && `Yard ${qty(i.yard)}`, ...i.sites.map((s) => `${s.title} ${qty(s.qty)}`)].filter(Boolean).join(" · ") || "None left"}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-semibold tabular-nums text-stone-900">
            {qty(i.total)} <span className="font-normal text-stone-500">{i.unit}</span>
          </span>
          <span className="block text-xs text-stone-500">
            {i.ownership === "hired" ? "Hired" : totalAt(i.total, i.marketValue) !== null ? `worth ${rupeesShort(totalAt(i.total, i.marketValue)!)}` : CATEGORY_LABEL[i.category]}
          </span>
        </span>
        <FiChevronRight aria-hidden className="shrink-0 text-stone-300" />
      </a>
    </li>
  );
});

/* ---------------------------------------------- an item ---------------------------------------------- */

function ItemView({ projectId, id }: { projectId: string; id: string }) {
  const item = useEquipmentItem(id);
  const canManage = useCan("equipment.manage");
  const [dialog, setDialog] = useState<Dialog | null>(null);

  if (item.isPending) return <SectionSkeleton />;
  if (item.isError)
    return (
      <div className="space-y-4">
        <Crumbs projectId={projectId} current="item" />
        <SectionError error={item.error} onRetry={() => void item.refetch()} />
      </div>
    );
  const d = item.data;
  const open = (kind: MoveKind, from?: string, to?: string) => setDialog({ type: "move", kind, item: d, from, to });
  const today = todayLocal();

  return (
    <div className="space-y-5">
      <Crumbs projectId={projectId} current="item" />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-sm text-stone-500">{d.number}</p>
          <h2 className="text-xl font-semibold">{d.name}</h2>
          <p className="mt-0.5 text-sm text-stone-500">
            {[CATEGORY_LABEL[d.category], hireLabel(d), d.supplier && `${d.ownership === "hired" ? "from" : "bought from"} ${d.supplier}`, d.code && `Maker's serial ${d.code}`].filter(Boolean).join(" · ")}
          </p>
          {d.serviceDue && (
            <p className={`mt-1 inline-flex items-center gap-1 text-sm ${d.serviceDue <= today ? "font-medium text-amber-800" : "text-stone-500"}`}>
              <FiTool aria-hidden /> {d.serviceDue <= today ? "Service due since" : "Next service"} {longDate(d.serviceDue)}
            </p>
          )}
          {(d.unitCost !== null || d.marketValue !== null) && (
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {d.unitCost !== null && (
                <div>
                  <dt className="inline text-stone-500">Cost </dt>
                  <dd className="inline tabular-nums text-stone-900">
                    {rupees(d.unitCost)} each · <span className="font-semibold">{rupees(totalAt(d.total, d.unitCost)!)}</span> for {qty(d.total)}
                  </dd>
                </div>
              )}
              {d.marketValue !== null && (
                <div>
                  <dt className="inline text-stone-500">Market value </dt>
                  <dd className="inline tabular-nums text-stone-900">
                    {rupees(d.marketValue)} each · <span className="font-semibold">{rupees(totalAt(d.total, d.marketValue)!)}</span> for {qty(d.total)}
                    {d.marketValueOn && <span className="text-stone-500"> (as of {longDate(d.marketValueOn)})</span>}
                  </dd>
                </div>
              )}
            </dl>
          )}
          {d.notes && <p className="mt-2 max-w-prose whitespace-pre-line text-sm text-stone-600">{d.notes}</p>}
        </div>
        {canManage && (
          <button type="button" onClick={() => setDialog({ type: "edit", item: d })} className={outlineBtn}>
            <FiEdit2 aria-hidden /> Edit details
          </button>
        )}
      </header>

      <section aria-label="Where it is" className="rounded-xl border border-stone-200">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
          <h3 className="font-semibold">
            Where it is · {qty(d.total)} {d.unit}
          </h3>
        </div>
        <PlaceBar item={d} />
        <ul className="divide-y divide-stone-100">
          {d.yard > 0 && <PlaceRow label="Yard" count={d.yard} unit={d.unit} onMove={canManage ? () => open("move", "", projectId) : undefined} moveLabel="Send to a site" />}
          {d.sites.map((s) => (
            <PlaceRow key={s.projectId} label={s.title} here={s.projectId === projectId} count={s.qty} unit={d.unit} onMove={canManage ? () => open("move", s.projectId, "") : undefined} moveLabel="Move" />
          ))}
          {d.total === 0 && <li className="px-4 py-3 text-sm text-stone-500">None left: all written off.</li>}
        </ul>
        {canManage && (
          <div className="flex flex-wrap gap-2 border-t border-stone-100 p-3">
            <button type="button" onClick={() => open("add", undefined, "")} className={outlineBtn}>
              <FiPlus aria-hidden /> Add more
            </button>
            {d.total > 0 && (
              <button type="button" onClick={() => open("write_off")} className={outlineBtn}>
                <FiMinusCircle aria-hidden /> Write off
              </button>
            )}
          </div>
        )}
      </section>

      {d.use.some((u) => u.unitDays > 0) && <UseTable item={d} />}

      <History item={d} canManage={canManage} />

      <Dialogs projectId={projectId} dialog={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}

const BAR_COLORS = ["bg-stone-800", "bg-orange-500", "bg-sky-600", "bg-emerald-600", "bg-violet-500", "bg-amber-400"];

function PlaceBar({ item }: { item: EquipmentDetail }) {
  if (item.total <= 0) return null;
  const parts = [...(item.yard > 0 ? [{ key: "yard", label: "Yard", qty: item.yard }] : []), ...item.sites.map((s) => ({ key: s.projectId, label: s.title, qty: s.qty }))];
  return (
    <div className="px-4 pt-3">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-stone-100" role="img" aria-label={parts.map((p) => `${p.label} ${qty(p.qty)}`).join(", ")}>
        {parts.map((p, n) => (
          <span key={p.key} className={BAR_COLORS[n % BAR_COLORS.length]} style={{ width: `${(p.qty / item.total) * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

function PlaceRow({ label, here, count, unit, onMove, moveLabel }: { label: string; here?: boolean; count: number; unit: string; onMove?: () => void; moveLabel: string }) {
  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-2">
      <span className="min-w-0 flex-1 truncate text-sm">
        <span className="font-medium text-stone-900">{label}</span>
        {here && <span className="ml-2 rounded bg-orange-50 px-1.5 py-0.5 text-xs font-medium text-orange-800">this site</span>}
      </span>
      <span className="font-semibold tabular-nums">
        {qty(count)} <span className="font-normal text-stone-500">{unit}</span>
      </span>
      {onMove && (
        <button type="button" onClick={onMove} className="min-h-10 rounded-lg px-2 text-sm font-medium text-stone-700 underline-offset-2 hover:bg-stone-100 hover:underline">
          {moveLabel}
        </button>
      )}
    </li>
  );
}

function UseTable({ item }: { item: EquipmentDetail }) {
  const hired = item.ownership === "hired";
  // Our own things sitting in the yard cost nothing extra; hired ones cost rent wherever they are
  const rows = hired ? item.use : item.use.filter((u) => u.projectId !== null);
  if (!rows.some((u) => u.unitDays > 0)) return null;
  return (
    <section aria-label="Use by site" className="rounded-xl border border-stone-200">
      <h3 className="border-b border-stone-100 px-4 py-3 font-semibold">{hired ? "Hire by site" : "Time at each site"}</h3>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-stone-500">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">Place</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">{item.unit === "nos" ? "Piece" : item.unit}-days</th>
            {hired && <th scope="col" className="px-2 py-2 text-right font-medium">This month</th>}
            {hired && <th scope="col" className="px-4 py-2 text-right font-medium">In all</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((u) => (
            <tr key={u.projectId ?? "yard"}>
              <td className="px-4 py-2">{u.title}</td>
              <td className="px-2 py-2 text-right tabular-nums">{qty(u.unitDays)}</td>
              {hired && <td className="px-2 py-2 text-right tabular-nums">{rupees(u.chargeThisMonth)}</td>}
              {hired && <td className="px-4 py-2 text-right font-medium tabular-nums">{rupees(u.charge)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {hired && !item.hireRate && <p className="px-4 pb-3 text-xs text-amber-700">No hire rate set, so charges show as ₹0. Add it in Edit details.</p>}
    </section>
  );
}

const sentence = (h: HistoryEntry, unit: string) => {
  const n = `${qty(h.quantity)} ${unit}`;
  const at = (p: HistoryEntry["from"]) => p?.title ?? "the yard";
  if (h.kind === "add") return `${n} added at ${at(h.to)}`;
  if (h.kind === "write_off") return `${n} written off at ${at(h.from)}`;
  return `${n} moved from ${at(h.from)} to ${at(h.to)}`;
};

function History({ item, canManage }: { item: EquipmentDetail; canManage: boolean }) {
  const undo = useUndoMove();
  const latest = item.history[0];
  return (
    <section aria-label="History" className="rounded-xl border border-stone-200">
      <h3 className="border-b border-stone-100 px-4 py-3 font-semibold">History</h3>
      {undo.isError && (
        <p role="alert" className="flex items-center gap-2 bg-red-50 px-4 py-2 text-sm text-red-700">
          <FiAlertTriangle aria-hidden /> {describeError(undo.error)}
        </p>
      )}
      <ol className="divide-y divide-stone-100">
        {item.history.map((h) => (
          <li key={h.id} className="flex gap-3 px-4 py-3 text-sm">
            <span className="w-24 shrink-0 tabular-nums text-stone-500">{longDate(h.date)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-stone-900">{sentence(h, item.unit)}</span>
              <span className="block text-xs text-stone-500">
                {[h.kind === "move" && h.condition !== "good" && CONDITION_LABEL[h.condition], h.note, `by ${h.by}`].filter(Boolean).join(" · ")}
              </span>
            </span>
            {canManage && h === latest && item.history.length > 1 && (
              <button
                type="button"
                disabled={undo.isPending}
                onClick={() => {
                  if (window.confirm(`Undo: ${sentence(h, item.unit)}?`)) undo.mutate({ id: item.id, moveId: h.id });
                }}
                className="min-h-10 shrink-0 self-start rounded-lg px-2 text-sm font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-50"
              >
                Undo
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}