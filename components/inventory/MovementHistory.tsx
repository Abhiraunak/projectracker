"use client";

import React, { useEffect, useState } from "react";
import { formatDateTime, formatQty } from "@/lib/materials/format";
import { MOVEMENT_RULES } from "@/lib/materials/stock";
import type { Material, MovementType, StockMovement } from "@/lib/materials/types";
import { Pagination } from "@/components/labour/Pagination";
import { useMovements } from "@/hooks/useInventory";
import { Pill, type Tone } from "@/components/materials/Pill";
import { QueryError } from "@/components/materials/QueryError";
import { inputBase } from "../drawing/styles";


const PAGE_SIZE = 8;

const TONE: Record<MovementType, Tone> = {
  RECEIVED: "good",
  ISSUED: "dark",
  RESERVED: "info",
  RELEASED: "neutral",
  ADJUSTMENT_IN: "warn",
  ADJUSTMENT_OUT: "warn",
};

function signedQty(m: StockMovement) {
  const { direction } = MOVEMENT_RULES[m.type];
  const sign = direction === "in" ? "+" : direction === "out" ? "-" : "";
  return `${sign}${formatQty(m.quantity, m.material.unit)}`;
}

interface Props {
  projectId: string;
  materials: Material[];
  materialId: string; // "" = all materials
  onMaterialChange: (materialId: string) => void;
}

/** The stock log, newest first, for one material or all of them */
export function MovementHistory({ projectId, materials, materialId, onMaterialChange }: Props) {
  const [page, setPage] = useState(1);
  const movements = useMovements(projectId, { materialId: materialId || undefined, page, pageSize: PAGE_SIZE });

  useEffect(() => setPage(1), [materialId]); // a different material starts on page 1

  return (
    <section id="stock-history" aria-label="Stock movements" className="space-y-3 scroll-mt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold">Stock movements</h2>
        <select aria-label="Show movements for" value={materialId} onChange={(e) => onMaterialChange(e.target.value)} className={`${inputBase} sm:w-64`}>
          <option value="">All materials</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {movements.isPending && <div aria-busy="true" className="h-40 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />}
      {movements.isError && <QueryError error={movements.error} onRetry={() => movements.refetch()} />}

      {movements.data && movements.data.total === 0 && (
        <div className="rounded border border-dashed border-stone-300 px-6 py-10 text-center text-sm text-stone-500">No stock movements recorded yet.</div>
      )}

      {movements.data && movements.data.total > 0 && (
        <div className="rounded border border-stone-300">
          <ul className={`divide-y divide-stone-200 transition-opacity ${movements.isPlaceholderData ? "opacity-60" : ""}`}>
            {movements.data.items.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Pill tone={TONE[m.type]}>{MOVEMENT_RULES[m.type].label}</Pill>
                    <span className="truncate text-sm font-medium">{m.material.name}</span>
                  </p>
                  <p className="text-xs text-stone-500">
                    {[m.task?.name, m.note].filter(Boolean).join(": ") || "No note"}
                  </p>
                  <p className="text-xs text-stone-500">{formatDateTime(m.createdAt)} by {m.createdBy}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">{signedQty(m)}</p>
              </li>
            ))}
          </ul>
          <Pagination page={movements.data.page} totalPages={movements.data.totalPages} total={movements.data.total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}
    </section>
  );
}
