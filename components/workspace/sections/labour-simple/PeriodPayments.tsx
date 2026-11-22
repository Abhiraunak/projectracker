"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { ConfirmDeleteDialog } from "@/components/utilites/Confirmdeletedialog";
import { usePeople, usePeriodPayments, useRemovePeriodPayment, useSavePeriodPayment } from "@/hooks/useLabourSimple";
import { describeError } from "@/lib/api";
import type { PeriodPayment } from "@/lib/labour/simple";
import { field, label, longDay, mondayOf, money, mono, num, shortDay, todayYmd } from "./shared";

/**
 * Paid for a period: a name, From – To and the amount paid. Nothing more. Each entry can be changed or deleted.
 * Every entry is also an ordinary payment to that person, so the Payments tab counts it too.
 */
export function PeriodPayments({ projectId }: { projectId: string }) {
    const list = usePeriodPayments(projectId);
    const people = usePeople(projectId);
    const save = useSavePeriodPayment(projectId);
    const remove = useRemovePeriodPayment(projectId);
    const names = useId();
    const today = todayYmd();
    const blank = { name: "", from: mondayOf(today), to: today, amount: "" };
    const [form, setForm] = useState(blank);
    const [editing, setEditing] = useState<string | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<PeriodPayment | null>(null);

    const set = (patch: Partial<typeof form>) => {
        setForm((f) => ({ ...f, ...patch }));
        setProblem(null);
    };
    const reset = () => {
        setForm(blank);
        setEditing(null);
        setProblem(null);
        save.reset();
    };
    const submit = () => {
        const amount = num(form.amount);
        if (!form.name.trim()) {
            setProblem("Enter a name.");
            return;
        }
        if (!form.from || !form.to || form.from > form.to) {
            setProblem("From must be on or before To.");
            return;
        }
        if (amount <= 0) {
            setProblem("Enter the amount paid.");
            return;
        }
        save.mutate({ id: editing ?? undefined, body: { name: form.name.trim(), from: form.from, to: form.to, amount } }, { onSuccess: reset });
    };
    const startEdit = (p: PeriodPayment) => {
        setForm({ name: p.name, from: p.from, to: p.to, amount: String(p.amount) });
        setEditing(p.id);
        setProblem(null);
    };
    const enter = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            submit();
        }
    };

    return (
        <section className={`${mono.card} overflow-hidden`}>
            <div className="px-5 pb-4 pt-4">
                <h3 className="mb-3 text-[15px] font-semibold text-[#111111]">Paid for a period</h3>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                    <label className={label}>
                        Name
                        <input value={form.name} onChange={(e) => set({ name: e.target.value })} onKeyDown={enter} list={names} maxLength={120} placeholder="Ramesh" className={`${field} h-11 text-base`} />
                        <datalist id={names}>
                            {(people.data?.everyone ?? []).map((n) => (
                                <option key={n} value={n} />
                            ))}
                        </datalist>
                    </label>
                    <label className={label}>
                        From
                        <input type="date" value={form.from} onChange={(e) => set({ from: e.target.value })} className={`${field} h-11 text-base`} />
                    </label>
                    <label className={label}>
                        To
                        <input type="date" value={form.to} onChange={(e) => set({ to: e.target.value })} className={`${field} h-11 text-base`} />
                    </label>
                    <label className={label}>
                        Amount paid
                        <input
                            value={form.amount}
                            onChange={(e) => set({ amount: e.target.value })}
                            onKeyDown={enter}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="any"
                            placeholder="₹ 0"
                            className={`${field} h-11 text-base tabular-nums`}
                        />
                    </label>
                    <span className="flex gap-2">
                        <button type="button" onClick={submit} disabled={save.isPending} className={`${mono.primary} min-w-20`}>
                            {save.isPending ? "Saving…" : editing ? "Save" : "Add"}
                        </button>
                        {editing && (
                            <button type="button" onClick={reset} className={mono.quiet}>
                                Cancel
                            </button>
                        )}
                    </span>
                </div>
                {(problem || save.isError) && (
                    <p role="alert" className="mt-2 text-sm text-[#B3261E]">
                        {problem ?? describeError(save.error)}
                    </p>
                )}
            </div>

            {list.isError ? (
                <p role="alert" className="border-t border-[#EFEFED] px-5 py-4 text-sm text-[#B3261E]">{describeError(list.error)}</p>
            ) : !list.data ? (
                <p className="border-t border-[#EFEFED] px-5 py-4 text-sm text-[#8C8C8C]">Loading…</p>
            ) : list.data.items.length === 0 ? (
                <p className="border-t border-[#EFEFED] px-5 py-6 text-center text-sm text-[#666666]">Nothing added yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-lg text-sm">
                        <thead>
                            <tr className="border-y border-[#EFEFED] bg-[#F7F7F5] text-xs text-[#666666]">
                                <th scope="col" className="px-5 py-2 text-left font-medium">Name</th>
                                <th scope="col" className="px-2 py-2 text-left font-medium">Period</th>
                                <th scope="col" className="px-2 py-2 text-right font-medium">Amount paid</th>
                                <th scope="col" className="w-24 pr-4"><span className="sr-only">Change</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFEFED]">
                            {list.data.items.map((p) => (
                                <tr key={p.id} className={editing === p.id ? "bg-[#E6F1FB]" : ""}>
                                    <td className="px-5 py-2 font-medium text-[#111111]">{p.name}</td>
                                    <td className="whitespace-nowrap px-2 py-2" title={`${longDay(p.from)} – ${longDay(p.to)}`}>
                                        {shortDay(p.from)} – {p.from.slice(0, 4) === p.to.slice(0, 4) ? shortDay(p.to) : longDay(p.to)}
                                    </td>
                                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{money(p.amount)}</td>
                                    <td className="pr-4 text-right">
                                        <button type="button" onClick={() => startEdit(p)} className={mono.icon} aria-label={`Change ${p.name}'s entry`} title="Change">
                                            <FiEdit2 aria-hidden />
                                        </button>
                                        <button type="button" onClick={() => setDeleting(p)} className={mono.iconDanger} aria-label={`Delete ${p.name}'s entry`} title="Delete">
                                            <FiTrash2 aria-hidden />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t border-[#EFEFED] bg-[#F7F7F5]">
                                <td colSpan={2} className="px-5 py-2.5 font-semibold">Total paid</td>
                                <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-[#0F6E56]">{money(list.data.total)}</td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            <ConfirmDeleteDialog
                open={deleting !== null}
                onClose={() => {
                    setDeleting(null);
                    remove.reset();
                }}
                title="Delete this payment?"
                itemName={deleting ? `${deleting.name} · ${shortDay(deleting.from)} – ${shortDay(deleting.to)} · ${money(deleting.amount)}` : undefined}
                description="It is also removed from the Payments tab."
                pending={remove.isPending}
                error={remove.error ? describeError(remove.error) : null}
                onConfirm={() => {
                    if (!deleting) return;
                    remove.mutate(deleting.id, {
                        onSuccess: () => {
                            if (editing === deleting.id) reset();
                            setDeleting(null);
                        },
                    });
                }}
            />
        </section>
    );
}