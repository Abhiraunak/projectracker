"use client";

import React, { useState } from "react";
import { formatDateTime } from "@/lib/materials/format";
import { fmtQty, itemLabel } from "@/lib/inventory/figures";
import { MOVEMENT_LABEL, MOVEMENT_SIGN } from "@/lib/inventory/types";
import { useMovements } from "@/hooks/useInventory";
import { Pagination } from "@/components/labour/Pagination";
import { QueryError } from "@/components/materials/QueryError";

const PAGE_SIZE = 12;

/** Every stock entry, newest first. Entries are never edited: a mistake is fixed with a correction. */
export function MovementLog({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(1);
  const log = useMovements(projectId, { page, pageSize: PAGE_SIZE });

  if (log.isPending) return <div aria-busy="true" className="h-64 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />;
  if (log.isError) return <QueryError error={log.error} onRetry={() => log.refetch()} />;
  if (log.data.total === 0) return <p className="rounded border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">No stock entries yet.</p>;

  return (
    <div className="rounded border border-stone-300">
      <ul className={`divide-y divide-stone-200 ${log.isPlaceholderData ? "opacity-60" : ""}`}>
        {log.data.items.map((m) => {
          const sign = MOVEMENT_SIGN[m.type];
          return (
            <li key={m.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p>
                  <span className="font-semibold">{MOVEMENT_LABEL[m.type]}</span> {m.material.name}
                  {m.boqItem && <span className="text-stone-600"> · {itemLabel(m.boqItem)}</span>}
                  {m.order && <span className="text-stone-600"> · order {m.order.reference || "(no reference)"}</span>}
                </p>
                <p className="text-xs text-stone-500">
                  {formatDateTime(m.createdAt)} · {m.createdBy}
                  {m.note && ` · ${m.note}`}
                </p>
              </div>
              <span className={`shrink-0 font-semibold tabular-nums ${sign > 0 ? "text-green-700" : sign < 0 ? "text-red-700" : "text-stone-600"}`}>
                {sign > 0 ? "+" : sign < 0 ? "−" : ""}
                {fmtQty(m.quantity)} {m.material.unit}
              </span>
            </li>
          );
        })}
      </ul>
      <Pagination page={log.data.page} totalPages={log.data.totalPages} total={log.data.total} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  );
}
