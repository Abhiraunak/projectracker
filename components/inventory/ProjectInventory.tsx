"use client";

import React, { useState } from "react";
import { FiBookOpen, FiDownload, FiRefreshCw, FiX } from "react-icons/fi";
import Link from "next/link";
import { useCan } from "@/hooks/useProjectAccess";
import { useMaterialPlan } from "@/hooks/useInventory";
import type { ImportResult } from "@/lib/inventory/types";
import { QueryError } from "@/components/materials/QueryError";
import { buttonPrimary, buttonSecondary } from "../utilites/Label";
import { AlertsPanel } from "./AlertsPanel";
import { CatalogDialog } from "./CatalogDialog";
import { CostPanel } from "./CostPanel";
import { ImportFromBoqDialog } from "./ImportFromBoqDialog";
import { MaterialPlanList } from "./MaterialPlanList";
import { RequestsPanel } from "./RequestsPanel";
import { MovementLog } from "./MovementLog";
import { OrdersPanel } from "./OrdersPanel";
import { RecipesDialog } from "./RecipesDialog";
import { StockTable } from "./StockTable";
import { SyncDialog } from "./SyncDialog";

export type InventoryTab = "plan" | "stock" | "requests" | "orders" | "cost" | "log";
export const INVENTORY_TABS: InventoryTab[] = ["plan", "stock", "requests", "orders", "cost", "log"];

const TABS: { id: InventoryTab; label: string }[] = [
  { id: "plan", label: "Materials from BOQ" },
  { id: "stock", label: "Stock" },
  { id: "requests", label: "Requests" },
  { id: "orders", label: "Orders" },
  { id: "cost", label: "Cost" },
  { id: "log", label: "Stock log" },
];

/**
 * A project's materials and inventory, all worked out from its BOQs:
 * the plan (what each BOQ item needs), the store (what's there, used, on its way, to order), orders and the log.
 */
export function ProjectInventory({ projectId, initialTab = "plan" }: { projectId: string; initialTab?: InventoryTab }) {
  const [tab, setTab] = useState<InventoryTab>(initialTab);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const plan = useMaterialPlan(projectId);
  const canPlan = useCan("requirements.create");
  const canRecipes = useCan("catalog.manage");

  if (plan.isPending) return <div aria-busy="true" className="h-64 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />;
  if (plan.isError) return <QueryError error={plan.error} onRetry={() => plan.refetch()} />;

  const { boqs, sync } = plan.data;
  const catalogButton = (
    <button type="button" onClick={() => setCatalogOpen(true)} className={buttonSecondary}>
      Materials &amp; vendors
    </button>
  );
  // A sync only updates items already imported; new BOQ items are added by ticking them in Import from BOQ
  const pending = sync.changed + sync.removed;
  const importButton = canPlan && (
    <button type="button" onClick={() => setImporting(true)} className={plan.data.items.length === 0 || sync.notImported > 0 ? buttonPrimary : buttonSecondary}>
      <FiDownload aria-hidden /> Import from BOQ
    </button>
  );
  const imported = (r: ImportResult["imported"], boqTitle: string) => {
    const n = r.added + r.restored;
    setTab("plan");
    setNotice(
      n === 0
        ? `Nothing new was added from "${boqTitle}": the ticked items were already in inventory.`
        : `Added ${n} ${n === 1 ? "item" : "items"} from "${boqTitle}"${r.restored ? ` (${r.restored} brought back)` : ""}${r.linked ? ", and linked the BOQ to this project" : ""}. Check their materials under "To check".`
    );
  };

  return (
    <div className="space-y-5">
      {/* Which BOQs feed this project, and whether they changed since the last sync */}
      {boqs.length === 0 ? (
        <div className="rounded border border-dashed border-stone-300 px-6 py-10 text-center">
          <p className="font-semibold">No BOQ is linked to this project yet</p>
          <p className="mt-1 text-sm text-stone-500">
            Press <span className="font-medium">Import from BOQ</span>, choose the project&rsquo;s BOQ, and tick the sections or items to track here.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {importButton}
            <Link href="/dashboard/boq" className={`${buttonSecondary} inline-flex`}>
              <FiBookOpen aria-hidden /> Go to BOQs
            </Link>
            {catalogButton}
          </div>
        </div>
      ) : (
        <div className={`flex flex-col gap-3 rounded border p-4 sm:flex-row sm:items-center sm:justify-between ${pending ? "border-amber-200 bg-amber-50" : "border-stone-300"}`}>
          <div className="min-w-0 text-sm">
            <p className="font-medium">
              From {boqs.length === 1 ? "BOQ" : `${boqs.length} BOQs`}:{" "}
              {boqs.map((b, i) => (
                <span key={b.id}>
                  {i > 0 && ", "}
                  <Link href={`/dashboard/boq/${b.id}`} className="underline-offset-2 hover:underline">
                    {b.title || "Untitled BOQ"}
                  </Link>
                </span>
              ))}
            </p>
            <p className={`mt-0.5 ${pending ? "text-amber-900" : "text-stone-500"}`} aria-live="polite">
              {pending
                ? `The BOQ has changed: ${[sync.changed && `${sync.changed} changed`, sync.removed && `${sync.removed} removed`].filter(Boolean).join(", ")}. Sync to bring the changes in.`
                : "Inventory items match the BOQ."}
              {sync.notImported > 0 && ` ${sync.notImported} BOQ ${sync.notImported === 1 ? "item is" : "items are"} not in inventory.`}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {catalogButton}
            {canRecipes && (
              <button type="button" onClick={() => setRecipesOpen(true)} className={buttonSecondary}>
                Recipes
              </button>
            )}
            {importButton}
            {canPlan && (
              <button type="button" onClick={() => setSyncing(true)} disabled={!pending} className={pending ? buttonPrimary : buttonSecondary}>
                <FiRefreshCw aria-hidden /> Sync from BOQ
              </button>
            )}
          </div>
        </div>
      )}

      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0 rounded p-1 hover:bg-green-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700">
            <FiX aria-hidden />
          </button>
        </div>
      )}

      <AlertsPanel projectId={projectId} onOrder={() => setTab("orders")} />

      <div role="tablist" aria-label="Inventory" className="flex gap-1 overflow-x-auto border-b border-stone-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              tab === t.id ? "border-amber-500 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            {t.label}
            {t.id === "plan" && plan.data.summary.toReview > 0 && (
              <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">{plan.data.summary.toReview}</span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "plan" && <MaterialPlanList projectId={projectId} plan={plan.data} />}
        {tab === "stock" && <StockTable projectId={projectId} items={plan.data.items} />}
        {tab === "requests" && <RequestsPanel projectId={projectId} items={plan.data.items} />}
        {tab === "orders" && <OrdersPanel projectId={projectId} />}
        {tab === "cost" && <CostPanel projectId={projectId} onEditRates={canRecipes ? () => setCatalogOpen(true) : undefined} />}
        {tab === "log" && <MovementLog projectId={projectId} />}
      </div>

      <SyncDialog projectId={projectId} open={syncing} onClose={() => setSyncing(false)} />
      <ImportFromBoqDialog projectId={projectId} open={importing} onClose={() => setImporting(false)} onImported={imported} />
      <RecipesDialog open={recipesOpen} onClose={() => setRecipesOpen(false)} />
      <CatalogDialog open={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </div>
  );
}
