"use client";

import React from "react";
import { FiTrash2 } from "react-icons/fi";
import { formatQty } from "@/lib/materials/format";
import { isOverdue, pendingQty, procurementStatus, totalRequired } from "@/lib/materials/procurement";
import type { Requirement } from "@/lib/materials/types";
import { buttonSecondary, iconButton } from "@/components/materials/styles";
import { DeliveryCell } from "./DeliveryCell";
import { ProcurementStatusPill } from "./ProcurementStatusPill";
import { VendorCell } from "./VendorCell";

interface Props {
  requirement: Requirement;
  today: Date;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** One requirement on a phone: everything that matters, stacked */
export function RequirementCard({ requirement: r, today, onEdit, onDelete }: Props) {
  const unit = r.material.unit;
  return (
    <article className="rounded border border-stone-300 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{r.material.name}</h3>
          <p className="truncate text-sm text-stone-500">{r.task.name}</p>
        </div>
        <ProcurementStatusPill status={procurementStatus(r)} overdue={isOverdue(r, today)} />
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <Figure label={`Required (+${r.wastagePercent}% wastage)`} value={formatQty(totalRequired(r), unit)} />
        <Figure label="Ordered" value={formatQty(r.orderedQty, unit)} />
        <Figure label="Received" value={formatQty(r.receivedQty, unit)} />
        <Figure label="Pending" value={formatQty(pendingQty(r), unit)} />
      </dl>

      <div className="mt-4 grid gap-3 border-t border-stone-200 pt-3 text-sm sm:grid-cols-2">
        <VendorCell vendor={r.vendor} />
        <DeliveryCell requirement={r} today={today} />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={() => onEdit(r.id)} className={`${buttonSecondary} flex-1`}>
          Update order
        </button>
        <button type="button" onClick={() => onDelete(r.id)} aria-label={`Delete requirement for ${r.material.name}`} className={`${iconButton} hover:bg-red-50 hover:text-red-600`}>
          <FiTrash2 aria-hidden className="h-5 w-5" />
        </button>
      </div>
    </article>
  );
}
