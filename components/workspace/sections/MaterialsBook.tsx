"use client";

import { lazy, memo, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { FiArrowDown, FiArrowLeft, FiArrowUp, FiBox, FiChevronDown, FiChevronRight, FiCreditCard, FiMoreHorizontal, FiPaperclip, FiPlus } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useMaterialsOverview } from "@/hooks/useMaterialsTab";
import { hrefFor, onPlaceClick, useWorkspaceItem } from "@/hooks/useWorkspacePlace";
import { rupees, rupeesShort } from "@/lib/projects/hub";
import { qty, type MaterialsOverview, type TabMaterial } from "@/lib/inventory/materialsTab";
import { EmptyState, SectionError, SectionSkeleton } from "../ui";
import { BarChart, Legend } from "./materials/BarChart";
import { MoveDialog, type MoveMode } from "./materials/MoveDialog";

// Heavier parts download only when someone opens them
const FullInventory = lazy(() => import("./MaterialsSection")); // "More": orders, requests, reservations, log
const MaterialDetailView = lazy(() => import("./materials/MaterialDetailView"));
const AddMaterialDialog = lazy(() => import("./materials/AddMaterialDialog").then((m) => ({ default: m.AddMaterialDialog })));
const ImportFromBoqDialog = lazy(() => import("@/components/inventory/ImportFromBoqDialog").then((m) => ({ default: m.ImportFromBoqDialog })));
const ExpensesSection = lazy(() => import("./ExpensesSection"));
const VendorPaymentsPanel = lazy(() => import("./materials/VendorPaymentsPanel").then((m) => ({ default: m.VendorPaymentsPanel })));

type View = "stock" | "payments" | "expenses";
const VIEWS: { key: View; label: string; hint: string; Icon: IconType }[] = [
  { key: "stock", label: "Stock", hint: "Received and issued", Icon: FiBox },
  { key: "payments", label: "Payments", hint: "Paid to vendors", Icon: FiCreditCard },
  { key: "expenses", label: "Expenses", hint: "Material expenses", Icon: FiPaperclip },
];

const MORE = "all"; // ?i=all: the full inventory screen (orders, requests, reservations…)

/**
 * The Materials tab, kept simple:
 *  - Stock · Payments · Expenses, as on the Labour page, and "Add materials" (import from the BOQ, or add by hand);
 *  - a bar graph of received and issued by month (all materials by value, or one by quantity);
 *  - one list grouped by section, each material with Received, Issued and its page (›).
 * Orders, requests and reservations still work, under "More".
 */
export default function MaterialsBook({ projectId }: { projectId: string }) {
  const item = useWorkspaceItem(); // null: the list · "all": More · otherwise a material's page
  const [view, setView] = useState<View>("stock");
  const [opened, setOpened] = useState<Set<View>>(() => new Set(["stock"]));
  const show = (v: View) => {
    setView(v);
    setOpened((s) => (s.has(v) ? s : new Set(s).add(v)));
  };

  // The Inventory page in the menu opens on this project next time too
  useEffect(() => {
    try {
      window.localStorage.setItem("active-project", projectId);
    } catch {
      /* storage blocked: nothing to remember */
    }
  }, [projectId]);

  const home = useMemo(() => ({ projectId, section: "materials" as const, item: null }), [projectId]);

  if (item === MORE)
    return (
      <div className="space-y-4">
        <BackLink place={home} label="Materials" />
        <Suspense fallback={<SectionSkeleton />}>
          <FullInventory projectId={projectId} />
        </Suspense>
      </div>
    );

  if (item)
    return (
      <div className="space-y-4">
        <BackLink place={home} label="All materials" />
        <Suspense fallback={<SectionSkeleton />}>
          <MaterialDetailView projectId={projectId} materialId={item} />
        </Suspense>
      </div>
    );

  return (
    <div className="space-y-5">
      <TopBar projectId={projectId} view={view} onView={show} />
      {/* Panels once opened stay mounted, so switching back keeps a half-filled form as it was */}
      <div hidden={view !== "stock"}>
        <StockView projectId={projectId} />
      </div>
      {opened.has("payments") && (
        <div hidden={view !== "payments"}>
          <Suspense fallback={<SectionSkeleton />}>
            <PaymentsView projectId={projectId} />
          </Suspense>
        </div>
      )}
      {opened.has("expenses") && (
        <div hidden={view !== "expenses"}>
          <Suspense fallback={<SectionSkeleton />}>
            <ExpensesSection projectId={projectId} sections={["general", "material"]} />
          </Suspense>
        </div>
      )}
    </div>
  );
}

function BackLink({ place, label }: { place: { projectId: string; section: "materials"; item: null }; label: string }) {
  return (
    <a href={hrefFor(place)} onClick={onPlaceClick(place)} className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900">
      <FiArrowLeft aria-hidden /> {label}
    </a>
  );
}

/* ---------------------------------- top bar ---------------------------------- */

/** Payments to vendors; the project's materials are offered as "For (optional)" */
function PaymentsView({ projectId }: { projectId: string }) {
  const overview = useMaterialsOverview(projectId); // already loaded by the Stock view
  const materials = useMemo(() => (overview.data?.sections ?? []).flatMap((s) => s.materials.map((m) => ({ id: m.id, name: m.name }))), [overview.data]);
  return <VendorPaymentsPanel projectId={projectId} materials={materials} />;
}

function TopBar({ projectId, view, onView }: { projectId: string; view: View; onView: (v: View) => void }) {
  const canAdd = useCan("requirements.create");
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState<"boq" | "hand" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const more = { projectId, section: "materials" as const, item: MORE };

  // The little menu closes on a click anywhere else
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <a
          href={hrefFor(more)}
          onClick={onPlaceClick(more)}
          onPointerEnter={() => void import("./MaterialsSection")}
          title="Orders, requests, reservations and the full log"
          className="flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:border-stone-500"
        >
          <FiMoreHorizontal aria-hidden /> More
        </a>
        {canAdd && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menu}
              onClick={() => setMenu((v) => !v)}
              onPointerEnter={() => void import("./materials/AddMaterialDialog")}
              className="flex min-h-10 items-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800"
            >
              <FiPlus aria-hidden /> Add materials <FiChevronDown aria-hidden className={`transition-transform ${menu ? "rotate-180" : ""}`} />
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 z-20 mt-1 w-60 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                <MenuItem title="Import from BOQ" hint="Pick sections or items of a BOQ" onClick={() => { setMenu(false); setOpen("boq"); }} />
                <MenuItem title="Add by hand" hint="A material and how much is needed" onClick={() => { setMenu(false); setOpen("hand"); }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* The same three buttons as the Labour page */}
      <div role="group" aria-label="Materials" className="grid grid-cols-3 gap-2 sm:gap-3">
        {VIEWS.map(({ key, label, hint, Icon }) => {
          const on = view === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => onView(key)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 sm:flex-row sm:justify-start sm:gap-3 sm:px-4 sm:text-left ${
                on ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:text-stone-900"
              }`}
            >
              <Icon aria-hidden className="shrink-0 text-lg" />
              <span className="min-w-0">
                <span className="block">{label}</span>
                <span className={`hidden truncate text-xs font-normal sm:block ${on ? "text-stone-300" : "text-stone-500"}`}>{hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Suspense fallback={null}>
        {open === "hand" && <AddMaterialDialog projectId={projectId} onClose={() => setOpen(null)} />}
        {open === "boq" && <ImportFromBoqDialog projectId={projectId} open onClose={() => setOpen(null)} onImported={() => setOpen(null)} />}
      </Suspense>
    </div>
  );
}

function MenuItem({ title, hint, onClick }: { title: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="block w-full px-4 py-2.5 text-left hover:bg-stone-50 focus:bg-stone-50 focus:outline-none">
      <span className="block text-sm font-medium text-stone-900">{title}</span>
      <span className="block text-xs text-stone-500">{hint}</span>
    </button>
  );
}

/* ---------------------------------- stock view ---------------------------------- */

function StockView({ projectId }: { projectId: string }) {
  const data = useMaterialsOverview(projectId);
  const [moving, setMoving] = useState<{ material: TabMaterial; mode: MoveMode } | null>(null);

  if (data.isPending) return <SectionSkeleton />;
  if (data.isError) return <SectionError error={data.error} onRetry={() => void data.refetch()} />;
  const o = data.data;
  const count = o.sections.reduce((n, s) => n + s.materials.length, 0);

  return (
    <div className="space-y-5">
      <ChartCard overview={o} />

      {count === 0 ? (
        <EmptyState title="No materials yet" hint="Press Add materials to import them from the BOQ, or add them by hand with how much is needed." />
      ) : (
        <div className="space-y-5">
          {o.sections.map((s) => (
            <section key={s.name} aria-label={s.name}>
              <h3 className="mb-2 px-1 text-sm font-semibold text-stone-900">
                {s.name} <span className="ml-1 text-xs font-normal text-stone-400">{s.materials.length}</span>
              </h3>
              <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
                {s.materials.map((m) => (
                  <MaterialRow key={m.id} projectId={projectId} m={m} onMove={(mode) => setMoving({ material: m, mode })} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {moving && <MoveDialog projectId={projectId} material={moving.material} mode={moving.mode} onClose={() => setMoving(null)} />}
    </div>
  );
}

/** The graph: all materials by value (₹), or tap a material to see its quantity */
const ChartCard = memo(function ChartCard({ overview: o }: { overview: MaterialsOverview }) {
  const [pick, setPick] = useState<string | null>(null);
  const all = o.sections.flatMap((s) => s.materials);
  const chosen = pick ? all.find((m) => m.id === pick) : undefined;
  const series = chosen ? (o.chart.byMaterial[chosen.id] ?? { received: [], issued: [] }) : o.chart.all;
  const unit = chosen?.unit ?? "";
  const first = o.months[0];
  const last = o.months[o.months.length - 1];
  const period = first && last ? `${monthName(first)} – ${monthName(last)}` : "";

  return (
    <section aria-label="Received and issued by month" className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Received vs issued</h2>
          <p className="text-xs text-stone-500">
            {chosen ? `${chosen.name}, in ${unit}` : "All materials, by value (₹)"} · {period}
          </p>
        </div>
        <Legend />
      </div>

      {all.length > 0 && (
        // One row that scrolls sideways: a project can have many materials
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-thin" aria-label="Show">
          {[{ id: null as string | null, label: "All (₹)" }, ...all.map((m) => ({ id: m.id, label: `${m.name} (${m.unit})` }))].map((c) => (
            <button
              key={c.id ?? "all"}
              type="button"
              aria-pressed={pick === c.id}
              onClick={() => setPick(c.id)}
              className={`min-h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors ${
                pick === c.id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 text-stone-600 hover:border-stone-500 hover:text-stone-900"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        <BarChart
          months={o.months}
          series={series}
          format={(n) => (chosen ? `${qty(n)} ${unit}` : rupees(n))}
          axis={(n) => (chosen ? short(n) : `₹${short(n)}`)}
        />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        {chosen ? (
          <>
            <Stat label="Needed" value={`${qty(chosen.needed)} ${unit}`} />
            <Stat label="In stock" value={`${qty(chosen.inStock)} ${unit}`} />
            <Stat label="Issued" value={`${qty(chosen.issued)} ${unit}`} />
          </>
        ) : (
          <>
            <Stat label="Received this month" value={rupeesShort(o.totals.receivedThisMonth)} />
            <Stat label="Issued this month" value={rupeesShort(o.totals.issuedThisMonth)} />
            <Stat label="In stock now" value={rupeesShort(o.totals.stockValue)} />
          </>
        )}
      </dl>
    </section>
  );
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 px-3 py-2">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold tabular-nums text-stone-900">{value}</dd>
    </div>
  );
}

/** One material: what's needed, in stock and issued, a thin bar of how much of the need has been issued, and the actions */
const MaterialRow = memo(function MaterialRow({ projectId, m, onMove }: { projectId: string; m: TabMaterial; onMove: (mode: MoveMode) => void }) {
  const canReceive = useCan("stock.receive");
  const canIssue = useCan("stock.issue");
  const place = { projectId, section: "materials" as const, item: m.id };
  const pct = m.needed > 0 ? Math.min(100, Math.round((m.issued / m.needed) * 100)) : null;
  const btn = "flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-sm font-medium text-stone-700 hover:border-stone-500 hover:text-stone-900";

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <a href={hrefFor(place)} onClick={onPlaceClick(place)} className="group min-w-0 flex-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium text-stone-900 group-hover:underline">{m.name}</span>
          <span className="shrink-0 text-xs text-stone-400">{m.unit}</span>
          {m.low && <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800">Low stock</span>}
        </span>
        <span className="mt-0.5 block text-xs tabular-nums text-stone-500">
          Needed {qty(m.needed)} · In stock <b className="font-semibold text-stone-800">{qty(m.inStock)}</b> · Issued {qty(m.issued)}
          {m.alsoIn.length > 0 && <span className="hidden sm:inline"> · also in {m.alsoIn.join(", ")}</span>}
        </span>
        {pct !== null && (
          <span aria-hidden className="mt-2 block h-1.5 max-w-md overflow-hidden rounded-full bg-stone-100">
            <span className="block h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
          </span>
        )}
      </a>
      <div className="flex shrink-0 items-center gap-2">
        {canReceive && (
          <button type="button" onClick={() => onMove("RECEIVED")} className={btn}>
            <FiArrowDown aria-hidden className="text-emerald-700" /> Received
          </button>
        )}
        {canIssue && (
          <button type="button" onClick={() => onMove("ISSUED")} disabled={m.inStock <= 0} title={m.inStock <= 0 ? "Nothing in the store to issue" : undefined} className={`${btn} disabled:opacity-40`}>
            <FiArrowUp aria-hidden className="text-rose-700" /> Issued
          </button>
        )}
        <a href={hrefFor(place)} onClick={onPlaceClick(place)} aria-label={`View details of ${m.name}`} className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-900 sm:ml-0">
          <FiChevronRight aria-hidden />
        </a>
      </div>
    </li>
  );
});

/* ---------------------------------- helpers ---------------------------------- */

const monthName = (m: string) => {
  const [y, mm] = m.split("-").map(Number);
  return new Date(Date.UTC(y!, mm! - 1, 1)).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
};

/** Axis figures: 12k, 1.5 L */
export const short = (n: number) => (n >= 1e5 ? `${(n / 1e5).toFixed(n >= 1e6 ? 0 : 1)} L` : n >= 1000 ? `${Math.round(n / 100) / 10}k` : qty(n));