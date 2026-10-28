"use client";

import React from "react";
import Link from "next/link";
import { FiCopy, FiEdit2, FiLock, FiTrash2 } from "react-icons/fi";
import { fmtDateTime, fmtMoney } from "@/lib/boq/format";
import type { BoqSummary } from "@/lib/boq/types";
import { Pill } from "@/components/materials/Pill";

interface Props {
  items: BoqSummary[];
  onDuplicate: (boq: BoqSummary) => void;
  onDelete: (boq: BoqSummary) => void;
  busyId: string | null;
}

const ICON_BTN =
  "rounded p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-40";

const href = (boq: BoqSummary) => `/dashboard/boq/${boq.id}`;
const titleOf = (boq: BoqSummary) => boq.title || "Untitled BOQ";

function StatusPill({ boq }: { boq: BoqSummary }) {
  return boq.status === "FINAL" ? <Pill tone="dark" icon={FiLock}>Final</Pill> : <Pill tone="neutral">Draft</Pill>;
}

function Actions({ boq, onDuplicate, onDelete, busy }: { boq: BoqSummary; onDuplicate: Props["onDuplicate"]; onDelete: Props["onDelete"]; busy: boolean }) {
  return (
    <div className="flex justify-end gap-0.5">
      <Link href={href(boq)} aria-label={`Open ${titleOf(boq)}`} title="Open" className={ICON_BTN}>
        <FiEdit2 aria-hidden />
      </Link>
      <button type="button" onClick={() => onDuplicate(boq)} disabled={busy} aria-label={`Duplicate ${titleOf(boq)}`} title="Duplicate as a new draft" className={ICON_BTN}>
        <FiCopy aria-hidden />
      </button>
      <button type="button" onClick={() => onDelete(boq)} aria-label={`Delete ${titleOf(boq)}`} title="Delete" className={`${ICON_BTN} hover:bg-red-50 hover:text-red-600`}>
        <FiTrash2 aria-hidden />
      </button>
    </div>
  );
}

/** The BOQs: cards on a phone, a table on wider screens. The title opens the BOQ. */
export function BoqList({ items, onDuplicate, onDelete, busyId }: Props) {
  return (
    <>
      <ul className="divide-y divide-stone-200 md:hidden">
        {items.map((boq) => (
          <li key={boq.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={href(boq)} className="block truncate font-semibold hover:underline">
                  {titleOf(boq)}
                </Link>
                {boq.subtitle && <p className="truncate text-sm text-stone-500">{boq.subtitle}</p>}
              </div>
              <StatusPill boq={boq} />
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="text-sm">
                <p className="font-semibold tabular-nums">₹{fmtMoney(boq.grandTotal)}</p>
                <p className="text-xs text-stone-500">
                  {boq.itemCount} items{boq.boqNumber && ` · ${boq.boqNumber}`}{boq.project && ` · ${boq.project.title}`} · {fmtDateTime(boq.updatedAt)}
                </p>
              </div>
              <Actions boq={boq} onDuplicate={onDuplicate} onDelete={onDelete} busy={busyId === boq.id} />
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
              <th scope="col" className="px-4 py-3">BOQ</th>
              <th scope="col" className="px-4 py-3">BOQ No.</th>
              <th scope="col" className="px-4 py-3">Project</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3 text-right">Items</th>
              <th scope="col" className="px-4 py-3 text-right">Grand total</th>
              <th scope="col" className="px-4 py-3">Last changed</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {items.map((boq) => (
              <tr key={boq.id} className="hover:bg-stone-50">
                <td className="max-w-md px-4 py-3">
                  <Link href={href(boq)} className="block truncate font-semibold hover:underline">
                    {titleOf(boq)}
                  </Link>
                  {boq.subtitle && <p className="truncate text-stone-500">{boq.subtitle}</p>}
                </td>
                <td className="px-4 py-3 text-stone-600">{boq.boqNumber || "—"}</td>
                <td className="max-w-48 truncate px-4 py-3 text-stone-600">{boq.project?.title ?? "—"}</td>
                <td className="px-4 py-3"><StatusPill boq={boq} /></td>
                <td className="px-4 py-3 text-right tabular-nums">{boq.itemCount}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">₹{fmtMoney(boq.grandTotal)}</td>
                <td className="px-4 py-3 text-stone-500">
                  <p>{fmtDateTime(boq.updatedAt)}</p>
                  {boq.updatedBy && <p className="truncate text-xs">{boq.updatedBy}</p>}
                </td>
                <td className="px-2 py-3">
                  <Actions boq={boq} onDuplicate={onDuplicate} onDelete={onDelete} busy={busyId === boq.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
