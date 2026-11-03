"use client";

import type { KeyboardEvent } from "react";
import { FiTrash2 } from "react-icons/fi";
import { inputBase, removeBtn } from "@/components/utilites/fieldStyles";
import { MoneyInput } from "@/components/utilites/MoneyInput";
import type { WorkerRow } from "@/lib/attendance/form";

/** One day: a row per labourer, with their label and what they were paid */
export function WorkerRows({
  workers,
  onLabel,
  onAmount,
  onRemove,
  onNavigate,
}: {
  workers: WorkerRow[];
  onLabel: (id: string, label: string) => void;
  onAmount: (id: string, amount: number | "") => void;
  onRemove: (id: string) => void;
  onNavigate: (e: KeyboardEvent, index: number, field: string) => void;
}) {
  return (
    <div className="space-y-3">
      {workers.map((w, index) => (
        <div key={w.id} className="flex items-center gap-3">
          <input
            id={`worker-${index}-label`}
            type="text"
            maxLength={40}
            aria-label={`Labourer ${index + 1} label`}
            value={w.label}
            onKeyDown={(e) => onNavigate(e, index, "label")}
            onChange={(e) => onLabel(w.id, e.target.value)}
            placeholder="Label (e.g. L1)"
            className={`${inputBase} min-w-0 flex-1`}
          />
          <MoneyInput
            id={`worker-${index}-amount`}
            aria-label={`Labourer ${index + 1} amount`}
            value={w.amount}
            onKeyDown={(e) => onNavigate(e, index, "amount")}
            onChange={(v) => onAmount(w.id, v)}
            wrapperClassName="w-36 shrink-0 sm:w-44"
          />
          <button type="button" onClick={() => onRemove(w.id)} disabled={workers.length === 1} aria-label={`Remove labourer ${index + 1}`} className={`shrink-0 p-2 ${removeBtn}`}>
            <FiTrash2 aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
