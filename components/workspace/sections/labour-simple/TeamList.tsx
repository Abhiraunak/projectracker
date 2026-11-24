"use client";

import { useState, type KeyboardEvent } from "react";
import { FiArchive, FiChevronDown, FiChevronUp, FiClipboard, FiCreditCard, FiEdit2, FiPlus, FiX } from "react-icons/fi";
import { useArchiveBill, useArchivePayment, useArchivePerson, usePerson, useSaveBill, useSaveBillPayment, useTeam } from "@/hooks/useLabourSimple";
import { describeError } from "@/lib/api";
import type { Bill, BillPay, PersonDetail, TeamRow } from "@/lib/labour/simple";
import { DatePick } from "./DatePick";
import { Tile } from "./Tile";
import { field, label, longDay, mondayOf, money, mono, num, r2, shortDay, todayYmd, weekday } from "./shared";

/**
 * Team heads and individuals, one row each, like materials and their deliveries:
 *   Attendance amount · Billed · Paid · To pay (bills minus payments; with no bills, the attendance amount minus payments)
 * Bills ▾ opens their bills: each bill is a period's
 * amount (From – To), and payments are made against a bill on a day, so every bill shows what is left on it.
 * Attendance ▾ opens their marked days (tap one to open its sheet).
 * The box archives the person with all their days, bills and payments.
 */
export function TeamList({
    projectId,
    onMark,
    onMarkNew,
    onOpenDay,
}: {
    projectId: string;
    onMark: (name: string, solo: boolean) => void;
    onMarkNew: () => void;
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
                <button type="button" onClick={onMarkNew} className={`${mono.primary} min-h-10 text-sm`}>
                    <FiClipboard aria-hidden /> Mark attendance
                </button>
                <button type="button" onClick={() => setAdding((a) => !a)} className={`${mono.secondary} min-h-10 text-sm`}>
                    <FiPlus aria-hidden /> Add person
                </button>
            </div>
            {adding && (
                <div className="mx-5 mb-4">
                    <BillForm projectId={projectId} withName onDone={() => setAdding(false)} />
                </div>
            )}

            {list.isError ? (
                <p role="alert" className="px-5 pb-4 text-sm text-[#B3261E]">{describeError(list.error)}</p>
            ) : !list.data ? (
                <p className="px-5 pb-4 text-sm text-[#8C8C8C]">Loading…</p>
            ) : list.data.items.length === 0 ? (
                <p className="border-t border-[#EFEFED] px-5 py-6 text-center text-sm text-[#666666]">
                    Nobody yet. Press Mark attendance, or Add person to add a bill for someone.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-216 text-sm">
                        <thead>
                            <tr className="border-y border-[#EFEFED] bg-[#F7F7F5] text-xs text-[#666666]">
                                <th scope="col" className="px-5 py-2 text-left font-medium">Name</th>
                                <th scope="col" className="w-32 px-2 py-2 text-right font-medium">Attendance amount</th>
                                <th scope="col" className="w-28 px-2 py-2 text-right font-medium">Billed</th>
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
                                <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{money(list.data.totals.earned)}</td>
                                <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-[#185FA5]">{money(list.data.totals.billed)}</td>
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

/** What a row shows under To pay: what is left, "Paid ahead", or a dash when there is nothing yet */
function toPayText(p: TeamRow) {
    if (p.owed === 0 && p.paid === 0) return { text: "–", tone: "text-[#8C8C8C]" };
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
                    {p.last && (
                        <span className="block text-xs text-[#8C8C8C]">
                            Last {shortDay(p.last)}
                            {p.days ? ` · ${p.days} ${p.days === 1 ? "day" : "days"}` : ""}
                            {p.bills ? ` · ${p.bills} ${p.bills === 1 ? "bill" : "bills"}` : ""}
                        </span>
                    )}
                </td>
                <td className="px-2 py-3 text-right tabular-nums">{p.kind === null ? "–" : money(p.earned)}</td>
                <td className="px-2 py-3 text-right tabular-nums text-[#185FA5]">{p.bills ? money(p.billed) : "–"}</td>
                <td className="px-2 py-3 text-right tabular-nums text-[#0F6E56]">{money(p.paid)}</td>
                <td className={`px-2 py-3 text-right font-semibold tabular-nums ${due.tone}`}>{due.text}</td>
                <td className="px-2 py-3 text-right">
                    <span className="inline-flex gap-1.5">
                        {btn("pays", "Bills", FiCreditCard)}
                        {btn("days", "Attendance", FiClipboard)}
                    </span>
                </td>
                <td className="pr-4 text-right">
                    <button type="button" onClick={onArchive} disabled={archiving} className={mono.icon} aria-label={`Archive ${p.name}`} title="Archive (with all their days, bills and payments)">
                        <FiArchive aria-hidden />
                    </button>
                </td>
            </tr>
            {here && (
                <tr>
                    <td colSpan={7} className="bg-[#FAFAF9] px-5 pb-4 pt-1">
                        {here === "days" ? <DaysPanel projectId={projectId} name={p.name} onMark={onMark} onOpenDay={onOpenDay} /> : <BillsPanel projectId={projectId} p={p} />}
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

const periodText = (from: string, to: string) => `${shortDay(from)} – ${from.slice(0, 4) === to.slice(0, 4) ? shortDay(to) : longDay(to)}`;

/** A person's bills, each with the payments made against it, and any older payments not on a bill */
function BillsPanel({ projectId, p }: { projectId: string; p: TeamRow }) {
    const name = p.name;
    const d = usePerson(projectId, name);
    const archiveBill = useArchiveBill(projectId);
    const archivePay = useArchivePayment(projectId);
    const [editing, setEditing] = useState<Bill | null>(null);
    const [paying, setPaying] = useState<string | null>(null); // the bill whose payments are open

    const days = d.data?.days ?? [];
    const billed = r2((d.data?.bills ?? []).reduce((s, b) => s + b.amount, 0));
    const paid = r2((d.data?.bills ?? []).reduce((s, b) => s + b.paid, 0) + (d.data?.payments ?? []).reduce((s, p) => s + p.amount, 0));

    return (
        <div className="space-y-2">
            {/* The person's figures, the same as their row: Left to pay = bills − paid (no bills: attendance amount − paid) */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Tile tone="gray" label="Attendance amount" value={money(p.earned)} />
                <Tile tone="blue" label="Billed" value={money(p.billed)} note={`${p.bills} ${p.bills === 1 ? "bill" : "bills"}`} />
                <Tile tone="green" label="Paid" value={money(p.paid)} />
                {p.toPay < 0 ? (
                    <Tile tone="lime" label="Paid ahead" value={money(-p.toPay)} />
                ) : (
                    <Tile tone="amber" label="Left to pay" value={money(p.toPay)} note={p.bills ? "Bills − paid" : "Attendance − paid"} />
                )}
            </div>
            <BillForm key={editing?.id ?? "new"} projectId={projectId} name={name} editing={editing} days={days} onDone={() => setEditing(null)} />
            {d.isError ? (
                <p role="alert" className="text-sm text-[#B3261E]">{describeError(d.error)}</p>
            ) : !d.data ? (
                <p className="text-sm text-[#8C8C8C]">Loading…</p>
            ) : d.data.bills.length === 0 && d.data.payments.length === 0 ? (
                <p className="text-sm text-[#666666]">No bills yet. Add one above: From, To and the amount for those dates.</p>
            ) : (
                <>
                    <div className="overflow-hidden rounded-xl border border-[#E8E8E6] bg-white">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#F7F7F5] text-xs text-[#666666]">
                                    <th scope="col" className="px-4 py-2 text-left font-medium">Period</th>
                                    <th scope="col" className="w-28 px-2 py-2 text-right font-medium">Bill</th>
                                    <th scope="col" className="w-28 px-2 py-2 text-right font-medium">Paid</th>
                                    <th scope="col" className="w-28 px-2 py-2 text-right font-medium">Left</th>
                                    <th scope="col" className="w-44 pr-3"><span className="sr-only">Pay, change</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFEFED]">
                                {d.data.bills.map((b) => (
                                    <BillRows
                                        key={b.id}
                                        projectId={projectId}
                                        b={b}
                                        open={paying === b.id}
                                        editing={editing?.id === b.id}
                                        onPay={() => setPaying((x) => (x === b.id ? null : b.id))}
                                        onEdit={() => setEditing(b)}
                                        onArchive={() => archiveBill.mutate({ id: b.id, archive: true })}
                                        onArchivePay={(id) => archivePay.mutate({ id, archive: true })}
                                    />
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-[#EFEFED] bg-[#F7F7F5]">
                                    <td className="px-4 py-2 font-semibold">Total</td>
                                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{money(billed)}</td>
                                    <td className="px-2 py-2 text-right font-semibold tabular-nums text-[#0F6E56]">{money(paid)}</td>
                                    <td className="px-2 py-2 text-right font-semibold tabular-nums text-[#854F0B]">{money(Math.max(0, billed - paid))}</td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    {d.data.payments.length > 0 && <OtherPayments payments={d.data.payments} onArchive={(id) => archivePay.mutate({ id, archive: true })} />}
                </>
            )}
            {(archiveBill.isError || archivePay.isError) && <p role="alert" className="text-sm text-[#B3261E]">{describeError(archiveBill.error ?? archivePay.error)}</p>}
        </div>
    );
}

function BillRows({
    projectId,
    b,
    open,
    editing,
    onPay,
    onEdit,
    onArchive,
    onArchivePay,
}: {
    projectId: string;
    b: Bill;
    open: boolean;
    editing: boolean;
    onPay: () => void;
    onEdit: () => void;
    onArchive: () => void;
    onArchivePay: (id: string) => void;
}) {
    const [changing, setChanging] = useState<BillPay | null>(null);
    const state = b.left <= 0 ? { text: "Paid", cls: "bg-[#EAF3DE] text-[#3B6D11]" } : b.paid > 0 ? { text: "Part paid", cls: "bg-[#FAEEDA] text-[#854F0B]" } : null;
    return (
        <>
            <tr className={editing ? "bg-[#E6F1FB]" : open ? "bg-[#FAFAF9]" : ""}>
                <td className="px-4 py-2.5">
                    {periodText(b.from, b.to)}
                    {state && <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${state.cls}`}>{state.text}</span>}
                    <span className="block text-xs text-[#8C8C8C]">
                        {b.payments.length} {b.payments.length === 1 ? "payment" : "payments"}
                        {b.note ? ` · ${b.note}` : ""}
                    </span>
                </td>
                <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{money(b.amount)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-[#0F6E56]">{money(b.paid)}</td>
                <td className={`px-2 py-2.5 text-right font-semibold tabular-nums ${b.left < 0 ? "text-[#0F6E56]" : "text-[#854F0B]"}`}>
                    {b.left > 0 ? money(b.left) : b.left < 0 ? `Ahead ${money(-b.left)}` : "–"}
                </td>
                <td className="whitespace-nowrap pr-3 text-right">
                    <span className="inline-flex items-center gap-1">
                        <button type="button" onClick={onPay} aria-expanded={open} className={`${mono.secondary} min-h-9 px-3 text-sm ${open ? "border-[#111111] bg-[#F7F7F5]" : ""}`}>
                            <FiCreditCard aria-hidden /> Pay {open ? <FiChevronUp aria-hidden /> : <FiChevronDown aria-hidden />}
                        </button>
                        <button type="button" onClick={onEdit} className={mono.icon} aria-label="Change this bill" title="Change">
                            <FiEdit2 aria-hidden />
                        </button>
                        <button type="button" onClick={onArchive} className={mono.icon} aria-label="Archive this bill" title="Archive (with its payments)">
                            <FiArchive aria-hidden />
                        </button>
                    </span>
                </td>
            </tr>
            {open && (
                <tr>
                    <td colSpan={5} className="bg-[#F7F7F5] px-4 py-3">
                        <PayForm key={changing?.id ?? "new"} projectId={projectId} bill={b} editing={changing} onDone={() => setChanging(null)} />
                        {b.payments.length === 0 ? (
                            <p className="mt-2 text-sm text-[#666666]">Nothing paid on this bill yet.</p>
                        ) : (
                            <table className="mt-2 w-full rounded-lg border border-[#E8E8E6] bg-white text-sm">
                                <thead>
                                    <tr className="text-xs text-[#666666]">
                                        <th scope="col" className="px-3 py-1.5 text-left font-medium">Date paid</th>
                                        <th scope="col" className="px-2 py-1.5 text-right font-medium">Amount</th>
                                        <th scope="col" className="w-24 pr-2"><span className="sr-only">Change</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#EFEFED]">
                                    {b.payments.map((x) => (
                                        <tr key={x.id} className={changing?.id === x.id ? "bg-[#E6F1FB]" : ""}>
                                            <td className="px-3 py-1.5">
                                                {longDay(x.date)}
                                                {x.remark && <span className="block text-xs text-[#8C8C8C]">{x.remark}</span>}
                                            </td>
                                            <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{money(x.amount)}</td>
                                            <td className="pr-2 text-right">
                                                <button type="button" onClick={() => setChanging(x)} className={mono.icon} aria-label="Change this payment" title="Change">
                                                    <FiEdit2 aria-hidden />
                                                </button>
                                                <button type="button" onClick={() => onArchivePay(x.id)} className={mono.icon} aria-label="Archive this payment" title="Archive">
                                                    <FiArchive aria-hidden />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <p className="mt-2 text-xs text-[#666666]">
                            Left on this bill: <b className="tabular-nums text-[#854F0B]">{b.left > 0 ? money(b.left) : "nothing"}</b>
                        </p>
                    </td>
                </tr>
            )}
        </>
    );
}

/** Older payments that were not made against a bill */
function OtherPayments({ payments, onArchive }: { payments: PersonDetail["payments"]; onArchive: (id: string) => void }) {
    return (
        <div className="overflow-hidden rounded-xl border border-[#E8E8E6] bg-white">
            <p className="bg-[#F7F7F5] px-4 py-2 text-xs font-medium text-[#666666]">Payments not against a bill</p>
            <table className="w-full text-sm">
                <tbody className="divide-y divide-[#EFEFED]">
                    {payments.map((x) => (
                        <tr key={x.id}>
                            <td className="px-4 py-2">
                                Paid on {longDay(x.date)}
                                {x.remark && <span className="block text-xs text-[#8C8C8C]">{x.remark}</span>}
                            </td>
                            <td className="px-2 py-2 text-right font-semibold tabular-nums">{money(x.amount)}</td>
                            <td className="w-16 pr-3 text-right">
                                <button type="button" onClick={() => onArchive(x.id)} className={mono.icon} aria-label="Archive this payment" title="Archive">
                                    <FiArchive aria-hidden />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Pay against a bill: the date and the amount (the box suggests what is left) */
function PayForm({ projectId, bill, editing, onDone }: { projectId: string; bill: Bill; editing: BillPay | null; onDone: () => void }) {
    const save = useSaveBillPayment(projectId);
    const [date, setDate] = useState(editing?.date ?? todayYmd());
    const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
    const [remark, setRemark] = useState(editing?.remark ?? "");
    const [problem, setProblem] = useState<string | null>(null);
    const submit = () => {
        if (num(amount) <= 0) {
            setProblem("Enter the amount paid.");
            return;
        }
        save.mutate(
            { id: editing?.id, body: { billId: bill.id, date, amount: num(amount), remark: remark.trim() } },
            {
                onSuccess: () => {
                    setAmount("");
                    setRemark("");
                    setProblem(null);
                    onDone();
                },
            },
        );
    };
    return (
        <div>
            <div className="grid gap-2.5 sm:grid-cols-[11rem_10rem_minmax(0,1fr)_auto] sm:items-end">
                <div className={label}>
                    <span>Date paid</span>
                    <DatePick value={date} onChange={setDate} label="Date paid" size="sm" />
                </div>
                <label className={label}>
                    Amount
                    <input
                        value={amount}
                        onChange={(e) => {
                            setAmount(e.target.value);
                            setProblem(null);
                        }}
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === "Enter") submit();
                        }}
                        autoFocus
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        placeholder={bill.left > 0 ? String(bill.left) : "₹ 0"}
                        className={`${field} text-right tabular-nums`}
                    />
                </label>
                <label className={label}>
                    Note (optional)
                    <input value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={500} className={field} />
                </label>
                <span className="flex gap-1.5">
                    <button type="button" onClick={submit} disabled={save.isPending} className={`${mono.primary} min-h-10 text-sm`}>
                        {save.isPending ? "Saving…" : editing ? "Save" : "Add payment"}
                    </button>
                    {editing && (
                        <button type="button" onClick={onDone} className={mono.icon} aria-label="Cancel" title="Cancel">
                            <FiX aria-hidden />
                        </button>
                    )}
                </span>
            </div>
            {(problem || save.isError) && <p role="alert" className="mt-1.5 text-sm text-[#B3261E]">{problem ?? describeError(save.error)}</p>}
        </div>
    );
}

/**
 * A bill: From, To and the amount for those dates. Under it, the attendance marked in those dates, with "Use this".
 * With `withName` (Add person) it also asks the name, and saving it puts that person on the list.
 */
function BillForm({
    projectId,
    name,
    withName,
    editing,
    days = [],
    onDone,
}: {
    projectId: string;
    name?: string;
    withName?: boolean;
    editing?: Bill | null;
    days?: PersonDetail["days"];
    onDone: () => void;
}) {
    const save = useSaveBill(projectId);
    const today = todayYmd();
    const [who, setWho] = useState("");
    const [from, setFrom] = useState(editing?.from ?? mondayOf(today));
    const [to, setTo] = useState(editing?.to ?? today);
    const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
    const [note, setNote] = useState(editing?.note ?? "");
    const [problem, setProblem] = useState<string | null>(null);
    // Worked out, not stored: the attendance marked for this person in From – To
    const marked = r2(days.filter((x) => x.date >= from && x.date <= to).reduce((s, x) => s + x.amount, 0));

    const submit = () => {
        const person = (withName ? who : (name ?? "")).trim();
        if (!person) {
            setProblem("Enter the name.");
            return;
        }
        if (from > to) {
            setProblem("From must be on or before To.");
            return;
        }
        if (num(amount) <= 0) {
            setProblem("Enter the bill amount.");
            return;
        }
        save.mutate(
            { id: editing?.id, body: { name: person, from, to, amount: num(amount), note: note.trim() } },
            {
                onSuccess: () => {
                    setAmount("");
                    setWho("");
                    setNote("");
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
        <div className="rounded-xl border border-[#E8E8E6] bg-white p-3">
            <p className="mb-2 text-sm font-semibold text-[#111111]">{editing ? "Change bill" : withName ? "Add person with a bill" : "Add bill"}</p>
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
                    <DatePick
                        value={from}
                        onChange={(v) => {
                            setFrom(v);
                            setProblem(null);
                        }}
                        label="From"
                    />
                </div>
                <div className={label}>
                    <span>To</span>
                    <DatePick
                        value={to}
                        onChange={(v) => {
                            setTo(v);
                            setProblem(null);
                        }}
                        label="To"
                    />
                </div>
                <label className={label}>
                    Bill amount (for these dates)
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
                        {save.isPending ? "Saving…" : editing ? "Save" : "Add bill"}
                    </button>
                    {(editing || withName) && (
                        <button type="button" onClick={onDone} className={mono.icon} aria-label="Cancel" title="Cancel">
                            <FiX aria-hidden />
                        </button>
                    )}
                </span>
            </div>
            {!withName && (
                <p className="mt-2 text-xs text-[#666666]">
                    Attendance marked in these dates: <b className="tabular-nums text-[#111111]">{money(marked)}</b>
                    {marked > 0 && (
                        <>
                            {" · "}
                            <button type="button" onClick={() => setAmount(String(marked))} className="font-medium text-[#185FA5] underline underline-offset-2">
                                Use this
                            </button>
                        </>
                    )}
                </p>
            )}
            {(problem || save.isError) && (
                <p role="alert" className="mt-2 text-sm text-[#B3261E]">
                    {problem ?? describeError(save.error)}
                </p>
            )}
        </div>
    );
}