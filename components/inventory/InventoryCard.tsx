"use client";

import React from "react";
import { formatQty } from "@/lib/materials/format";
import { stockStatus } from "@/lib/materials/stock";
import type { InventoryItem } from "@/lib/materials/types";
import { StockStatusPill } from "./StockStatusPill";
import { buttonPrimary, buttonSecondary } from "../drawing/styles";

interface Props {
  item: InventoryItem;
  onRecord: (materialId: string) => void;
  onHistory: (materialId: string) => void;
}

function Figure({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className={`text-sm tabular-nums ${strong ? "font-semibold" : "font-medium"}`}>{value}</dd>
    </div>
  );
}

/** One material on a phone */
export function InventoryCard({ item, onRecord, onHistory }: Props) {
  const unit = item.material.unit;
  return (
    <article className="rounded border border-stone-300 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{item.material.name}</h3>
          <p className="text-sm text-stone-500">{item.material.category}</p>
        </div>
        <StockStatusPill status={stockStatus(item)} />
      </div>

      <dl className="grid grid-cols-3 gap-3">
        <Figure label="On hand" value={formatQty(item.onHand, unit)} strong />
        <Figure label="Reserved" value={formatQty(item.reserved, unit)} />
        <Figure label="Available" value={formatQty(item.available, unit)} />
        <Figure label="Consumed" value={formatQty(item.consumed, unit)} />
        <Figure label="Still needed" value={formatQty(item.stillNeeded, unit)} />
        <Figure label="Incoming" value={formatQty(item.incoming, unit)} />
      </dl>

      {item.shortage > 0 && (
        <p className="mt-3 rounded bg-red-50 p-2 text-sm font-medium text-red-700">Short by {formatQty(item.shortage, unit)}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => onRecord(item.material.id)} className={`${buttonPrimary} flex-1`}>
          Record stock
        </button>
        <button type="button" onClick={() => onHistory(item.material.id)} className={`${buttonSecondary} flex-1`}>
          History
        </button>
      </div>
    </article>
  );
}
