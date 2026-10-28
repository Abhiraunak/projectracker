"use client";

import React from "react";
import { describeError } from "@/lib/api";
import { fmtQty } from "@/lib/inventory/figures";
import { useApplySync, useSyncPreview } from "@/hooks/useInventory";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { buttonPrimary, buttonSecondary } from "../utilites/Label";


const FIELD_WORDS: Record<string, string> = { quantity: "quantity", unit: "unit", code: "number", title: "description", restored: "back in the BOQ" };

/** Shows what changed in the BOQs before anything is applied. Stock already received or issued is never changed. */
export function SyncDialog({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  return (
    <ModalDialog open={open} onClose={onClose} label="Sync materials from the BOQ" size="lg">
      {open && <Body projectId={projectId} onClose={onClose} />}
    </ModalDialog>
  );
}

function Body({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const preview = useSyncPreview(projectId, true);
  const apply = useApplySync(projectId);
  const p = preview.data;

  const run = async () => {
    try {
      await apply.mutateAsync();
      onClose();
    } catch {
      /* shown below */
    }
  };

  return (
    <div>
      <DialogHeader title="Sync from BOQ" subtitle="Review what changed, then apply it" onClose={onClose} locked={apply.isPending} />
      <div className="max-h-[60dvh] space-y-5 overflow-y-auto p-4 sm:p-5">
        {preview.isPending && <div aria-busy="true" className="h-40 animate-pulse rounded bg-stone-200/60" />}
        {preview.isError && <p role="alert" className="text-sm text-red-700">{describeError(preview.error)}</p>}
        {p && p.changed + p.removed === 0 && <p className="text-sm text-stone-600">Nothing to bring in: the inventory items already match the BOQ.</p>}
        {p && p.notImported > 0 && (
          <p className="text-sm text-stone-600">
            {p.notImported} BOQ {p.notImported === 1 ? "item is" : "items are"} not in inventory. A sync doesn&rsquo;t add them: use <span className="font-medium">Import from BOQ</span> and tick the ones to track.
          </p>
        )}

        {p && p.changedItems.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">{p.changed} changed</h3>
            <ul className="divide-y divide-stone-200 rounded border border-stone-200 text-sm">
              {p.changedItems.map((c) => (
                <li key={c.id} className="px-3 py-2">
                  <span className="mr-1.5 font-semibold">{c.code}</span>
                  {c.title}
                  <span className="block text-xs text-stone-500">
                    {c.fields.map((f) => FIELD_WORDS[f] ?? f).join(", ")}
                    {c.fields.includes("quantity") && `: ${fmtQty(c.from.quantity)} → ${fmtQty(c.to.quantity)} ${c.to.unit}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {p && p.removedItems.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">{p.removed} no longer in the BOQ</h3>
            <ul className="divide-y divide-stone-200 rounded border border-stone-200 text-sm">
              {p.removedItems.map((r) => (
                <li key={r.id} className="px-3 py-2">
                  <span className="mr-1.5 font-semibold">{r.code}</span>
                  {r.title}
                  {r.hasStock && <span className="block text-xs text-stone-500">Stock was issued to it: that history stays.</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-xs text-stone-500">
          Only items already in inventory are updated. Removed items are kept with their history but no longer count. Stock received and issued is never changed.
        </p>
        {apply.isError && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{describeError(apply.error)}</p>}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-stone-200 p-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} disabled={apply.isPending} className={buttonSecondary}>
          Cancel
        </button>
        <button type="button" onClick={run} disabled={!p || apply.isPending || p.changed + p.removed === 0} className={buttonPrimary}>
          {apply.isPending ? "Applying…" : "Apply changes"}
        </button>
      </div>
    </div>
  );
}
