"use client";

import { useState } from "react";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { useEstimateLines, useImportFromEstimate } from "@/hooks/useMaterialPurchases";
import { describeError } from "@/lib/api";
import type { EstimateLine } from "@/lib/inventory/purchases";
import { mono } from "./mono";
import { money, qtyText } from "./purchaseFormat";

/**
 * "From estimate": the project's Material estimate (its BOQ) line by line, with quantity and rate. Tick the lines to
 * bring in; each becomes a material, so what arrives is tracked against the estimated quantity. Lines already in
 * Materials (same name) are shown ticked off and can't be added twice.
 */
export function EstimateImportDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
    const book = useEstimateLines(projectId, true);
    const run = useImportFromEstimate(projectId);
    const [boqId, setBoqId] = useState<string | null>(null);
    const [picked, setPicked] = useState<Set<string> | null>(null); // null: every new line (the usual case)
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<{ added: number; skipped: string[] } | null>(null);

    const estimates = book.data?.estimates ?? [];
    const estimate = estimates.find((e) => e.id === boqId) ?? estimates[0];
    const fresh = (estimate?.lines ?? []).filter((l) => !l.imported);
    const chosen = picked ?? new Set(fresh.map((l) => l.partId));
    const chosenLines = fresh.filter((l) => chosen.has(l.partId));
    const total = chosenLines.reduce((s, l) => s + l.amount, 0);

    const toggle = (l: EstimateLine) => {
        const next = new Set(chosen);
        if (next.has(l.partId)) next.delete(l.partId);
        else next.add(l.partId);
        setPicked(next);
    };

    const submit = async () => {
        if (!estimate || chosenLines.length === 0) {
            setError("Tick at least one line to bring in.");
            return;
        }
        setError(null);
        try {
            setDone(await run.mutateAsync({ boqId: estimate.id, partIds: chosenLines.map((l) => l.partId) }));
        } catch (err) {
            setError(describeError(err));
        }
    };

    // Group the lines under the estimate's own section titles
    const sections: { title: string; lines: EstimateLine[] }[] = [];
    for (const l of estimate?.lines ?? []) {
        const last = sections.at(-1);
        if (last && last.title === l.section) last.lines.push(l);
        else sections.push({ title: l.section, lines: [l] });
    }

    return (
        <ModalDialog open onClose={onClose} label="Materials from the estimate" size="lg" locked={run.isPending}>
            <DialogHeader title="Materials from the estimate" subtitle="Bring the estimated quantities in, then log deliveries against them" onClose={onClose} locked={run.isPending} />
            <div className="max-h-[65vh] overflow-y-auto px-4 py-4 sm:px-5">
                {done ? (
                    <div role="status" className="space-y-2 text-sm">
                        <p className="font-semibold text-[#111111]">
                            {done.added === 0 ? "Nothing new was added." : `Added ${done.added} ${done.added === 1 ? "material" : "materials"} to Materials.`}
                        </p>
                        {done.skipped.length > 0 && <p className="text-[#666666]">Already in Materials, left as they are: {done.skipped.join(", ")}.</p>}
                    </div>
                ) : book.isPending ? (
                    <div aria-busy="true" className="h-40 animate-pulse rounded-xl bg-[#F1F1EF]" />
                ) : book.isError ? (
                    <p role="alert" className="text-sm text-red-700">
                        {describeError(book.error)}{" "}
                        <button type="button" onClick={() => void book.refetch()} className="font-semibold underline">
                            Try again
                        </button>
                    </p>
                ) : estimates.length === 0 ? (
                    <p className="text-sm text-[#666666]">This project has no Material estimate yet. Make one in the Material estimate section, then bring it in here.</p>
                ) : (
                    <div className="space-y-4">
                        {estimates.length > 1 && (
                            <label className={mono.fieldLabel}>
                                Estimate
                                <select
                                    value={estimate?.id}
                                    onChange={(e) => {
                                        setBoqId(e.target.value);
                                        setPicked(null);
                                    }}
                                    className={mono.field}
                                >
                                    {estimates.map((e) => (
                                        <option key={e.id} value={e.id}>
                                            {e.title}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}

                        {(estimate?.lines.length ?? 0) === 0 ? (
                            <p className="text-sm text-[#666666]">This estimate has no lines with a quantity yet.</p>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                    <span className="text-[#666666]">
                                        {chosenLines.length} of {fresh.length} new {fresh.length === 1 ? "line" : "lines"} ticked
                                    </span>
                                    {fresh.length > 0 && (
                                        <button type="button" onClick={() => setPicked(chosenLines.length === fresh.length ? new Set() : null)} className="font-medium text-[#111111] underline underline-offset-4">
                                            {chosenLines.length === fresh.length ? "Untick all" : "Tick all"}
                                        </button>
                                    )}
                                </div>
                                {sections.map((sec, i) => (
                                    <fieldset key={`${sec.title}-${i}`} className="rounded-xl border border-[#E8E8E6]">
                                        {sec.title && <legend className="ml-3 px-1 text-xs font-medium uppercase tracking-wide text-[#666666]">{sec.title}</legend>}
                                        <ul className="divide-y divide-[#F1F1EF]">
                                            {sec.lines.map((l) => (
                                                <li key={l.partId}>
                                                    <label className={`flex items-start gap-3 px-3 py-2.5 ${l.imported ? "opacity-60" : "cursor-pointer hover:bg-[#F7F7F5]"}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={l.imported || chosen.has(l.partId)}
                                                            disabled={l.imported}
                                                            onChange={() => toggle(l)}
                                                            className="mt-1 h-4 w-4 shrink-0 accent-[#111111]"
                                                        />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="line-clamp-2 text-sm text-[#111111]">{l.name}</span>
                                                            <span className="text-xs text-[#666666]">
                                                                {qtyText(l.quantity)} {l.unit} × {money(l.rate)} = {money(l.amount)}
                                                                {l.imported && " · already in Materials"}
                                                            </span>
                                                        </span>
                                                    </label>
                                                </li>
                                            ))}
                                        </ul>
                                    </fieldset>
                                ))}
                            </>
                        )}
                    </div>
                )}
                {error && (
                    <p role="alert" className="mt-3 text-sm text-red-700">
                        {error}
                    </p>
                )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#E8E8E6] px-4 py-3 sm:px-5">
                {done ? (
                    <button type="button" onClick={onClose} className={mono.primary}>
                        Done
                    </button>
                ) : (
                    <>
                        {chosenLines.length > 0 && <span className="mr-auto text-sm text-[#666666]">Estimated {money(total)}</span>}
                        <button type="button" onClick={onClose} disabled={run.isPending} className={mono.quiet}>
                            Cancel
                        </button>
                        {estimates.length > 0 && fresh.length > 0 && (
                            <button type="button" onClick={() => void submit()} disabled={run.isPending} className={mono.primary}>
                                {run.isPending ? "Bringing in…" : `Bring in ${chosenLines.length || ""}`.trim()}
                            </button>
                        )}
                    </>
                )}
            </div>
        </ModalDialog>
    );
}