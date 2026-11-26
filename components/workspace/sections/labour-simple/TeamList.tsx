"use client";

import { useState, type KeyboardEvent } from "react";
import { FiArchive, FiChevronDown, FiChevronUp, FiClipboard, FiCreditCard, FiEdit2, FiPlus, FiX } from "react-icons/fi";
import { useArchiveBill, useArchivePayment, useArchivePerson, usePerson, useSaveBill, useSaveTeamPayment, useTeam } from "@/hooks/useLabourSimple";
import { describeError } from "@/lib/api";
import type { Bill, BillPay, PersonDetail, TeamRow } from "@/lib/labour/simple";
import { DatePick } from "./DatePick";
import { Tile } from "./Tile";
import { field, label, longDay, mondayOf, money, mono, num, r2, shortDay, todayYmd, weekday } from "./shared";

/**
 * Team heads and individuals, one row each, like materials and their deliveries:
 *   Attendance amount · Billed · Paid · To pay (bills minus payments; with no bills, the attendance amount minus payments)
 * Bills ▾ opens their bills (each a period's amount, From – To) and their payments (the day paid), side by side;
 * payments count against all bills together, and a statement shows what was left after each.
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
            <div className="flex flex-wrap items-center gap-2 px-4 py-4 sm:px-5">
                <h3 className="mr-auto text-[15px] font-semibold text-[#111111]">Team heads and individuals</h3>
                <button type="button" onClick={onMarkNew} className={`${mono.primary} min-h-10 text-sm`}>
                    <FiClipboard aria-hidden /> Mark attendance
                </button>
                <button type="button" onClick={() => setAdding((a) => !a)} className={`${mono.secondary} min-h-10 text-sm`}>
                    <FiPlus aria-hidden /> Add person
                </button>
            </div>
            {adding && (
                <div className="mx-3 mb-4 sm:mx-5">
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
                <div className="md:overflow-x-auto">
                    {/* phones: each person is a small card (labels above the amounts); wider screens: the table */}
                    <table className="block w-full text-sm md:table md:min-w-216">
                        <thead className="hidden md:table-header-group">
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
                        <tbody className="block md:table-row-group">
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
                        <tfoot className="block md:table-footer-group">
                            <tr className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#EFEFED] bg-[#F7F7F5] px-4 py-3 md:table-row md:p-0">
                                <td className="col-span-2 p-0 font-semibold md:px-5 md:py-2.5">Total</td>
                                <td className="p-0 font-semibold tabular-nums md:px-2 md:py-2.5 md:text-right">
                                    <span className="block text-[11px] font-normal text-[#8C8C8C] md:hidden">Attendance amount</span>
                                    {money(list.data.totals.earned)}
                                </td>
                                <td className="p-0 font-semibold tabular-nums text-[#185FA5] md:px-2 md:py-2.5 md:text-right">
                                    <span className="block text-[11px] font-normal text-[#8C8C8C] md:hidden">Billed</span>
                                    {money(list.data.totals.billed)}
                                </td>
                                <td className="p-0 font-semibold tabular-nums text-[#0F6E56] md:px-2 md:py-2.5 md:text-right">
                                    <span className="block text-[11px] font-normal text-[#8C8C8C] md:hidden">Paid</span>
                                    {money(list.data.totals.paid)}
                                </td>
                                <td className="p-0 font-semibold tabular-nums text-[#854F0B] md:px-2 md:py-2.5 md:text-right">
                                    <span className="block text-[11px] font-normal text-[#8C8C8C] md:hidden">To pay</span>
                                    {money(list.data.totals.toPay)}
                                    {list.data.totals.ahead > 0 && <span className="block text-xs font-medium text-[#0F6E56]">Paid ahead {money(list.data.totals.ahead)}</span>}
                                </td>
                                <td colSpan={2} className="hidden md:table-cell" />
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
            className={`${mono.secondary} min-h-10 flex-1 justify-center px-3 text-sm md:min-h-9 md:flex-none ${here === w ? "border-[#111111] bg-[#F7F7F5]" : ""}`}
        >
            <Icon aria-hidden /> {text} {here === w ? <FiChevronUp aria-hidden /> : <FiChevronDown aria-hidden />}
        </button>
    );
    return (
        <>
            <tr className={`grid grid-cols-4 items-start gap-x-3 gap-y-2 border-t border-[#EFEFED] px-4 py-3 md:table-row md:p-0 ${here ? "bg-[#FAFAF9]" : ""}`}>
                <td className="order-1 col-span-3 p-0 md:order-0 md:px-5 md:py-3">
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
                <td className="order-3 col-span-2 p-0 tabular-nums md:order-0 md:px-2 md:py-3 md:text-right">
                    <span className="block text-[11px] font-normal text-[#8C8C8C] md:hidden">Attendance amount</span>
                    {p.kind === null ? "–" : money(p.earned)}
                </td>
                <td className="order-3 col-span-2 p-0 tabular-nums text-[#185FA5] md:order-0 md:px-2 md:py-3 md:text-right">
                    <span className="block text-[11px] font-normal text-[#8C8C8C] md:hidden">Billed</span>
                    {p.bills ? money(p.billed) : "–"}
                </td>
                <td className="order-3 col-span-2 p-0 tabular-nums text-[#0F6E56] md:order-0 md:px-2 md:py-3 md:text-right">
                    <span className="block text-[11px] font-normal text-[#8C8C8C] md:hidden">Paid</span>
                    {money(p.paid)}
                </td>
                <td className={`order-3 col-span-2 p-0 font-semibold tabular-nums md:order-0 md:px-2 md:py-3 md:text-right ${due.tone}`}>
                    <span className="block text-[11px] font-normal text-[#8C8C8C] md:hidden">To pay</span>
                    {due.text}
                </td>
                <td className="order-4 col-span-4 p-0 md:order-0 md:px-2 md:py-3 md:text-right">
                    <span className="flex gap-1.5 md:inline-flex">
                        {btn("pays", "Bills", FiCreditCard)}
                        {btn("days", "Attendance", FiClipboard)}
                    </span>
                </td>
                <td className="order-2 p-0 text-right md:order-0 md:pr-4">
                    <button type="button" onClick={onArchive} disabled={archiving} className={mono.icon} aria-label={`Archive ${p.name}`} title="Archive (with all their days, bills and payments)">
                        <FiArchive aria-hidden />
                    </button>
                </td>
            </tr>
            {here && (
                <tr className="block md:table-row">
                    <td colSpan={7} className="block bg-[#FAFAF9] px-3 pb-4 pt-1 md:table-cell md:px-5">
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
                                <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">Labour</th>
                                <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">Hours</th>
                                <th scope="col" className="px-2 py-2 text-right font-medium">Amount</th>
                                <th scope="col" className="hidden w-20 pr-4 sm:table-cell"><span className="sr-only">Open</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFEFED]">
                            {d.data.days.map((x, i) => (
                                <tr key={`${x.date}|${x.taskId ?? ""}|${i}`} onClick={() => onOpenDay({ date: x.date, taskId: x.taskId })} className="cursor-pointer hover:bg-[#FAFAF9]">
                                    <td className="whitespace-nowrap px-3 py-2 sm:px-4">
                                        {weekday(x.date)} {longDay(x.date)}
                                    </td>
                                    <td className="px-2 py-2">
                                        {x.work}
                                        <span className="block text-xs text-[#8C8C8C] sm:hidden">
                                            {x.workers} labour{x.hours ? ` · ${x.hours} h` : ""}
                                            {x.otHours ? ` + ${x.otHours} OT` : ""}
                                        </span>
                                    </td>
                                    <td className="hidden px-2 py-2 text-right tabular-nums sm:table-cell">{x.workers}</td>
                                    <td className="hidden px-2 py-2 text-right tabular-nums sm:table-cell">
                                        {x.hours || "–"}
                                        {x.otHours ? ` + ${x.otHours} OT` : ""}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold tabular-nums sm:px-2">{money(x.amount)}</td>
                                    <td className="hidden pr-4 text-right text-sm font-medium text-[#185FA5] sm:table-cell">Open ›</td>
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

/**
 * A person's bills and payments, two lists side by side:
 *   Bills = the amount for each period (From – To). Payments = the day paid and the amount.
 * Payments count against all bills together: Left to pay = total billed − total paid.
 * Below, the Statement puts both in date order with what was left after each.
 */
function BillsPanel({ projectId, p }: { projectId: string; p: TeamRow }) {
    const name = p.name;
    const d = usePerson(projectId, name);
    const archiveBill = useArchiveBill(projectId);
    const archivePay = useArchivePayment(projectId);
    const [editing, setEditing] = useState<Bill | null>(null);
    const [changing, setChanging] = useState<BillPay | null>(null);

    const days = d.data?.days ?? [];
    const bills = [...(d.data?.bills ?? [])].sort((a, b) => (a.to < b.to ? 1 : a.to > b.to ? -1 : 0));
    const pays = [...(d.data?.payments ?? [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const billed = r2(bills.reduce((s, b) => s + b.amount, 0));
    const paid = r2(pays.reduce((s, x) => s + x.amount, 0));

    return (
        <div className="space-y-3">
            {/* The person's figures, the same as their row: Left to pay = total billed − total paid (no bills: attendance amount − paid) */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Tile tone="gray" label="Attendance amount" value={money(p.earned)} />
                <Tile tone="blue" label="Total billed" value={money(p.billed)} note={`${p.bills} ${p.bills === 1 ? "bill" : "bills"}`} />
                <Tile tone="green" label="Total paid" value={money(p.paid)} note={`${pays.length} ${pays.length === 1 ? "payment" : "payments"}`} />
                {p.toPay < 0 ? (
                    <Tile tone="lime" label="Paid ahead" value={money(-p.toPay)} />
                ) : (
                    <Tile tone="amber" label="Left to pay" value={money(p.toPay)} note={p.bills ? "Total billed − total paid" : "Attendance − paid"} />
                )}
            </div>

            {d.isError && <p role="alert" className="text-sm text-[#B3261E]">{describeError(d.error)}</p>}
            {(archiveBill.isError || archivePay.isError) && <p role="alert" className="text-sm text-[#B3261E]">{describeError(archiveBill.error ?? archivePay.error)}</p>}

            <div className="grid gap-3 lg:grid-cols-2">
                {/* Bills: the amount for each period */}
                <div className="overflow-hidden rounded-xl border border-[#E8E8E6] bg-white">
                    <p className="flex items-center justify-between bg-[#F7F7F5] px-4 py-2 text-sm font-semibold text-[#111111]">
                        Bills <span className="hidden text-xs font-normal text-[#666666] sm:inline">amount for each period</span>
                        <span className="tabular-nums text-[#185FA5]">{money(billed)}</span>
                    </p>
                    <BillForm key={editing?.id ?? "new"} projectId={projectId} name={name} editing={editing} days={days} onDone={() => setEditing(null)} />
                    {!d.data ? (
                        <p className="px-4 py-3 text-sm text-[#8C8C8C]">Loading…</p>
                    ) : bills.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-[#666666]">No bills yet. Add one above: From, To and the amount.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-[#EFEFED] border-t border-[#EFEFED]">
                                {bills.map((b) => (
                                    <tr key={b.id} className={editing?.id === b.id ? "bg-[#E6F1FB]" : ""}>
                                        <td className="px-4 py-2">
                                            {periodText(b.from, b.to)}
                                            {b.note && <span className="block text-xs text-[#8C8C8C]">{b.note}</span>}
                                        </td>
                                        <td className="px-2 py-2 text-right font-semibold tabular-nums">{money(b.amount)}</td>
                                        <td className="w-20 whitespace-nowrap pr-2 text-right">
                                            <button type="button" onClick={() => setEditing(b)} className={mono.icon} aria-label="Change this bill" title="Change">
                                                <FiEdit2 aria-hidden />
                                            </button>
                                            <button type="button" onClick={() => archiveBill.mutate({ id: b.id, archive: true })} className={mono.icon} aria-label="Archive this bill" title="Archive">
                                                <FiArchive aria-hidden />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Payments: the day paid and the amount, against the total */}
                <div className="overflow-hidden rounded-xl border border-[#E8E8E6] bg-white">
                    <p className="flex items-center justify-between bg-[#F7F7F5] px-4 py-2 text-sm font-semibold text-[#111111]">
                        Payments <span className="hidden text-xs font-normal text-[#666666] sm:inline">day you paid</span>
                        <span className="tabular-nums text-[#0F6E56]">{money(paid)}</span>
                    </p>
                    <PayForm key={changing?.id ?? "new"} projectId={projectId} name={name} left={p.toPay} editing={changing} onDone={() => setChanging(null)} />
                    {!d.data ? (
                        <p className="px-4 py-3 text-sm text-[#8C8C8C]">Loading…</p>
                    ) : pays.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-[#666666]">Nothing paid yet.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-[#EFEFED] border-t border-[#EFEFED]">
                                {pays.map((x) => (
                                    <tr key={x.id} className={changing?.id === x.id ? "bg-[#E6F1FB]" : ""}>
                                        <td className="px-4 py-2">
                                            {weekday(x.date)} {longDay(x.date)}
                                            {x.remark && <span className="block text-xs text-[#8C8C8C]">{x.remark}</span>}
                                        </td>
                                        <td className="px-2 py-2 text-right font-semibold tabular-nums">{money(x.amount)}</td>
                                        <td className="w-20 whitespace-nowrap pr-2 text-right">
                                            <button type="button" onClick={() => setChanging(x)} className={mono.icon} aria-label="Change this payment" title="Change">
                                                <FiEdit2 aria-hidden />
                                            </button>
                                            <button type="button" onClick={() => archivePay.mutate({ id: x.id, archive: true })} className={mono.icon} aria-label="Archive this payment" title="Archive">
                                                <FiArchive aria-hidden />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {d.data && bills.length + pays.length > 0 && <Statement bills={bills} pays={pays} />}
        </div>
    );
}

/** Bills (on their To date) and payments by date, newest first, with what was left after each */
function Statement({ bills, pays }: { bills: Bill[]; pays: BillPay[] }) {
    const events = [
        ...bills.map((b) => ({ key: `b${b.id}`, date: b.to, what: `Bill ${periodText(b.from, b.to)}`, bill: b.amount, paid: 0 })),
        ...pays.map((x) => ({ key: `p${x.id}`, date: x.date, what: x.remark ? `Payment · ${x.remark}` : "Payment", bill: 0, paid: x.amount })),
    ].sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.bill ? -1 : 1)); // same day: the bill first
    // What was left after each line: the line before it, plus this bill, minus this payment
    const rows = events
        .reduce<((typeof events)[number] & { left: number })[]>((acc, e) => [...acc, { ...e, left: r2((acc.length ? acc[acc.length - 1].left : 0) + e.bill - e.paid) }], [])
        .reverse();
    return (
        <div className="overflow-hidden rounded-xl border border-[#E8E8E6] bg-white">
            <p className="bg-[#F7F7F5] px-4 py-2 text-sm font-semibold text-[#111111]">
                Statement <span className="hidden text-xs font-normal text-[#666666] sm:inline">· bills and payments by date, with what was left after each</span>
            </p>
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-xs text-[#666666]">
                        <th scope="col" className="px-3 py-2 text-left font-medium sm:px-4">Date</th>
                        <th scope="col" className="px-2 py-2 text-left font-medium">What</th>
                        <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">Bill</th>
                        <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">Paid</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium sm:px-4">Left</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEFED]">
                    {rows.map((r) => (
                        <tr key={r.key}>
                            <td className="whitespace-nowrap px-3 py-2 sm:px-4">{shortDay(r.date)}</td>
                            <td className="px-2 py-2">
                                {r.what}
                                <span className={`block text-xs tabular-nums sm:hidden ${r.bill ? "text-[#185FA5]" : "text-[#0F6E56]"}`}>{r.bill ? `Bill ${money(r.bill)}` : `Paid ${money(r.paid)}`}</span>
                            </td>
                            <td className="hidden px-2 py-2 text-right tabular-nums sm:table-cell">{r.bill ? money(r.bill) : ""}</td>
                            <td className="hidden px-2 py-2 text-right tabular-nums text-[#0F6E56] sm:table-cell">{r.paid ? money(r.paid) : ""}</td>
                            <td className={`whitespace-nowrap px-3 py-2 sm:px-4 text-right font-semibold tabular-nums ${r.left < 0 ? "text-[#0F6E56]" : "text-[#854F0B]"}`}>
                                {r.left < 0 ? `Ahead ${money(-r.left)}` : money(r.left)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** A payment: the date paid and the amount (the box suggests what is left to pay) */
function PayForm({ projectId, name, left, editing, onDone }: { projectId: string; name: string; left: number; editing: BillPay | null; onDone: () => void }) {
    const save = useSaveTeamPayment(projectId);
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
            { id: editing?.id, body: { name, date, amount: num(amount), remark: remark.trim() } },
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
        <div className="px-4 py-3">
            {editing && <p className="mb-2 text-xs font-semibold text-[#185FA5]">Change payment</p>}
            <div className="grid grid-cols-2 gap-2.5 sm:items-end">
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
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        placeholder={left > 0 ? String(left) : "₹ 0"}
                        className={`${field} text-right tabular-nums`}
                    />
                </label>
                <label className={`${label} col-span-2`}>
                    Note (optional)
                    <input value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={500} className={field} />
                </label>
                <span className="col-span-2 flex gap-1.5">
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
        <div className={withName ? "rounded-xl border border-[#E8E8E6] bg-white p-3" : "px-4 py-3"}>
            {(editing || withName) && <p className="mb-2 text-xs font-semibold text-[#185FA5]">{editing ? "Change bill" : "Add person with a bill"}</p>}
            <div className={`grid gap-2.5 sm:items-end ${withName ? "sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_11rem_11rem_minmax(0,1fr)_auto]" : "grid-cols-2"}`}>
                {withName && (
                    <label className={`${label} sm:col-span-2 lg:col-span-1`}>
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
                    Bill amount
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
                <span className={`flex gap-1.5 ${withName ? "" : "items-end"}`}>
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