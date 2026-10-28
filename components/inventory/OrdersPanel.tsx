"use client";

import React, { useState } from "react";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { describeError } from "@/lib/api";
import { fmtQty } from "@/lib/inventory/figures";
import type { MaterialOrder } from "@/lib/inventory/types";
import { formatDay, todayLocal, toIsoDay } from "@/lib/materials/format";
import { useCan } from "@/hooks/useProjectAccess";
import { useDeleteOrder, useInventory, useOrders } from "@/hooks/useInventory";
import { Pill } from "@/components/materials/Pill";
import { QueryError } from "@/components/materials/QueryError";
import { buttonPrimary, iconButton } from "../utilites/Label";
import { OrderDialog } from "./OrderDialog";

function OrderStatus({ order }: { order: MaterialOrder }) {
  if (order.pendingQty === 0) return <Pill tone="good">Delivered</Pill>;
  if (order.expectedDelivery && order.expectedDelivery < toIsoDay(todayLocal())) return <Pill tone="bad">Late</Pill>;
  if (order.receivedQty > 0) return <Pill tone="info">Part delivered</Pill>;
  return <Pill tone="neutral">On order</Pill>;
}

/** The project's purchase orders: open ones first. Deliveries are recorded with Receive on the Stock tab. */
export function OrdersPanel({ projectId }: { projectId: string }) {
  const orders = useOrders(projectId);
  const stock = useInventory(projectId);
  const remove = useDeleteOrder(projectId);
  const canOrder = useCan("requirements.order");
  const canDelete = useCan("requirements.delete");
  const [editing, setEditing] = useState<{ order: MaterialOrder | null; materialId?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (orders.isPending) return <div aria-busy="true" className="h-64 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />;
  if (orders.isError) return <QueryError error={orders.error} onRetry={() => orders.refetch()} />;

  const toOrder = (stock.data ?? []).filter((i) => i.toOrder > 0);
  const del = async (o: MaterialOrder) => {
    setError(null);
    try {
      await remove.mutateAsync(o.id);
    } catch (err) {
      setError(describeError(err));
    }
  };

  return (
    <div className="space-y-4">
      {canOrder && toOrder.length > 0 && (
        <section aria-label="To order" className="rounded border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">The BOQ still needs more than is in the store or on order</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {toOrder.map((i) => (
              <li key={i.material.id}>
                <button type="button" onClick={() => setEditing({ order: null, materialId: i.material.id })} className="rounded border border-red-300 bg-white px-2.5 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100">
                  Order {fmtQty(i.toOrder)} {i.material.unit} {i.material.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canOrder && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setEditing({ order: null })} className={buttonPrimary}>
            <FiPlus aria-hidden /> New order
          </button>
        </div>
      )}
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {orders.data.length === 0 ? (
        <p className="rounded border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">No orders yet.</p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded border border-stone-300">
          {orders.data.map((o) => (
            <li key={o.id} className="flex flex-col gap-2 px-4 py-3 text-sm md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {o.material.name} <span className="font-normal text-stone-500">· {o.reference || "no PO number"}</span>
                </p>
                <p className="text-xs text-stone-500">
                  {o.vendor?.name ?? "Vendor not chosen"}
                  {o.expectedDelivery && ` · expected ${formatDay(o.expectedDelivery)}`}
                  {o.note && ` · ${o.note}`}
                </p>
              </div>
              <div className="tabular-nums md:w-60 md:text-right">
                <p>{fmtQty(o.receivedQty)} of {fmtQty(o.quantity)} {o.material.unit} received</p>
                <p className="text-xs text-stone-500">
                  {o.rate > 0 ? `₹${o.rate.toLocaleString("en-IN")} / ${o.material.unit} · ₹${o.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "No rate entered"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <OrderStatus order={o} />
                {canOrder && (
                  <button type="button" onClick={() => setEditing({ order: o })} aria-label={`Edit order for ${o.material.name}`} className={iconButton}>
                    <FiEdit2 aria-hidden />
                  </button>
                )}
                {canDelete && o.receivedQty === 0 && (
                  <button type="button" onClick={() => del(o)} disabled={remove.isPending} aria-label={`Delete order for ${o.material.name}`} className={`${iconButton} hover:bg-red-50 hover:text-red-600`}>
                    <FiTrash2 aria-hidden />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <OrderDialog projectId={projectId} open={!!editing} order={editing?.order ?? null} presetMaterialId={editing?.materialId} stock={stock.data ?? []} onClose={() => setEditing(null)} />
    </div>
  );
}
