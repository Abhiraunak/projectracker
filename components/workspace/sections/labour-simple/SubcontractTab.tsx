"use client";

import { useState } from "react";
import { FiCreditCard, FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { ConfirmDeleteDialog } from "@/components/utilites/Confirmdeletedialog";
import { usePeople, useRemoveMeasure, useSaveMeasure, useSubcontract } from "@/hooks/useLabourSimple";
import { describeError } from "@/lib/api";
import type { Measure } from "@/lib/labour/simple";
import { SectionError, SectionSkeleton } from "../../ui";
import { Tile } from "./Tile";
import { field, label, longDay, money, mono, num, r2, todayYmd } from "./shared";

const UNITS = ["sqft", "rft", "sqm", "cum", "nos", "kg"];

/**
 * Subcontract: work given on contract (quantity × rate) for any number of subcontractors. Each subcontractor shows the
 * work done, what was paid and what is left, with Pay; every entry can be changed or deleted.
 */
export function SubcontractTab({ projectId, onPay }: { projectId: string; onPay: (name: string) => void }) {
    const book = useSubcontract(projectId);
    const people = usePeople(projectId);
    const remove = useRemoveMeasure(projectId);
    const [form, setForm] = useState<{ editing: Measure | null } | null>(null);
    const [deleting, setDeleting] = useState<Measure | null>(null);

    if (book.isPending) return <SectionSkeleton />;
    if (book.isError) return <SectionError error={book.error} onRetry={() => void book.refetch()} />;
    const { items, people: subs, totals } = book.data;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Tile tone="blue" label="Work done" value={money(totals.done)} note={`${subs.length} ${subs.length === 1 ? "subcontractor" : "subcontractors"}`} />
                <Tile tone="green" label="Paid" value={money(totals.paid)} />
                <Tile tone="amber" label="Still to pay" value={money(Math.max(0, totals.toPay))} />
            </div>

            {subs.length > 0 && (
                <section className={`${mono.card} overflow-hidden`}>
                    <h3 className="px-5 pb-2 pt-4 text-[15px] font-semibold text-[#111111]">Subcontractors</h3>
                    <ul className="divide-y divide-[#EFEFED] border-t border-[#EFEFED]">
                        {subs.map((p) => (
                            <li key={p.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                                <span className="min-w-0 flex-1 font-semibold text-[#111111]">{p.name}</span>
                                <span className="text-[#0C447C]">done {money(p.done)}</span>
                                <span className="text-[#085041]">paid {money(p.paid)}</span>
                                <span className={`font-semibold ${p.toPay > 0 ? "text-[#854F0B]" : "text-[#3B6D11]"}`}>{p.toPay > 0 ? `${money(p.toPay)} to pay` : "settled"}</span>
                                <button type="button" onClick={() => onPay(p.name)} className={`${mono.secondary} min-h-10 px-3 text-sm`}>
                                    <FiCreditCard aria-hidden /> Pay
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className={`${mono.card} overflow-hidden`}>
                <div className="flex flex-wrap items-center gap-2 px-5 py-4">
                    <h3 className="flex-1 text-[15px] font-semibold text-[#111111]">Work given on contract</h3>
                    {!form && (
                        <button type="button" onClick={() => setForm({ editing: null })} className={`${mono.primary} min-h-10 text-sm`}>
                            <FiPlus aria-hidden /> Add work
                        </button>
                    )}
                </div>
                {form && <MeasureForm projectId={projectId} editing={form.editing} names={people.data?.everyone ?? []} onDone={() => setForm(null)} />}

                {items.length === 0 ? (
                    <p className="border-t border-[#EFEFED] px-5 py-8 text-center text-sm text-[#666666]">Nothing given on contract yet. Use Add work, for example Flooring, 800 sqft at ₹35.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-176 text-sm">
                            <thead>
                                <tr className="border-y border-[#EFEFED] bg-[#F7F7F5] text-xs text-[#666666]">
                                    <th scope="col" className="px-5 py-2 text-left font-medium">Date</th>
                                    <th scope="col" className="px-2 py-2 text-left font-medium">Subcontractor · work</th>
                                    <th scope="col" className="px-2 py-2 text-right font-medium">Quantity</th>
                                    <th scope="col" className="px-2 py-2 text-right font-medium">Rate</th>
                                    <th scope="col" className="px-2 py-2 text-right font-medium">Amount</th>
                                    <th scope="col" className="w-24"><span className="sr-only">Edit or delete</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFEFED]">
                                {items.map((m) => (
                                    <tr key={m.id}>
                                        <td className="whitespace-nowrap px-5 py-2.5">{longDay(m.date)}</td>
                                        <td className="px-2 py-2.5">
                                            <span className="block font-semibold text-[#111111]">{m.contractorName}</span>
                                            <span className="block text-xs text-[#666666]">
                                                {m.work}
                                                {m.note && ` · ${m.note}`}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums">
                                            {m.quantity.toLocaleString("en-IN")} {m.unit}
                                        </td>
                                        <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums">
                                            {money(m.rate)}/{m.unit}
                                        </td>
                                        <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold tabular-nums text-[#0C447C]">{money(m.amount)}</td>
                                        <td className="whitespace-nowrap px-2 py-1 text-right">
                                            <button type="button" onClick={() => setForm({ editing: m })} className={mono.icon} aria-label={`Edit ${m.work}`} title="Edit">
                                                <FiEdit2 aria-hidden />
                                            </button>
                                            <button type="button" onClick={() => setDeleting(m)} className={mono.iconDanger} aria-label={`Delete ${m.work}`} title="Delete">
                                                <FiTrash2 aria-hidden />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <ConfirmDeleteDialog
                open={deleting !== null}
                onClose={() => {
                    setDeleting(null);
                    remove.reset();
                }}
                title="Delete contract work?"
                itemName={deleting ? `${deleting.work} (${deleting.contractorName})` : undefined}
                pending={remove.isPending}
                error={remove.error ? describeError(remove.error) : null}
                onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
            />
        </div>
    );
}

function MeasureForm({ projectId, editing, names, onDone }: { projectId: string; editing: Measure | null; names: string[]; onDone: () => void }) {
    const save = useSaveMeasure(projectId);
    const today = todayYmd();
    const [who, setWho] = useState(editing?.contractorName ?? "");
    const [date, setDate] = useState(editing?.date ?? today);
    const [work, setWork] = useState(editing?.work ?? "");
    const [quantity, setQuantity] = useState(editing ? String(editing.quantity) : "");
    const [unit, setUnit] = useState(editing?.unit ?? "sqft");
    const [rate, setRate] = useState(editing ? String(editing.rate) : "");
    const [note, setNote] = useState(editing?.note ?? "");
    const [tried, setTried] = useState(false);
    const problem = !who.trim() ? "Enter the subcontractor." : !work.trim() ? "Say what work it was." : num(quantity) <= 0 ? "Enter the quantity." : null;

    const submit = () => {
        setTried(true);
        if (problem) return;
        save.mutate({ id: editing?.id, body: { contractorName: who.trim(), date, work: work.trim(), quantity: num(quantity), unit: unit.trim() || "sqft", rate: num(rate), note: note.trim() } }, { onSuccess: onDone });
    };

    return (
        <div className="border-t border-[#EFEFED] bg-[#FAFAF9] px-5 py-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className={`${label} col-span-2`}>
                    Subcontractor
                    <input value={who} onChange={(e) => setWho(e.target.value)} list="labour-people" maxLength={120} autoFocus placeholder="Sunil tiles" className={field} />
                    <datalist id="labour-people">
                        {names.map((n) => (
                            <option key={n} value={n} />
                        ))}
                    </datalist>
                </label>
                <label className={`${label} col-span-2`}>
                    Work
                    <input value={work} onChange={(e) => setWork(e.target.value)} maxLength={160} placeholder="Flooring, 1st floor" className={field} />
                </label>
                <label className={label}>
                    Quantity
                    <input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min={0} step="any" className={`${field} text-right tabular-nums`} />
                </label>
                <label className={label}>
                    Unit
                    <input value={unit} onChange={(e) => setUnit(e.target.value)} list="labour-units" maxLength={20} className={field} />
                    <datalist id="labour-units">
                        {UNITS.map((u) => (
                            <option key={u} value={u} />
                        ))}
                    </datalist>
                </label>
                <label className={label}>
                    Rate (₹ per {unit || "unit"})
                    <input value={rate} onChange={(e) => setRate(e.target.value)} type="number" min={0} step="any" className={`${field} text-right tabular-nums`} />
                </label>
                <label className={label}>
                    Date
                    <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className={field} />
                </label>
                <label className={`${label} col-span-2 sm:col-span-4`}>
                    Note (optional)
                    <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={field} />
                </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#333333]">
                    Amount: <b className="tabular-nums">{money(r2(num(quantity) * num(rate)))}</b>
                </span>
                {tried && problem && <span className="text-sm text-[#B3261E]">{problem}</span>}
                {save.isError && <span className="text-sm text-[#B3261E]">{describeError(save.error)}</span>}
                <span className="ml-auto flex gap-2">
                    <button type="button" onClick={onDone} disabled={save.isPending} className={`${mono.quiet} min-h-10 text-sm`}>
                        Cancel
                    </button>
                    <button type="button" onClick={submit} disabled={save.isPending} className={`${mono.primary} min-h-10 text-sm`}>
                        {save.isPending ? "Saving…" : editing ? "Save changes" : "Save"}
                    </button>
                </span>
            </div>
        </div>
    );
}