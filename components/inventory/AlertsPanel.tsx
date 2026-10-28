"use client";

import React from "react";
import { FiAlertTriangle, FiClock, FiRefreshCw, FiShoppingCart } from "react-icons/fi";
import type { AlertKind } from "@/lib/inventory/types";
import { useRefreshAlerts, useStockAlerts } from "@/hooks/useInventory";

const LOOK: Record<AlertKind, { Icon: typeof FiClock; tone: string }> = {
  ORDER_MORE: { Icon: FiShoppingCart, tone: "text-red-700" },
  LATE_DELIVERY: { Icon: FiClock, tone: "text-red-700" },
  LOW_STOCK: { Icon: FiAlertTriangle, tone: "text-amber-700" },
};

/** The project's open stock alerts. They close by themselves when the cause goes away. */
export function AlertsPanel({ projectId, onOrder }: { projectId: string; onOrder?: (materialId: string) => void }) {
  const alerts = useStockAlerts(projectId);
  const refresh = useRefreshAlerts(projectId);
  const list = alerts.data ?? [];
  if (alerts.isPending || list.length === 0) {
    return (
      <div className="flex items-center justify-end">
        <button type="button" onClick={() => refresh.mutate()} disabled={refresh.isPending} className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900">
          <FiRefreshCw aria-hidden className={refresh.isPending ? "animate-spin" : ""} /> {list.length === 0 && !alerts.isPending ? "No stock alerts · check now" : "Check alerts"}
        </button>
      </div>
    );
  }

  return (
    <section aria-label="Stock alerts" className="rounded border border-red-200 bg-red-50/60">
      <div className="flex items-center justify-between border-b border-red-200 px-4 py-2">
        <h3 className="text-sm font-semibold text-red-900">{list.length} stock {list.length === 1 ? "alert" : "alerts"}</h3>
        <button type="button" onClick={() => refresh.mutate()} disabled={refresh.isPending} aria-label="Check alerts again" className="rounded p-1 text-red-800 hover:bg-red-100">
          <FiRefreshCw aria-hidden className={refresh.isPending ? "animate-spin" : ""} />
        </button>
      </div>
      <ul className="divide-y divide-red-100">
        {list.map((a) => {
          const { Icon, tone } = LOOK[a.kind];
          return (
            <li key={a.id} className="flex items-start gap-2.5 px-4 py-2 text-sm">
              <Icon aria-hidden className={`mt-0.5 shrink-0 ${tone}`} />
              <span className="flex-1 text-stone-800">{a.message}</span>
              {a.kind === "ORDER_MORE" && a.materialId && onOrder && (
                <button type="button" onClick={() => onOrder(a.materialId!)} className="shrink-0 rounded border border-red-300 bg-white px-2 py-0.5 text-xs font-medium text-red-800 hover:bg-red-100">
                  Order
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
