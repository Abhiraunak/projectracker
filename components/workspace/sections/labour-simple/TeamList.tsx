"use client";

import { useState, type KeyboardEvent } from "react";
import { FiArchive, FiChevronDown, FiChevronUp, FiClipboard, FiCreditCard, FiEdit2, FiPlus, FiX } from "react-icons/fi";
import { useArchivePayment, useArchivePerson, usePerson, useSavePeriodPayment, useTeam } from "@/hooks/useLabourSimple";
import { describeError } from "@/lib/api";
import type { TeamRow } from "@/lib/labour/simple";
import { DatePick } from "./DatePick";
import { field, label, longDay, mondayOf, money, mono, num, shortDay, todayYmd, weekday } from "./shared";

/**
 * Team heads and individuals, one row each, like materials and their deliveries: Attendance amount, Paid, To pay.
 * Attendance ▾ opens their marked days (tap one to open its sheet); Payments ▾ opens their payments, each for a
 * period (From – To). The box archives the person with all their days and payments.
 */
export function TeamList({
    projectId,
    onMark,
    onOpenDay,
}: {
    projectId: string;
    onMark: (name: string, solo: boolean) => void;
    onOpenDay: (d: { date: string; contractor: string; taskId: string | null; solo: boolean }) => void;
}) {
    const list = useTeam(projectId);
    const archive = useArchivePerson(projectId);
    const [open, setOpen] = useState<{ name: string; what: "days" | "pays" } | null>(null);
    const [adding, setAdding] = useState(false);

    const toggle = (name: string, what: "days" | "pays") =>
        setOpen((o) => (o && o.name.toLowerCase() === name.toLowerCase() && o.what === what ? null : { name, what }));

    return (
        <section className={`${mono.card} overflow-hidden`}>
            <div className="flex flex-wrap items-center gap-2 px-5 py-4">
                <h3 className="mr-auto text-[15px] font-semibold text-[#111111]">Team heads and individuals</h3>
                <button type="button" onClick={() => setAdding((a) => !a)} className={`${mono.primary} min-h-10 text-sm`}>
                    <FiPlus aria-hidden /> Add person
                </button>
            </div>
            {adding && <PaymentForm projectId={projectId} withName onDone={() => setAdding(false)} />}

            {list.isError ? (
                <p role="alert" className="px-5 pb-4 text-sm text-[#B3261E]">{describeError(list.error)}</p>
            ) : !list.data ? (
                <p className="px-5 pb-4 text-sm text-[#8C8C8C]">Loading…</p>
            ) : list.data.items.length === 0 ? (
                <p className="border-t border-[#EFEFED] px-5 py-6 text-center text-sm text-[#666666]">
                    Nobody yet. Mark attendance below, or press Add person to record a payment.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-184 text-sm">
                        <thead>
                            <tr className="border-y border-[#EFEFED] bg-[#F7F7F5] text-xs text-[#666666]">
                                <th scope="col" className="px-5 py-2 text-left font-medium">Name</th>
                                <th scope="col" className="w-32 px-2 py-2 text-right font-medium">Attendance amount</th>
                                <th scope="col" className="w-28 px-2 py-2 text-right font-medium">Paid</th>
                                <th scope="col" className="w-32 px-2 py-2 text-right font-medium">To pay</th>
                                <th scope="col" className="w-72 px-2 py-2"><span className="sr-only">Open</span></th>
                                <th scope="col" className="w-14 pr-4"><span className="sr-only">Archive</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.data.items.map((p) => {
                                const here = open && open.name.toLowerCase() === p.name.toLowerCase() ? open.what : null;
                                return (
                                    <PersonRows
                                        key={p.name.toLowerCase()}
                                        projectId={projectId}
                                        p={p}
                                        here={here}
                                        onToggle={(w) => toggle(p.name, w)}
                                        onMark={() => onMark(p.name, p.kind === "one")}
                                        onOpenDay={(d) => onOpenDay({ ...d, contractor: p.name, solo: p.kind === "one" })}
                                        onArchive={() => archive.mutate({ name: p.name, archive: true })}
                                        archiving={archive.isPending && archive.variables?.name === p.name}
                                    />
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t border-[#EFEFED] bg-[#F7F7F5]">
                                <td className="px-5 py-2.5 font-semibold">Total</td>
                                <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-[#185FA5]">{money(list.data.totals.earned)}</td>
                                <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-[#0F6E56]">{money(list.data.totals.paid)}</td>
                                <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-[#854F0B]">
                                    {money(list.data.totals.toPay)}
                                    {list.data.totals.ahead > 0 && <span className="block text-xs font-medium text-[#0F6E56]">Paid ahead {money(list.data.totals.ahead)}</span>}
                                </td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
            {archive.isError && <p role="alert" className="px-5 pb-4 text-sm text-[#B3261E]">{describeError(archive.error)}</p>}
        </section>
    );
}

/** What a row shows under To pay: a balance, "Paid ahead", or a dash for someone only paid */
function toPayText(p: TeamRow) {
    if (p.kind === null) return { text: "–", tone: "text-[#8C8C8C]" };
    if (p.toPay < 0) return { text: `Paid ahead ${money(-p.toPay)}`, tone: "text-[#0F6E56]" };
    return { text: money(p.toPay), tone: "text-[#854F0B]" };
}

function PersonRows({
    projectId,
    p,
    here,
    onToggle,
    onMark,
    onOpenDay,
    onArchive,
    archiving,
}: {
    projectId: string;
    p: TeamRow;
    here: "days" | "pays" | null;
    onToggle: (w: "days" | "pays") => void;
    onMark: () => void;
    onOpenDay: (d: { date: string; taskId: string | null }) => void;
    onArchive: () => void;
    archiving: boolean;
}) {
    const due = toPayText(p);
    const btn = (w: "days" | "pays", text: string, Icon: typeof FiClipboard) => (
        <button
            type="button"
            onClick={() => onToggle(w)}
            aria-expanded={here === w}
            className={`${mono.secondary} min-h-9 px-3 text-sm ${here === w ? "border-[#111111] bg-[#F7F7F5]" : ""}`}
        >
            <Icon aria-hidden /> {text} {here === w ? <FiChevronUp aria-hidden /> : <FiChevronDown aria-hidden />}
        </button>
    );
    return (
        <>
            <tr className={`border-t border-[#EFEFED] ${here ? "bg-[#FAFAF9]" : ""}`}>
                <td className="px-5 py-3">
                    <span className="font-semibold text-[#111111]">{p.name}</span>
                    {p.kind && (
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${p.kind === "team" ? "bg-[#E6F1FB] text-[#185FA5]" : "bg-[#EEEDFE] text-[#534AB7]"}`}>
                            {p.kind === "team" ? "Team" : "One person"}
                        </span>
                    )}
                    {p.last && <span className="block text-xs text-[#8C8C8C]">Last {shortDay(p.last)}{p.days ? ` · ${p.days} ${p.days === 1 ? "day" : "days"}` : ""}</span>}
                </td>
                <td className="px-2 py-3 text-right tabular-nums text-[#185FA5]">{p.kind === null ? "–" : money(p.earned)}</td>
                <td className="px-2 py-3 text-right tabular-nums text-[#0F6E56]">{money(p.paid)}</td>
                <td className={`px-2 py-3 text-right font-semibold tabular-nums ${due.tone}`}>{due.text}</td>
                <td className="px-2 py-3 text-right">
                    <span className="inline-flex gap-1.5">
                        {btn("days", "Attendance", FiClipboard)}
                        {btn("pays", "Payments", FiCreditCard)}
                    </span>
                </td>
                <td className="pr-4 text-right">
                    <button type="button" onClick={onArchive} disabled={archiving} className={mono.icon} aria-label={`Archive ${p.name}`} title="Archive (with all their days and payments)">
                        <FiArchive aria-hidden />
                    </button>
                </td>
            </tr>
            {here && (
                <tr>
                    <td colSpan={6} className="bg-[#FAFAF9] px-5 pb-4 pt-1">
                        {here === "days" ? <DaysPanel projectId={projectId} name={p.name} onMark={onMark} onOpenDay={onOpenDay} /> : <PaysPanel projectId={projectId} name={p.name} />}
                    </td>
                </tr>
            )}
        </>
    );
}

function DaysPanel({ projectId, name, onMark, onOpenDay }: { projectId: string; name: string; onMark: () => void; onOpenDay: (d: { date: string; taskId: string | null }) => void }) {
    const d = usePerson(projectId, name);
    return (
        <div className="space-y-2">
            <button type="button" onClick={onMark} className={`${mono.primary} min-h-10 text-sm`}>
                <FiPlus aria-hidden /> Mark attendance
            </button>
            {d.isError ? (
                <p role="alert" className="text-sm text-[#B3261E]">{describeError(d.error)}</p>
            ) : !d.data ? (
                <p className="text-sm text-[#8C8C8C]">Loading…</p>
            ) : d.data.days.length === 0 ? (
                <p className="text-sm text-[#666666]">No attendance marked yet.</p>
            ) : (
                <div className="overflow-hidden rounded-xl border border-[#E8E8E6] bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#F7F7F5] text-xs text-[#666666]">
                                <th scope="col" className="px-4 py-2 text-left font-medium">Date</th>
                                <th scope="col" className="px-2 py-2 text-left font-medium">Work</th>
                                <th scope="col" className="px-2 py-2 text-right font-medium">Labour</th>
                                <th scope="col" className="px-2 py-2 text-right font-medium">Hours</th>
                                <th scope="col" className="px-2 py-2 text-right font-medium">Amount</th>
                                <th scope="col" className="w-20 pr-4"><span className="sr-only">Open</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFEFED]">
                            {d.data.days.map((x, i) => (
                                <tr key={`${x.date}|${x.taskId ?? ""}|${i}`} onClick={() => onOpenDay({ date: x.date, taskId: x.taskId })} className="cursor-pointer hover:bg-[#FAFAF9]">
                                    <td className="whitespace-nowrap px-4 py-2">
                                        {weekday(x.date)} {longDay(x.date)}
                                    </td>
                                    <td className="px-2 py-2">{x.work}</td>
                                    <td className="px-2 py-2 text-right tabular-nums">{x.workers}</td>
                                    <td className="px-2 py-2 text-right tabular-nums">
                                        {x.hours || "–"}
                                        {x.otHours ? ` + ${x.otHours} OT` : ""}
                                    </td>
                                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{money(x.amount)}</td>
                                    <td className="pr-4 text-right text-sm font-medium text-[#185FA5]">Open ›</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function PaysPanel({ projectId, name }: { projectId: string; name: string }) {
    const d = usePerson(projectId, name);
    const archive = useArchivePayment(projectId);
    const [editing, setEditing] = useState<{ id: string; from: string; to: string; amount: number } | null>(null);
    return (
        <div className="space-y-2">
            <PaymentForm key={editing?.id ?? "new"} projectId={projectId} name={name} editing={editing} onDone={() => setEditing(null)} />
            {d.isError ? (
                <p role="alert" className="text-sm text-[#B3261E]">{describeError(d.error)}</p>
            ) : !d.data ? (
                <p className="text-sm text-[#8C8C8C]">Loading…</p>
            ) : d.data.payments.length === 0 ? (
                <p className="text-sm text-[#666666]">No payments yet.</p>
            ) : (
                <div className="overflow-hidden rounded-xl border border-[#E8E8E6] bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#F7F7F5] text-xs text-[#666666]">
                                <th scope="col" className="px-4 py-2 text-left font-medium">Period</th>
                                <th scope="col" className="px-2 py-2 text-right font-medium">Amount paid</th>
                                <th scope="col" className="w-24 pr-3"><span className="sr-only">Change</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFEFED]">
                            {d.data.payments.map((x) => (
                                <tr key={x.id} className={editing?.id === x.id ? "bg-[#E6F1FB]" : ""}>
                                    <td className="px-4 py-2">
                                        {x.from && x.to ? `${shortDay(x.from)} – ${x.from.slice(0, 4) === x.to.slice(0, 4) ? shortDay(x.to) : longDay(x.to)}` : `Paid on ${longDay(x.date)}`}
                                        {x.remark && <span className="block text-xs text-[#8C8C8C]">{x.remark}</span>}
                                    </td>
                                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{money(x.amount)}</td>
                                    <td className="pr-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => setEditing({ id: x.id, from: x.from || x.date, to: x.to || x.date, amount: x.amount })}
                                            className={mono.icon}
                                            aria-label="Change this payment"
                                            title="Change"
                                        >
                                            <FiEdit2 aria-hidden />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => archive.mutate({ id: x.id, archive: true })}
                                            disabled={archive.isPending}
                                            className={mono.icon}
                                            aria-label="Archive this payment"
                                            title="Archive"
                                        >
                                            <FiArchive aria-hidden />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {archive.isError && <p role="alert" className="text-sm text-[#B3261E]">{describeError(archive.error)}</p>}
        </div>
    );
}

/**
 * A payment for a period: From, To, Amount paid. With `withName` (Add person) it also asks the name, and saving it
 * puts that person on the list. With `editing`, the boxes start filled and Save changes that payment.
 */
function PaymentForm({
    projectId,
    name,
    withName,
    editing,
    onDone,
}: {
    projectId: string;
    name?: string;
    withName?: boolean;
    editing?: { id: string; from: string; to: string; amount: number } | null;
    onDone: () => void;
}) {
    const save = useSavePeriodPayment(projectId);
    const today = todayYmd();
    const [who, setWho] = useState("");
    const [from, setFrom] = useState(editing?.from ?? mondayOf(today));
    const [to, setTo] = useState(editing?.to ?? today);
    const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
    const [problem, setProblem] = useState<string | null>(null);

    const submit = () => {
        const person = (withName ? who : (name ?? "")).trim();
        const paid = num(amount);
        if (!person) {
            setProblem("Enter the name.");
            return;
        }
        if (from > to) {
            setProblem("From must be on or before To.");
            return;
        }
        if (paid <= 0) {
            setProblem("Enter the amount paid.");
            return;
        }
        save.mutate(
            { id: editing?.id, body: { name: person, from, to, amount: paid } },
            {
                onSuccess: () => {
                    setAmount("");
                    setWho("");
                    setProblem(null);
                    onDone();
                },
            },
        );
    };
    const enter = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            submit();
        }
    };

    return (
        <div className={`rounded-xl border border-[#E8E8E6] bg-white p-3 ${withName ? "mx-5 mb-4" : ""}`}>
            <div className={`grid gap-2.5 sm:items-end ${withName ? "sm:grid-cols-[minmax(0,1.4fr)_11rem_11rem_minmax(0,1fr)_auto]" : "sm:grid-cols-[11rem_11rem_minmax(0,1fr)_auto]"}`}>
                {withName && (
                    <label className={label}>
                        Name
                        <input
                            value={who}
                            onChange={(e) => {
                                setWho(e.target.value);
                                setProblem(null);
                            }}
                            onKeyDown={enter}
                            autoFocus
                            maxLength={120}
                            placeholder="Hablu head mistry"
                            className={`${field} h-11 text-base`}
                        />
                    </label>
                )}
                <div className={label}>
                    <span>From</span>
                    <DatePick value={from} onChange={(v) => { setFrom(v); setProblem(null); }} label="From" />
                </div>
                <div className={label}>
                    <span>To</span>
                    <DatePick value={to} onChange={(v) => { setTo(v); setProblem(null); }} label="To" />
                </div>
                <label className={label}>
                    Amount paid
                    <input
                        value={amount}
                        onChange={(e) => {
                            setAmount(e.target.value);
                            setProblem(null);
                        }}
                        onKeyDown={enter}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        placeholder="₹ 0"
                        className={`${field} h-11 text-base tabular-nums`}
                    />
                </label>
                <span className="flex gap-1.5">
                    <button type="button" onClick={submit} disabled={save.isPending} className={`${mono.primary} min-w-28`}>
                        {save.isPending ? "Saving…" : editing ? "Save" : withName ? "Add" : "Add payment"}
                    </button>
                    {(editing || withName) && (
                        <button type="button" onClick={onDone} className={mono.icon} aria-label="Cancel" title="Cancel">
                            <FiX aria-hidden />
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
    );
}