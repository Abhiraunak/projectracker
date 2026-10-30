"use client";

import { useState, type ReactNode } from "react";
import { FiChevronDown, FiExternalLink, FiFileText } from "react-icons/fi";
import { MODE_LABEL, type Instalment, type Proof } from "@/lib/client/types";
import { Empty, INSTALMENT_TONE, PROOF_LOOK, Pill, dayLabel, focusRing, inr } from "./ui";

/** One payment made against an invoice: the screenshot, how it was paid, and whether it's confirmed */
export function ProofRow({ proof, actions }: { proof: Proof; actions?: ReactNode }) {
  const look = PROOF_LOOK[proof.status];
  return (
    <li className="flex flex-wrap items-start gap-3 py-2.5 text-sm">
      {proof.file ? (
        <a href={proof.file.openUrl} target="_blank" rel="noreferrer" className={`block h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-50 ${focusRing}`} title="Open the screenshot">
          {proof.file.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed Cloudinary link, already sized
            <img src={proof.file.thumbnailUrl} alt={`Payment proof, ${inr(proof.amount)}`} className="h-full w-full object-cover" />
          ) : (
            <FiFileText aria-hidden className="m-auto mt-4 text-xl text-stone-500" />
          )}
        </a>
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-[10px] font-semibold uppercase text-stone-500">No file</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-semibold tabular-nums">{inr(proof.amount)}</span>
          <Pill tone={look.tone}>{look.label}</Pill>
        </p>
        <p className="text-xs text-stone-500">
          {MODE_LABEL[proof.mode]} · paid {dayLabel(proof.paidOn)}
          {proof.reference && ` · Ref ${proof.reference}`}
          {proof.byClient ? ` · sent by ${proof.uploadedBy}` : ` · recorded by ${proof.uploadedBy}`}
        </p>
        {proof.note && <p className="text-xs text-stone-600">“{proof.note}”</p>}
        {proof.status === "REJECTED" && proof.decisionNote && <p className="mt-0.5 text-xs font-semibold text-red-700">{proof.decisionNote}</p>}
        {proof.file && (
          <a href={proof.file.openUrl} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:text-orange-800">
            Open {proof.file.isPdf ? "PDF" : "screenshot"} <FiExternalLink aria-hidden />
          </a>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </li>
  );
}

/**
 * The payment schedule: advance and instalments, each with its state, its invoice and the payments made.
 * `actions` puts the buttons for the person looking (the client's "Upload payment", the admin's "Ask for payment").
 */
export function PaymentSchedule({
  instalments,
  actions,
  proofActions,
  emptyText,
}: {
  instalments: Instalment[];
  actions: (i: Instalment) => ReactNode;
  proofActions?: (p: Proof) => ReactNode;
  emptyText: string;
}) {
  const [open, setOpen] = useState<string | null>(() => instalments.find((i) => i.proofs.some((p) => p.status === "PENDING" || p.status === "REJECTED"))?.id ?? null);

  if (instalments.length === 0) return <Empty>{emptyText}</Empty>;

  return (
    <ol className="divide-y divide-stone-100">
      {instalments.map((i) => {
        const expanded = open === i.id;
        return (
          <li key={i.id} className={i.status === "Overdue" ? "bg-red-50/40" : ""}>
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-stone-500">{i.invoiceNo}</span>
                  <span className="font-semibold">{i.label}</span>
                  {i.kind === "ADVANCE" && <Pill tone="dark">Advance</Pill>}
                  <Pill tone={INSTALMENT_TONE[i.status]}>{i.status === "Overdue" ? `Overdue ${i.daysOverdue} d` : i.status}</Pill>
                </p>
                <p className="text-xs text-stone-500">
                  {i.why}
                  {i.dueOn && i.status !== "Paid" && ` · pay by ${dayLabel(i.dueOn)}`}
                  {i.taxPercent > 0 && ` · incl. ${i.taxPercent}% GST`}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="sm:text-right">
                  <p className="font-semibold tabular-nums">{inr(i.total)}</p>
                  <p className="text-xs text-stone-500">{i.status === "Paid" ? "Paid in full" : i.paid > 0 ? `${inr(i.remaining)} left` : i.checking > 0 ? `${inr(i.checking)} being checked` : "Not paid yet"}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">{actions(i)}</div>
              </div>
            </div>
            {i.proofs.length > 0 && (
              <div className="px-4 pb-2">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : i.id)}
                  className={`inline-flex items-center gap-1 rounded text-xs font-semibold text-stone-600 hover:text-stone-900 ${focusRing}`}
                >
                  <FiChevronDown aria-hidden className={`transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
                  {i.proofs.length} {i.proofs.length === 1 ? "payment" : "payments"}
                </button>
                {expanded && (
                  <ul className="mt-1 divide-y divide-stone-100 border-t border-stone-100">
                    {i.proofs.map((p) => (
                      <ProofRow key={p.id} proof={p} actions={proofActions?.(p)} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
