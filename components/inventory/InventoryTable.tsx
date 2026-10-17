"use client";

import React from "react";
import { formatQty } from "@/lib/materials/format";
import { stockStatus } from "@/lib/materials/stock";
import type { InventoryItem } from "@/lib/materials/types";
import { StockStatusPill } from "./StockStatusPill";

interface Props {
  items: InventoryItem[];
  onRecord: (materialId: string) => void;
  onHistory: (materialId: string) => void;
}

const HEAD = "px-4 py-3 font-medium";
const NUM = "px-4 py-3 tabular-nums";
const LINK = "rounded px-1 text-sm font-medium text-stone-700 underline-offset-2 hover:text-stone-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900";

/** Stock levels on larger screens. The less important columns appear from large screens up. */
export function InventoryTable({ items, onRecord, onHistory }: Props) {
  return (
    <div className="overflow-x-auto rounded border border-stone-300">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 text-stone-500">
          <tr>
            <th scope="col" className={HEAD}>Material</th>
            <th scope="col" className={HEAD}>On hand</th>
            <th scope="col" className={HEAD}>Reserved</th>
            <th scope="col" className={HEAD}>Available</th>
            <th scope="col" className={`${HEAD} hidden lg:table-cell`}>Consumed</th>
            <th scope="col" className={`${HEAD} hidden lg:table-cell`}>Still needed</th>
            <th scope="col" className={`${HEAD} hidden lg:table-cell`}>Incoming</th>
            <th scope="col" className={HEAD}>Shortage</th>
            <th scope="col" className={HEAD}>Status</th>
            <th scope="col" className={`${HEAD} text-right`}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          {items.map((item) => {
            const unit = item.material.unit;
            return (
              <tr key={item.material.id} className="hover:bg-stone-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{item.material.name}</p>
                  <p className="text-xs text-stone-500">{item.material.category}</p>
                </td>
                <td className={`${NUM} font-medium`}>{formatQty(item.onHand, unit)}</td>
                <td className={NUM}>{formatQty(item.reserved, unit)}</td>
                <td className={NUM}>{formatQty(item.available, unit)}</td>
                <td className={`${NUM} hidden lg:table-cell`}>{formatQty(item.consumed, unit)}</td>
                <td className={`${NUM} hidden lg:table-cell`}>{formatQty(item.stillNeeded, unit)}</td>
                <td className={`${NUM} hidden lg:table-cell`}>{formatQty(item.incoming, unit)}</td>
                <td className={`${NUM} ${item.shortage > 0 ? "font-semibold text-red-700" : "text-stone-400"}`}>
                  {item.shortage > 0 ? formatQty(item.shortage, unit) : "None"}
                </td>
                <td className="px-4 py-3"><StockStatusPill status={stockStatus(item)} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button type="button" onClick={() => onRecord(item.material.id)} className={LINK}>Record</button>
                  <button type="button" onClick={() => onHistory(item.material.id)} className={`${LINK} ml-2`}>History</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
