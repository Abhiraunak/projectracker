"use client";

import React, { useState } from "react";
import { FiPlus } from "react-icons/fi";
import { useAuth } from "@/hooks/useAuth";
import { useAccess, useCan } from "@/hooks/useProjectAccess";
import { useInventory, useMaterialRequests } from "@/hooks/useInventory";
import { fmtQty, itemLabel } from "@/lib/inventory/figures";
import { actionsFor, type RequestAction } from "@/lib/inventory/requests";
import type { BoqItem, MaterialRequest, RequestStatus } from "@/lib/inventory/types";
import { formatDateTime, formatDay } from "@/lib/materials/format";
import { Pill, type Tone } from "@/components/materials/Pill";
import { QueryError } from "@/components/materials/QueryError";
import { buttonPrimary } from "../utilites/Label";
import { RequestActionDialog, type DialogAction } from "./RequestActionDialog";
import { RequestDialog } from "./RequestDialog";

const STATUS: Record<RequestStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Waiting for approval", tone: "warn" },
  APPROVED: { label: "Approved", tone: "info" },
  ISSUED: { label: "Issued", tone: "good" },
  ORDERED: { label: "Ordered", tone: "good" },
  REJECTED: { label: "Rejected", tone: "bad" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

const BUTTON: Record<RequestAction, string> = { approve: "Approve", reject: "Reject", cancel: "Cancel", issue: "Issue", order: "Order" };

/** Requests for material from site: raise one, and approve, issue or order the ones waiting */
export function RequestsPanel({ projectId, items }: { projectId: string; items: BoqItem[] }) {
  const [show, setShow] = useState<"open" | "all">("open");
  const requests = useMaterialRequests(projectId, show);
  const stock = useInventory(projectId);
  const access = useAccess();
  const canRequest = useCan("requests.create");
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [acting, setActing] = useState<{ request: MaterialRequest; action: DialogAction } | null>(null);

  if (requests.isPending) return <div aria-busy="true" className="h-64 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />;
  if (requests.isError) return <QueryError error={requests.error} onRetry={() => requests.refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div role="radiogroup" aria-label="Show" className="inline-flex rounded border border-stone-300 p-0.5">
          {(["open", "all"] as const).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={show === v} onClick={() => setShow(v)}
              className={`rounded px-3 py-1.5 text-sm font-medium ${show === v ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
              {v === "open" ? "Open" : "All"}
            </button>
          ))}
        </div>
        {canRequest && (
          <button type="button" onClick={() => setCreating(true)} className={buttonPrimary}>
            <FiPlus aria-hidden /> Request material
          </button>
        )}
      </div>

      {requests.data.length === 0 ? (
        <p className="rounded border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
          {show === "open" ? "No open requests." : "No requests yet."}
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded border border-stone-300">
          {requests.data.map((r) => {
            const actions = actionsFor(r.status, { isRequester: !!user?.email && user.email === r.requestedBy.email, can: (p) => access.can(p as never) });
            return (
              <li key={r.id} className="flex flex-col gap-2 px-4 py-3 text-sm md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <p>
                    <span className="font-semibold tabular-nums">{fmtQty(r.quantity)} {r.material.unit}</span> {r.material.name}
                    {r.boqItem && <span className="text-stone-600"> · {itemLabel(r.boqItem)}</span>}
                  </p>
                  <p className="text-xs text-stone-500">
                    {r.requestedBy.email} · {formatDateTime(r.createdAt)}
                    {r.neededBy && ` · needed by ${formatDay(r.neededBy)}`}
                    {r.note && ` · “${r.note}”`}
                  </p>
                  {(r.decidedBy || r.order) && (
                    <p className="text-xs text-stone-500">
                      {r.decidedBy && `${STATUS[r.status].label} by ${r.decidedBy}`}
                      {r.decisionNote && `: ${r.decisionNote}`}
                      {r.order && ` · order ${r.order.reference || "placed"}`}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>
                  {actions.map((a) => (
                    <button key={a} type="button" onClick={() => setActing({ request: r, action: a })}
                      className={`rounded border px-2.5 py-1 text-xs font-medium ${a === "reject" || a === "cancel" ? "border-stone-300 text-red-700 hover:bg-red-50" : "border-stone-300 text-stone-800 hover:bg-stone-100"}`}>
                      {BUTTON[a]}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <RequestDialog projectId={projectId} open={creating} items={items} stock={stock.data ?? []} onClose={() => setCreating(false)} />
      <RequestActionDialog projectId={projectId} request={acting?.request ?? null} action={acting?.action ?? null} stock={stock.data ?? []} onClose={() => setActing(null)} />
    </div>
  );
}
