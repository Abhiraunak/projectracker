"use client";

import { useState } from "react";
import { FiRotateCcw, FiTrash2 } from "react-icons/fi";
import { ConfirmDeleteDialog } from "@/components/utilites/Confirmdeletedialog";
import { useArchiveBill, useArchiveMeasure, useArchivePayment, useArchivePerson, useArchiveSubcontractor, useArchived, useDeleteArchived } from "@/hooks/useLabourSimple";
import { describeError } from "@/lib/api";
import { longDay, money, mono, shortDay } from "./shared";

type Line = { key: string; kind: "person" | "sub" | "payment" | "work" | "bill"; id: string; title: string; detail: string };

/**
 * What was archived in this tab. Nothing archived counts anywhere. Restore puts a line back; tick lines (or Select all)
 * and Delete selected removes them for good, in one go. Only archived rows can ever be deleted.
 */
export function ArchivedList({ projectId, tab }: { projectId: string; tab: "team" | "sub" }) {
    const data = useArchived(projectId);
    const person = useArchivePerson(projectId);
    const sub = useArchiveSubcontractor(projectId);
    const payment = useArchivePayment(projectId);
    const work = useArchiveMeasure(projectId);
    const bill = useArchiveBill(projectId);
    const remove = useDeleteArchived(projectId);
    const [ticked, setTicked] = useState<Set<string>>(new Set());
    const [asking, setAsking] = useState(false);

    const a = data.data;
    const lines: Line[] = !a
        ? []
        : tab === "team"
            ? [
                ...a.people.map((p) => ({
                    key: `person:${p.name.toLowerCase()}`,
                    kind: "person" as const,
                    id: p.name,
                    title: p.name,
                    detail: [
                        p.days ? `${p.days} ${p.days === 1 ? "day" : "days"} (${money(p.earned)})` : "",
                        p.bills ? `${p.bills} ${p.bills === 1 ? "bill" : "bills"} (${money(p.billed)})` : "",
                        p.payments ? `${p.payments} ${p.payments === 1 ? "payment" : "payments"} (${money(p.paid)})` : "",
                    ]
                        .filter(Boolean)
                        .join(" · "),
                })),
                ...a.bills.map((b) => ({
                    key: `bill:${b.id}`,
                    kind: "bill" as const,
                    id: b.id,
                    title: `${b.name}: bill ${money(b.amount)}`,
                    detail: `${shortDay(b.from)} – ${shortDay(b.to)}, with its payments`,
                })),
                ...a.payments
                    .filter((p) => p.kind === "team")
                    .map((p) => ({
                        key: `payment:${p.id}`,
                        kind: "payment" as const,
                        id: p.id,
                        title: `${p.name}: payment ${money(p.amount)}`,
                        detail: p.from && p.to ? `${shortDay(p.from)} – ${shortDay(p.to)}` : `Paid on ${longDay(p.date)}`,
                    })),
            ]
            : [
                ...a.subcontractors.map((p) => ({
                    key: `sub:${p.name.toLowerCase()}`,
                    kind: "sub" as const,
                    id: p.name,
                    title: p.name,
                    detail: [`${p.works} ${p.works === 1 ? "work" : "works"} (${money(p.done)})`, p.payments ? `${p.payments} ${p.payments === 1 ? "payment" : "payments"} (${money(p.paid)})` : ""].filter(Boolean).join(" · "),
                })),
                ...a.works.map((w) => ({ key: `work:${w.id}`, kind: "work" as const, id: w.id, title: `${w.name}: ${w.work}`, detail: `${money(w.amount)} done, with its payments` })),
                ...a.payments
                    .filter((p) => p.kind === "sub")
                    .map((p) => ({ key: `payment:${p.id}`, kind: "payment" as const, id: p.id, title: `${p.name}: payment ${money(p.amount)}`, detail: `${longDay(p.date)} · ${p.work ?? "Advance"}` })),
            ];

    // Worked out, not stored: ticks of lines that are no longer here drop off
    const picked = lines.filter((l) => ticked.has(l.key));
    const all = lines.length > 0 && picked.length === lines.length;
    const flip = (key: string) =>
        setTicked((t) => {
            const n = new Set(t);
            if (n.has(key)) n.delete(key);
            else n.add(key);
            return n;
        });
    const restore = (l: Line) => {
        if (l.kind === "person") person.mutate({ name: l.id, archive: false });
        else if (l.kind === "sub") sub.mutate({ name: l.id, archive: false });
        else if (l.kind === "work") work.mutate({ id: l.id, archive: false });
        else if (l.kind === "bill") bill.mutate({ id: l.id, archive: false });
        else payment.mutate({ id: l.id, archive: false });
    };
    const confirm = () => {
        const ids = (k: Line["kind"]) => picked.filter((l) => l.kind === k).map((l) => l.id);
        remove.mutate(
            { people: ids("person"), subcontractors: ids("sub"), works: ids("work"), payments: ids("payment"), bills: ids("bill") },
            {
                onSuccess: () => {
                    setTicked(new Set());
                    setAsking(false);
                },
            },
        );
    };
    const failed = person.error ?? sub.error ?? payment.error ?? work.error ?? bill.error;

    return (
        <section className={`${mono.card} overflow-hidden`}>
            <div className="flex flex-wrap items-center gap-2 px-4 py-4 sm:px-5">
                <h3 className="mr-auto text-[15px] font-semibold text-[#111111]">Archived</h3>
                {lines.length > 0 && (
                    <>
                        <label className="flex items-center gap-2 text-sm text-[#333333]">
                            <input type="checkbox" checked={all} onChange={() => setTicked(all ? new Set() : new Set(lines.map((l) => l.key)))} className="h-4 w-4 accent-[#111111]" />
                            Select all
                        </label>
                        <button type="button" onClick={() => setAsking(true)} disabled={picked.length === 0} className={`${mono.secondary} min-h-9 px-3 text-sm text-[#B3261E] disabled:text-[#8C8C8C]`}>
                            <FiTrash2 aria-hidden /> Delete selected{picked.length ? ` (${picked.length})` : ""}
                        </button>
                    </>
                )}
            </div>
            {data.isError ? (
                <p role="alert" className="px-5 pb-4 text-sm text-[#B3261E]">{describeError(data.error)}</p>
            ) : lines.length === 0 ? (
                <p className="border-t border-[#EFEFED] px-5 py-4 text-sm text-[#666666]">Nothing archived. Archive with the box icon; delete for good from here.</p>
            ) : (
                <ul className="divide-y divide-[#EFEFED] border-t border-[#EFEFED]">
                    {lines.map((l) => (
                        <li key={l.key} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                            <input type="checkbox" checked={ticked.has(l.key)} onChange={() => flip(l.key)} aria-label={`Select ${l.title}`} className="h-4 w-4 accent-[#111111]" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-[#111111]">{l.title}</span>
                                <span className="block truncate text-xs text-[#8C8C8C]">{l.detail}</span>
                            </span>
                            <button type="button" onClick={() => restore(l)} className={`${mono.quiet} min-h-9 px-3 text-sm`}>
                                <FiRotateCcw aria-hidden /> Restore
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {failed && <p role="alert" className="px-5 pb-4 text-sm text-[#B3261E]">{describeError(failed)}</p>}

            <ConfirmDeleteDialog
                open={asking}
                onClose={() => {
                    setAsking(false);
                    remove.reset();
                }}
                title={`Delete ${picked.length} for good?`}
                itemName={picked.map((l) => l.title).join(", ")}
                description="Everything in them (days, bills, payments, work done) is removed and cannot be brought back."
                pending={remove.isPending}
                error={remove.error ? describeError(remove.error) : null}
                onConfirm={confirm}
            />
        </section>
    );
}