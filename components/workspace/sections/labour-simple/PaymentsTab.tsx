"use client";

import { useRef, useState } from "react";
import { FiCheck, FiChevronDown, FiEdit2, FiFileText, FiPaperclip, FiPlus, FiPrinter, FiTrash2, FiX } from "react-icons/fi";
import { ConfirmDeleteDialog } from "@/components/utilites/Confirmdeletedialog";
import { useAddPayment, usePeople, useRemovePayment, useStatement, useUpdatePayment } from "@/hooks/useLabourSimple";
import { describeError } from "@/lib/api";
import type { Payment, Statement } from "@/lib/labour/simple";
import { SectionError, SectionSkeleton } from "../../ui";
import { PickList } from "./PickList";
import { Tile } from "./Tile";
import { field, label, longDay, money, monthStart, mono, num, shortDay, todayYmd } from "./shared";

/**
 * Payments: one person between two dates. What they earned (attendance on every work, and contract work), what was
 * paid to them, and what is still to pay; every payment can be added, changed or deleted, with a receipt photo.
 */
export function PaymentsTab({ projectId, initialPerson }: { projectId: string; initialPerson: string | null }) {
    const people = usePeople(projectId);
    const today = todayYmd();
    // The person picked here; until one is picked: the one "Pay" came from, else the first on the list (worked out, not stored)
    const [picked, setPerson] = useState(initialPerson ?? "");
    const person = picked || people.data?.everyone[0] || "";
    const [from, setFrom] = useState(monthStart(today));
    const [to, setTo] = useState(today);
    const statement = useStatement(projectId, person, from, to);

    if (people.isPending) return <SectionSkeleton />;
    if (people.isError) return <SectionError error={people.error} onRetry={() => void people.refetch()} />;
    const everyone = person && !people.data.everyone.some((p) => p.toLowerCase() === person.toLowerCase()) ? [person, ...people.data.everyone] : people.data.everyone;

    return (
        <div className="space-y-4">
            <div className={`${mono.card} flex flex-wrap items-end gap-3 px-5 py-4`}>
                <div className={label}>
                    <span>Person</span>
                    <PickList value={person} options={everyone} onChange={setPerson} label="Person" placeholder="Nobody yet" className="w-56" />
                </div>
                <label className={label}>
                    From
                    <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className={`${field} w-40`} />
                </label>
                <label className={label}>
                    To
                    <input type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} className={`${field} w-40`} />
                </label>
                <div className="flex gap-1.5">
                    {[
                        ["This month", monthStart(today), today],
                        ["All dates", "2000-01-01", today],
                    ].map(([text, f, t]) => (
                        <button key={text} type="button" onClick={() => (setFrom(f!), setTo(t!))} className={`${mono.secondary} min-h-10 px-3 text-sm`}>
                            {text}
                        </button>
                    ))}
                </div>
            </div>

            {!person ? (
                <p className={`${mono.card} px-5 py-8 text-center text-sm text-[#666666]`}>Mark attendance or add contract work first; the people appear here.</p>
            ) : statement.isError ? (
                <SectionError error={statement.error} onRetry={() => void statement.refetch()} />
            ) : !statement.data ? (
                <SectionSkeleton />
            ) : (
                <PersonStatement projectId={projectId} s={statement.data} />
            )}
        </div>
    );
}

function PersonStatement({ projectId, s }: { projectId: string; s: Statement }) {
    const [adding, setAdding] = useState(false);
    const [deleting, setDeleting] = useState<Payment | null>(null);
    const remove = useRemovePayment(projectId);
    const extra = s.balance < 0;

    return (
        <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Tile tone="blue" label="Earned in these dates" value={money(s.earned)} note={`${s.days.length} days${s.contract.length ? ` · ${s.contract.length} contract work` : ""}`} />
                <Tile tone="green" label="Paid in these dates" value={money(s.paid)} note={`${s.payments.length} ${s.payments.length === 1 ? "payment" : "payments"}`} />
                <Tile tone={extra ? "lime" : "amber"} label={extra ? "Paid extra" : "Still to pay"} value={money(Math.abs(s.balance))} note={`${shortDay(s.from)} – ${shortDay(s.to)}`} />
            </div>
            <p className="text-xs text-[#666666]">
                All dates together for {s.person}: earned {money(s.allTime.earned)} · paid {money(s.allTime.paid)} ·{" "}
                <span className={`font-semibold ${s.allTime.balance > 0 ? "text-[#854F0B]" : "text-[#3B6D11]"}`}>
                    {s.allTime.balance > 0 ? `${money(s.allTime.balance)} still to pay` : s.allTime.balance < 0 ? `${money(-s.allTime.balance)} paid extra` : "settled"}
                </span>
            </p>

            <section className={`${mono.card} overflow-hidden`}>
                <div className="flex flex-wrap items-center gap-2 px-5 py-4">
                    <h3 className="flex-1 text-[15px] font-semibold text-[#111111]">Payments to {s.person}</h3>
                    <button type="button" onClick={() => printStatement(s)} className={`${mono.secondary} min-h-10 text-sm`}>
                        <FiPrinter aria-hidden /> Print statement
                    </button>
                    {!adding && (
                        <button type="button" onClick={() => setAdding(true)} className={`${mono.primary} min-h-10 text-sm`}>
                            <FiPlus aria-hidden /> Add payment
                        </button>
                    )}
                </div>
                {adding && <AddPayment projectId={projectId} person={s.person} suggest={Math.max(0, s.allTime.balance)} onDone={() => setAdding(false)} />}

                {s.payments.length === 0 ? (
                    <p className="border-t border-[#EFEFED] px-5 py-6 text-center text-sm text-[#666666]">No payments in these dates.</p>
                ) : (
                    <ul className="divide-y divide-[#EFEFED] border-t border-[#EFEFED]">
                        {s.payments.map((p) => (
                            <PaymentRow key={p.id} projectId={projectId} p={p} onDelete={() => setDeleting(p)} />
                        ))}
                        <li className="flex justify-between bg-[#F7F7F5] px-5 py-2.5 text-sm font-semibold">
                            <span>Total paid</span>
                            <span className="tabular-nums text-[#085041]">{money(s.paid)}</span>
                        </li>
                    </ul>
                )}
                {remove.isError && <p role="alert" className="px-5 pb-3 text-sm text-[#B3261E]">{describeError(remove.error)}</p>}
            </section>

            <details className={`${mono.card} group overflow-hidden`}>
                <summary className={`flex min-h-12 cursor-pointer list-none items-center gap-2 px-5 text-sm font-semibold text-[#111111] ${mono.ring}`}>
                    <FiChevronDown aria-hidden className="transition-transform group-open:rotate-180" /> What {s.person} earned in these dates
                    <span className="ml-auto tabular-nums text-[#0C447C]">{money(s.earned)}</span>
                </summary>
                <div className="overflow-x-auto border-t border-[#EFEFED]">
                    <table className="w-full min-w-136 text-sm">
                        <tbody className="divide-y divide-[#EFEFED]">
                            {s.days.map((d, i) => (
                                <tr key={`d${i}`}>
                                    <td className="whitespace-nowrap px-5 py-2">{longDay(d.date)}</td>
                                    <td className="px-2 py-2">{d.work}</td>
                                    <td className="px-2 py-2 text-right text-[#666666]">
                                        {d.hours ? `${d.hours} h` : ""}
                                        {d.otHours ? ` + ${d.otHours} OT` : ""}
                                    </td>
                                    <td className="px-5 py-2 text-right font-semibold tabular-nums">{money(d.amount)}</td>
                                </tr>
                            ))}
                            {s.contract.map((c, i) => (
                                <tr key={`c${i}`}>
                                    <td className="whitespace-nowrap px-5 py-2">{longDay(c.date)}</td>
                                    <td className="px-2 py-2">{c.work} <span className="text-xs text-[#8C8C8C]">(contract)</span></td>
                                    <td className="px-2 py-2 text-right text-[#666666]">
                                        {c.quantity.toLocaleString("en-IN")} {c.unit} × {money(c.rate)}
                                    </td>
                                    <td className="px-5 py-2 text-right font-semibold tabular-nums">{money(c.amount)}</td>
                                </tr>
                            ))}
                            {s.days.length + s.contract.length === 0 && (
                                <tr>
                                    <td className="px-5 py-5 text-center text-[#666666]">Nothing earned in these dates.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </details>

            <ConfirmDeleteDialog
                open={deleting !== null}
                onClose={() => {
                    setDeleting(null);
                    remove.reset();
                }}
                title="Delete payment?"
                itemName={deleting ? `${money(deleting.amount)} on ${shortDay(deleting.date)}` : undefined}
                pending={remove.isPending}
                error={remove.error ? describeError(remove.error) : null}
                onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
            />
        </>
    );
}

function AddPayment({ projectId, person, suggest, onDone }: { projectId: string; person: string; suggest: number; onDone: () => void }) {
    const add = useAddPayment(projectId);
    const today = todayYmd();
    const [amount, setAmount] = useState(suggest ? String(suggest) : "");
    const [date, setDate] = useState(today);
    const [remark, setRemark] = useState("");
    const [proof, setProof] = useState<File | null>(null);
    const [tried, setTried] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const ok = num(amount) > 0;

    const save = () => {
        setTried(true);
        if (!ok) return;
        add.mutate({ trade: "", contractorName: person, date, amount: num(amount), remark: remark.trim(), proof }, { onSuccess: onDone });
    };

    return (
        <div className="border-t border-[#EFEFED] bg-[#FAFAF9] px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_10rem_1fr]">
                <label className={label}>
                    Amount (₹)
                    <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" inputMode="decimal" min={0} step="any" autoFocus aria-invalid={tried && !ok} className={`${field} tabular-nums`} />
                </label>
                <label className={label}>
                    Date
                    <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className={field} />
                </label>
                <label className={label}>
                    Note
                    <input value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={500} placeholder="Cash, UPI, cheque no." className={field} />
                </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" tabIndex={-1} onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => fileRef.current?.click()} className={`${mono.secondary} min-h-10 text-sm`}>
                    <FiPaperclip aria-hidden /> {proof ? proof.name : "Receipt photo (optional)"}
                </button>
                {tried && !ok && <span className="text-sm text-[#B3261E]">Enter the amount paid.</span>}
                {add.isError && <span className="text-sm text-[#B3261E]">{describeError(add.error)}</span>}
                <span className="ml-auto flex gap-2">
                    <button type="button" onClick={onDone} disabled={add.isPending} className={`${mono.quiet} min-h-10 text-sm`}>
                        Cancel
                    </button>
                    <button type="button" onClick={save} disabled={add.isPending} className={`${mono.primary} min-h-10 text-sm`}>
                        {add.isPending ? "Saving…" : "Save payment"}
                    </button>
                </span>
            </div>
        </div>
    );
}

function PaymentRow({ projectId, p, onDelete }: { projectId: string; p: Payment; onDelete: () => void }) {
    const update = useUpdatePayment(projectId);
    const [editing, setEditing] = useState(false);
    const [amount, setAmount] = useState(String(p.amount));
    const [date, setDate] = useState(p.date);
    const [remark, setRemark] = useState(p.remark);
    const today = todayYmd();

    if (editing)
        return (
            <li className="flex flex-wrap items-center gap-2 bg-[#FAFAF9] px-5 py-3">
                <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date" className={`${field} w-40`} />
                <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={0} step="any" aria-label="Amount" className={`${field} w-32 text-right tabular-nums`} />
                <input value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={500} aria-label="Note" placeholder="Note" className={`${field} min-w-40 flex-1`} />
                <button
                    type="button"
                    disabled={update.isPending || num(amount) <= 0}
                    onClick={() => update.mutate({ id: p.id, contractorName: p.contractorName, date, amount: num(amount), remark: remark.trim() }, { onSuccess: () => setEditing(false) })}
                    className={`${mono.primary} min-h-10 px-3 text-sm`}
                >
                    <FiCheck aria-hidden /> Save
                </button>
                <button type="button" onClick={() => setEditing(false)} className={mono.icon} aria-label="Cancel">
                    <FiX aria-hidden />
                </button>
                {update.isError && <span className="w-full text-sm text-[#B3261E]">{describeError(update.error)}</span>}
            </li>
        );
    return (
        <li className="flex items-center gap-3 px-5 py-2.5 text-sm">
            <span className="w-28 shrink-0 whitespace-nowrap">{longDay(p.date)}</span>
            <span className="min-w-0 flex-1 truncate text-[#666666]">{p.remark || "–"}</span>
            {p.receiptUrl && (
                <a href={p.receiptUrl} target="_blank" rel="noreferrer" className={mono.icon} aria-label="Open the receipt" title="Receipt">
                    <FiFileText aria-hidden />
                </a>
            )}
            <span className="w-28 shrink-0 text-right font-semibold tabular-nums text-[#085041]">{money(p.amount)}</span>
            <button type="button" onClick={() => setEditing(true)} className={mono.icon} aria-label={`Edit the payment of ${shortDay(p.date)}`} title="Edit">
                <FiEdit2 aria-hidden />
            </button>
            <button type="button" onClick={onDelete} className={mono.iconDanger} aria-label={`Delete the payment of ${shortDay(p.date)}`} title="Delete">
                <FiTrash2 aria-hidden />
            </button>
        </li>
    );
}

/** A one-page statement for the person and the dates, in a new window */
function printStatement(s: Statement) {
    const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const earned = [
        ...s.days.map((d) => `<tr><td>${longDay(d.date)}</td><td>${esc(d.work)}</td><td>${d.hours ? `${d.hours} h` : ""}${d.otHours ? ` + ${d.otHours} OT` : ""}</td><td class="r">${money(d.amount)}</td></tr>`),
        ...s.contract.map((c) => `<tr><td>${longDay(c.date)}</td><td>${esc(c.work)} (contract)</td><td>${c.quantity} ${esc(c.unit)} × ${money(c.rate)}</td><td class="r">${money(c.amount)}</td></tr>`),
    ].join("");
    const paid = s.payments.map((p) => `<tr><td>${longDay(p.date)}</td><td colspan="2">${esc(p.remark || "")}</td><td class="r">${money(p.amount)}</td></tr>`).join("");
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${esc(s.person)} · statement</title><style>
    body{font-family:system-ui,sans-serif;color:#111;margin:32px}h1{font-size:20px;margin:0}h2{font-size:15px;margin:24px 0 8px}p{color:#555;margin:4px 0 16px;font-size:13px}
    table{width:100%;border-collapse:collapse;font-size:13px}td,th{border:1px solid #ddd;padding:6px 8px;text-align:left}.r{text-align:right}
    .sum{display:flex;gap:24px;font-size:14px}.sum b{display:block;font-size:18px}</style></head><body>
    <h1>${esc(s.person)}</h1><p>Statement · ${longDay(s.from)} to ${longDay(s.to)}</p>
    <div class="sum"><div>Earned<b>${money(s.earned)}</b></div><div>Paid<b>${money(s.paid)}</b></div><div>${s.balance < 0 ? "Paid extra" : "Still to pay"}<b>${money(Math.abs(s.balance))}</b></div></div>
    <h2>Earned</h2><table><tbody>${earned || `<tr><td>Nothing in these dates</td></tr>`}</tbody></table>
    <h2>Paid</h2><table><tbody>${paid || `<tr><td>No payments in these dates</td></tr>`}</tbody></table>
    <script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
}