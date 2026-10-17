"use client";

import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { formatQty } from "@/lib/materials/format";
import { isOverdue, pendingQty, procurementStatus, totalRequired } from "@/lib/materials/procurement";
import type { Requirement } from "@/lib/materials/types";
import { iconButton } from "@/components/materials/styles";
import { DeliveryCell } from "./DeliveryCell";
import { ProcurementStatusPill } from "./ProcurementStatusPill";
import { VendorCell } from "./VendorCell";

interface Props {
  items: Requirement[];
  today: Date;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const HEAD = "px-4 py-3 font-medium";
const NUM = "px-4 py-3 tabular-nums";

/** The requirements list on larger screens */
export function RequirementsTable({ items, today, onEdit, onDelete }: Props) {
  return (
    <div className="overflow-x-auto rounded border border-stone-300">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 text-stone-500">
          <tr>
            <th scope="col" className={HEAD}>Material and work item</th>
            <th scope="col" className={HEAD}>Required</th>
            <th scope="col" className={HEAD}>Ordered</th>
            <th scope="col" className={HEAD}>Received</th>
            <th scope="col" className={HEAD}>Pending</th>
            <th scope="col" className={HEAD}>Vendor</th>
            <th scope="col" className={HEAD}>Expected</th>
            <th scope="col" className={HEAD}>Status</th>
            <th scope="col" className={`${HEAD} text-right`}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          {items.map((r) => {
            const unit = r.material.unit;
            return (
              <tr key={r.id} className="align-top hover:bg-stone-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{r.material.name}</p>
                  <p className="text-xs text-stone-500">{r.task.name}</p>
                </td>
                <td className={NUM}>
                  {formatQty(totalRequired(r), unit)}
                  <p className="text-xs text-stone-500">incl. {r.wastagePercent}% wastage</p>
                </td>
                <td className={NUM}>{formatQty(r.orderedQty, unit)}</td>
                <td className={NUM}>{formatQty(r.receivedQty, unit)}</td>
                <td className={`${NUM} font-medium`}>{formatQty(pendingQty(r), unit)}</td>
                <td className="px-4 py-3"><VendorCell vendor={r.vendor} /></td>
                <td className="px-4 py-3"><DeliveryCell requirement={r} today={today} /></td>
                <td className="px-4 py-3"><ProcurementStatusPill status={procurementStatus(r)} overdue={isOverdue(r, today)} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button type="button" onClick={() => onEdit(r.id)} aria-label={`Update order for ${r.material.name}, ${r.task.name}`} className={iconButton}>
                    <FiEdit2 aria-hidden />
                  </button>
                  <button type="button" onClick={() => onDelete(r.id)} aria-label={`Delete requirement for ${r.material.name}, ${r.task.name}`} className={`${iconButton} hover:bg-red-50 hover:text-red-600`}>
                    <FiTrash2 aria-hidden />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
