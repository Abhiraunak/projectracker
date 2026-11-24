"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { FiArchive, FiChevronDown, FiChevronUp, FiCreditCard, FiEdit2, FiPlus, FiTool, FiTrendingUp, FiX } from "react-icons/fi";
import { useArchiveMeasure, useArchivePayment, useArchiveSubcontractor, usePeople, useProgress, useSaveMeasure, useSaveSubPayment, useSubcontract } from "@/hooks/useLabourSimple";
import { describeError } from "@/lib/api";
import type { SubPayment, SubWork, Subcontractor } from "@/lib/labour/simple";
import { SectionError, SectionSkeleton } from "../../ui";
import { ArchivedList } from "./ArchivedList";
import { DatePick } from "./DatePick";
import { PickList } from "./PickList";
import { Tile } from "./Tile";
import { field, label, longDay, money, mono, num, r2, shortDay, todayYmd } from "./shared";

const UNITS = ["sqft", "rft", "sqm", "cum", "nos", "kg"];
const ADVANCE = "Advance (not for one work)";
const qty = (n: number, unit: string) => `${n.toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${unit}`;

/**
 * Subcontract, like materials and their deliveries: one row per subcontractor (Work done, Paid, To pay).
 *  - Work ▾: each work given, with the whole quantity, the rate and "done till date" (the latest update counts);
 *    Update done and Pay sit on each work. Amount = done till date × rate.
 *  - Payments ▾: every payment, for a work or as an advance.
 * Everything can be changed; the box archives; deleting for good happens only in Archived.
 */
export function SubcontractTab({ projectId }: { projectId: string }) {
    const book = useSubcontract(projectId);
    const people = usePeople(projectId);
    const archive = useArchiveSubcontractor(projectId);
    const [open, setOpen] = useState<{ name: string; what: "works" | "pays" } | null>(null);
    const [adding, setAdding] = useState<string | null>(null); // "" = a new subcontractor, a name = a new work for them

    if (book.isPending) return <SectionSkeleton />;
    if (book.isError) return <SectionError error={book.error} onRetry={() => void book.refetch()} />;
    const { people: subs, totals } = book.data;
    const toggle = (name: string, what: "works" | "pays") =>
        setOpen((o) => (o && o.name.toLowerCase() === name.toLowerCase() && o.what === what ? null : { name, what }));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Tile tone="blue" label="Work done" value={money(totals.done)} note={`${subs.length} ${subs.length === 1 ? "subcontractor" : "subcontractors"}`} />
                <Tile tone="green" label="Paid" value={money(totals.paid)} />
                <Tile tone="amber" label="Still to pay" value={money(Math.max(0, totals.toPay))} />
            </div>

            <section className={`${mono.card} overflow-hidden`}>
                <div className="flex flex-wrap items-center gap-2 px-5 py-4">
                    <h3 className="mr-auto text-[15px] font-semibold text-[#111111]">Subcontractors</h3>
                    <button type="button" onClick={() => setAdding((a) => (a === "" ? null : ""))} className={`${mono.primary} min-h-10 text-sm`}>
                        <FiPlus aria-hidden /> Add subcontractor
                    </button>
                </div>
                {adding === "" && <WorkForm projectId={projectId} names={people.data?.everyone ?? []} onDone={() => setAdding(null)} />}

                {subs.length === 0 ? (
                    <p className="border-t border-[#EFEFED] px-5 py-8 text-center text-sm text-[#666666]">Nothing given on contract yet. Use Add subcontractor, for example Tiles, 1,000 sqft at ₹600.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-184 text-sm">
                            <thead>
                                <tr className="border-y border-[#EFEFED] bg-[#F7F7F5] text-xs text-[#666666]">
                                    <th scope="col" className="px-5 py-2 text-left font-medium">Name</th>
                                    <th scope="col" className="w-28 px-2 py-2 text-right font-medium">Work done</th>
                                    <th scope="col" className="w-28 px-2 py-2 text-right font-medium">Paid</th>
                                    <th scope="col" className="w-32 px-2 py-2 text-right font-medium">To pay</th>
                                    <th scope="col" className="w-64 px-2 py-2"><span className="sr-only">Open</span></th>
                                    <th scope="col" className="w-14 pr-4"><span className="sr-only">Archive</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {subs.map((s) => {
                                    const here = open && open.name.toLowerCase() === s.name.toLowerCase() ? open.what : null;
                                    return (
                                        <SubRows
                                            key={s.name.toLowerCase()}
                                            projectId={projectId}
                                            s={s}
                                            here={here}
                                            adding={adding !== null && adding !== "" && adding.toLowerCase() === s.name.toLowerCase()}
                                            onAddWork={() => setAdding(s.name)}
                                            onAdded={() => setAdding(null)}
                                            onToggle={(w) => toggle(s.name, w)}
                                            onArchive={() => archive.mutate({ name: s.name, archive: true })}
                                            archiving={archive.isPending && archive.variables?.name === s.name}
                                        />
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {archive.isError && <p role="alert" className="px-5 pb-4 text-sm text-[#B3261E]">{describeError(archive.error)}</p>}
            </section>

            <ArchivedList projectId={projectId} tab="sub" />
        </div>
    );
}

function SubRows({
    projectId,
    s,
    here,
    adding,
    onAddWork,
    onAdded,
    onToggle,
    onArchive,
    archiving,
}: {
    projectId: string;
    s: Subcontractor;
    here: "works" | "pays" | null;
    adding: boolean;
    onAddWork: () => void;
    onAdded: () => void;
    onToggle: (w: "works" | "pays") => void;
    onArchive: () => void;
    archiving: boolean;
}) {
    const btn = (w: "works" | "pays", text: string, Icon: typeof FiTool) => (
        <button type="button" onClick={() => onToggle(w)} aria-expanded={here === w} className={`${mono.secondary} min-h-9 px-3 text-sm ${here === w ? "border-[#111111] bg-[#F7F7F5]" : ""}`}>
            <Icon aria-hidden /> {text} {here === w ? <FiChevronUp aria-hidden /> : <FiChevronDown aria-hidden />}
        </button>
    );
    return (
        <>
            <tr className={`border-t border-[#EFEFED] ${here ? "bg-[#FAFAF9]" : ""}`}>
                <td className="px-5 py-3">
                    <span className="font-semibold text-[#111111]">{s.name}</span>
                    <span className="block text-xs text-[#8C8C8C]">
                        {s.works.length} {s.works.length === 1 ? "work" : "works"}
                    </span>
                </td>
                <td className="px-2 py-3 text-right tabular-nums text-[#185FA5]">{money(s.done)}</td>
                <td className="px-2 py-3 text-right tabular-nums text-[#0F6E56]">{money(s.paid)}</td>
                <td className={`px-2 py-3 text-right font-semibold tabular-nums ${s.toPay < 0 ? "text-[#0F6E56]" : "text-[#854F0B]"}`}>{s.toPay < 0 ? `Paid ahead ${money(-s.toPay)}` : money(s.toPay)}</td>
                <td className="px-2 py-3 text-right">
                    <span className="inline-flex gap-1.5">
                        {btn("works", "Work", FiTool)}
                        {btn("pays", "Payments", FiCreditCard)}
                    </span>
                </td>
                <td className="pr-4 text-right">
                    <button type="button" onClick={onArchive} disabled={archiving} className={mono.icon} aria-label={`Archive ${s.name}`} title="Archive (with all their works and payments)">
                        <FiArchive aria-hidden />
                    </button>
                </td>
            </tr>
            {here && (
                <tr>
                    <td colSpan={6} className="bg-[#FAFAF9] px-5 pb-4 pt-1">
                        {here === "works" ? <WorksPanel projectId={projectId} s={s} adding={adding} onAddWork={onAddWork} onAdded={onAdded} /> : <PaysPanel projectId={projectId} s={s} />}
                    </td>
                </tr>
            )}
        </>
    );
}

/* ------------------------------------------------ works ------------------------------------------------ */

type WorkFormKind = "done" | "pay" | "edit";

function WorksPanel({ projectId, s, adding, onAddWork, onAdded }: { projectId: string; s: Subcontractor; adding: boolean; onAddWork: () => void; onAdded: () => void }) {
    const archive = useArchiveMeasure(projectId);
    const [form, setForm] = useState<{ id: string; what: WorkFormKind } | null>(null);
    const formOf = (id: string) => (form && form.id === id ? form.what : null);
    const flip = (id: string, what: WorkFormKind) => setForm((f) => (f && f.id === id && f.what === what ? null : { id, what }));

    return (
        <div className="space-y-2">
            {adding ? (
                <div className="overflow-hidden rounded-xl border border-[#E8E8E6]">
                    <WorkForm projectId={projectId} fixedName={s.name} names={[]} onDone={onAdded} />
                </div>
            ) : (
                <button type="button" onClick={onAddWork} className={`${mono.primary} min-h-10 text-sm`}>
                    <FiPlus aria-hidden /> Add work
                </button>
            )}
            <div className="overflow-x-auto rounded-xl border border-[#E8E8E6] bg-white">
                <table className="w-full min-w-208 text-sm">
                    <thead>
                        <tr className="bg-[#F7F7F5] text-xs text-[#666666]">
                            <th scope="col" className="px-4 py-2 text-left font-medium">Work</th>
                            <th scope="col" className="px-2 py-2 text-right font-medium">Rate</th>
                            <th scope="col" className="px-2 py-2 text-right font-medium">Done till date</th>
                            <th scope="col" className="px-2 py-2 text-right font-medium">Amount</th>
                            <th scope="col" className="px-2 py-2 text-right font-medium">Paid</th>
                            <th scope="col" className="px-2 py-2 text-right font-medium">To pay</th>
                            <th scope="col" className="w-64 pr-3"><span className="sr-only">Update, pay, change</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFEFED]">
                        {s.works.map((w) => {
                            const pct = w.total > 0 ? Math.min(100, Math.round((w.done / w.total) * 100)) : 0;
                            const f = formOf(w.id);
                            return (
                                <WorkRow key={w.id} w={w} pct={pct} open={f} onFlip={(what) => flip(w.id, what)} onArchive={() => archive.mutate({ id: w.id, archive: true })}>
                                    {f === "done" && <DoneForm projectId={projectId} w={w} onDone={() => setForm(null)} />}
                                    {f === "pay" && <SubPayForm projectId={projectId} s={s} measureId={w.id} onDone={() => setForm(null)} />}
                                    {f === "edit" && <WorkForm projectId={projectId} fixedName={s.name} editing={w} names={[]} onDone={() => setForm(null)} />}
                                </WorkRow>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-[#8C8C8C]">Done till date is the total finished so far, not just that day&apos;s part. Each update is kept with its date.</p>
            {archive.isError && <p role="alert" className="text-sm text-[#B3261E]">{describeError(archive.error)}</p>}
        </div>
    );
}

function WorkRow({
    w,
    pct,
    open,
    onFlip,
    onArchive,
    children,
}: {
    w: SubWork;
    pct: number;
    open: WorkFormKind | null;
    onFlip: (what: WorkFormKind) => void;
    onArchive: () => void;
    children: ReactNode;
}) {
    const on = (what: WorkFormKind) => (open === what ? "border-[#111111] bg-[#F7F7F5]" : "");
    return (
        <>
            <tr>
                <td className="px-4 py-2.5">
                    <span className="block font-semibold text-[#111111]">{w.work}</span>
                    <span className="block text-xs text-[#8C8C8C]">
                        of {qty(w.total, w.unit)}
                        {w.doneOn ? ` · updated ${shortDay(w.doneOn)}` : " · not started"}
                        {w.note ? ` · ${w.note}` : ""}
                    </span>
                    <span className="mt-1 block h-1.5 w-40 overflow-hidden rounded-full bg-[#EFEFED]">
                        <span className="block h-full rounded-full bg-[#378ADD]" style={{ width: `${pct}%` }} />
                    </span>
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums">
                    {money(w.rate)}/{w.unit}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold tabular-nums">{qty(w.done, w.unit)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-[#185FA5]">{money(w.amount)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-[#0F6E56]">{money(w.paid)}</td>
                <td className={`whitespace-nowrap px-2 py-2.5 text-right font-semibold tabular-nums ${w.toPay < 0 ? "text-[#0F6E56]" : "text-[#854F0B]"}`}>
                    {w.toPay < 0 ? `Ahead ${money(-w.toPay)}` : money(w.toPay)}
                </td>
                <td className="whitespace-nowrap pr-3 text-right">
                    <span className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => onFlip("done")} className={`${mono.secondary} min-h-9 px-2.5 text-sm ${on("done")}`}>
                            <FiTrendingUp aria-hidden /> Update done
                        </button>
                        <button type="button" onClick={() => onFlip("pay")} className={`${mono.secondary} min-h-9 px-2.5 text-sm ${on("pay")}`}>
                            <FiCreditCard aria-hidden /> Pay
                        </button>
                        <button type="button" onClick={() => onFlip("edit")} className={mono.icon} aria-label={`Change ${w.work}`} title="Change">
                            <FiEdit2 aria-hidden />
                        </button>
                        <button type="button" onClick={onArchive} className={mono.icon} aria-label={`Archive ${w.work}`} title="Archive (with its payments)">
                            <FiArchive aria-hidden />
                        </button>
                    </span>
                </td>
            </tr>
            {open && (
                <tr>
                    <td colSpan={7} className="bg-[#F7F7F5] p-0">
                        {children}
                    </td>
                </tr>
            )}
        </>
    );
}

/** Update done: the date and the total finished so far. Earlier updates are listed and can be corrected. */
function DoneForm({ projectId, w, onDone }: { projectId: string; w: SubWork; onDone: () => void }) {
    const save = useProgress(projectId);
    const [editing, setEditing] = useState<string | null>(null); // an earlier update being corrected
    const [date, setDate] = useState(todayYmd());
    const [done, setDone] = useState("");
    const [problem, setProblem] = useState<string | null>(null);
    const submit = () => {
        if (done.trim() === "" || !Number.isFinite(Number(done)) || Number(done) < 0) {
            setProblem("Enter how much is done till date.");
            return;
        }
        save.mutate({ id: w.id, progressId: editing ?? undefined, body: { date, done: num(done) } }, { onSuccess: onDone });
    };
    const over = num(done) > w.total;
    return (
        <div className="space-y-2 px-4 py-3">
            <div className="grid gap-2.5 sm:grid-cols-[11rem_12rem_auto] sm:items-end">
                <div className={label}>
                    <span>Date</span>
                    <DatePick value={date} onChange={setDate} label="Date" size="sm" />
                </div>
                <label className={label}>
                    Done till date ({w.unit})
                    <input
                        value={done}
                        onChange={(e) => {
                            setDone(e.target.value);
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
                        placeholder={String(w.done)}
                        className={`${field} text-right tabular-nums`}
                    />
                </label>
                <span className="flex gap-1.5">
                    <button type="button" onClick={submit} disabled={save.isPending} className={`${mono.primary} min-h-10 text-sm`}>
                        {save.isPending ? "Saving…" : editing ? "Save change" : "Save"}
                    </button>
                    <button type="button" onClick={onDone} className={mono.icon} aria-label="Cancel" title="Cancel">
                        <FiX aria-hidden />
                    </button>
                </span>
            </div>
            <p className="text-xs text-[#666666]">
                Amount becomes <b className="tabular-nums">{money(r2(num(done || String(w.done)) * w.rate))}</b>
                {over && <span className="text-[#854F0B]"> · more than the {qty(w.total, w.unit)} given</span>}
            </p>
            {(problem || save.isError) && <p role="alert" className="text-sm text-[#B3261E]">{problem ?? describeError(save.error)}</p>}
            {w.progress.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 text-xs" aria-label="Earlier updates (tap one to correct it)">
                    {[...w.progress].reverse().map((x) => (
                        <li key={x.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditing(x.id);
                                    setDate(x.date);
                                    setDone(String(x.done));
                                }}
                                className={`rounded-full border px-2.5 py-1 ${editing === x.id ? "border-[#111111] bg-white" : "border-[#DADAD7] bg-white hover:border-[#8C8C8C]"}`}
                                title="Correct this update"
                            >
                                {shortDay(x.date)}: {qty(x.done, w.unit)}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** Add a subcontractor's work (or change one): work, quantity given, unit, rate, date, done so far, note */
function WorkForm({ projectId, fixedName, editing, names, onDone }: { projectId: string; fixedName?: string; editing?: SubWork; names: string[]; onDone: () => void }) {
    const save = useSaveMeasure(projectId);
    const today = todayYmd();
    const [who, setWho] = useState(fixedName ?? "");
    const [date, setDate] = useState(editing?.date ?? today);
    const [work, setWork] = useState(editing?.work ?? "");
    const [total, setTotal] = useState(editing ? String(editing.total) : "");
    const [unit, setUnit] = useState(editing?.unit ?? "sqft");
    const [rate, setRate] = useState(editing ? String(editing.rate) : "");
    const [done, setDone] = useState("");
    const [note, setNote] = useState(editing?.note ?? "");
    const [tried, setTried] = useState(false);
    const problem = !who.trim() ? "Enter the subcontractor." : !work.trim() ? "Say what work it is." : num(total) <= 0 ? "Enter the quantity given." : null;

    const submit = () => {
        setTried(true);
        if (problem) return;
        save.mutate(
            {
                id: editing?.id,
                body: { contractorName: who.trim(), date, work: work.trim(), quantity: num(total), unit: unit.trim() || "sqft", rate: num(rate), note: note.trim(), ...(editing ? {} : { done: num(done) }) },
            },
            { onSuccess: onDone },
        );
    };

    return (
        <div className="border-t border-[#EFEFED] bg-[#FAFAF9] px-5 py-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {!fixedName && (
                    <label className={`${label} col-span-2`}>
                        Subcontractor
                        <input value={who} onChange={(e) => setWho(e.target.value)} list="labour-people" maxLength={120} autoFocus placeholder="Sunil tiles" className={field} />
                        <datalist id="labour-people">
                            {names.map((n) => (
                                <option key={n} value={n} />
                            ))}
                        </datalist>
                    </label>
                )}
                <label className={`${label} ${fixedName ? "col-span-2 sm:col-span-4" : "col-span-2"}`}>
                    Work
                    <input value={work} onChange={(e) => setWork(e.target.value)} maxLength={160} autoFocus={!!fixedName} placeholder="Tiles, 1st floor" className={field} />
                </label>
                <label className={label}>
                    Quantity given
                    <input value={total} onChange={(e) => setTotal(e.target.value)} type="number" min={0} step="any" className={`${field} text-right tabular-nums`} />
                </label>
                <div className={label}>
                    <span>Unit</span>
                    <PickList value={unit} options={UNITS.includes(unit) ? UNITS : [unit, ...UNITS]} onChange={setUnit} label="Unit" />
                </div>
                <label className={label}>
                    Rate (₹ per {unit || "unit"})
                    <input value={rate} onChange={(e) => setRate(e.target.value)} type="number" min={0} step="any" className={`${field} text-right tabular-nums`} />
                </label>
                <div className={label}>
                    <span>Date given</span>
                    <DatePick value={date} onChange={setDate} label="Date given" size="sm" />
                </div>
                {!editing && (
                    <label className={label}>
                        Done so far (optional)
                        <input value={done} onChange={(e) => setDone(e.target.value)} type="number" min={0} step="any" placeholder="0" className={`${field} text-right tabular-nums`} />
                    </label>
                )}
                <label className={`${label} ${editing ? "col-span-2 sm:col-span-4" : "col-span-1 sm:col-span-3"}`}>
                    Note (optional)
                    <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={field} />
                </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#333333]">
                    Whole work: <b className="tabular-nums">{money(r2(num(total) * num(rate)))}</b>
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

/* ------------------------------------------------ payments ------------------------------------------------ */

function PaysPanel({ projectId, s }: { projectId: string; s: Subcontractor }) {
    const archive = useArchivePayment(projectId);
    const [editing, setEditing] = useState<SubPayment | null>(null);
    return (
        <div className="space-y-2">
            <div className="overflow-hidden rounded-xl border border-[#E8E8E6]">
                <SubPayForm key={editing?.id ?? "new"} projectId={projectId} s={s} editing={editing} onDone={() => setEditing(null)} />
            </div>
            {s.payments.length === 0 ? (
                <p className="text-sm text-[#666666]">No payments yet.</p>
            ) : (
                <div className="overflow-hidden rounded-xl border border-[#E8E8E6] bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#F7F7F5] text-xs text-[#666666]">
                                <th scope="col" className="px-4 py-2 text-left font-medium">Date</th>
                                <th scope="col" className="px-2 py-2 text-left font-medium">For work</th>
                                <th scope="col" className="px-2 py-2 text-right font-medium">Amount paid</th>
                                <th scope="col" className="w-24 pr-3"><span className="sr-only">Change</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFEFED]">
                            {s.payments.map((p) => (
                                <tr key={p.id} className={editing?.id === p.id ? "bg-[#E6F1FB]" : ""}>
                                    <td className="whitespace-nowrap px-4 py-2">{longDay(p.date)}</td>
                                    <td className="px-2 py-2">
                                        {p.work ?? <span className="text-[#8C8C8C]">Advance</span>}
                                        {p.remark && <span className="block text-xs text-[#8C8C8C]">{p.remark}</span>}
                                    </td>
                                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{money(p.amount)}</td>
                                    <td className="pr-3 text-right">
                                        <button type="button" onClick={() => setEditing(p)} className={mono.icon} aria-label="Change this payment" title="Change">
                                            <FiEdit2 aria-hidden />
                                        </button>
                                        <button type="button" onClick={() => archive.mutate({ id: p.id, archive: true })} disabled={archive.isPending} className={mono.icon} aria-label="Archive this payment" title="Archive">
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

/** A payment: date, for which work (or an advance), amount. Opened from a work's Pay, the work is already chosen. */
function SubPayForm({ projectId, s, measureId, editing, onDone }: { projectId: string; s: Subcontractor; measureId?: string; editing?: SubPayment | null; onDone: () => void }) {
    const save = useSaveSubPayment(projectId);
    const [date, setDate] = useState(editing?.date ?? todayYmd());
    const [workId, setWorkId] = useState<string | null>(editing ? editing.measureId : (measureId ?? s.works[0]?.id ?? null));
    const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
    const [remark, setRemark] = useState(editing?.remark ?? "");
    const [problem, setProblem] = useState<string | null>(null);
    const chosen = s.works.find((w) => w.id === workId);
    const submit = () => {
        if (num(amount) <= 0) {
            setProblem("Enter the amount paid.");
            return;
        }
        save.mutate(
            { id: editing?.id, body: { name: s.name, date, amount: num(amount), measureId: workId, remark: remark.trim() } },
            {
                onSuccess: () => {
                    setAmount("");
                    setRemark("");
                    onDone();
                },
            },
        );
    };
    return (
        <div className="space-y-2 bg-[#F7F7F5] px-4 py-3">
            <div className="grid gap-2.5 sm:grid-cols-[11rem_minmax(0,1.3fr)_9rem_minmax(0,1fr)_auto] sm:items-end">
                <div className={label}>
                    <span>Date</span>
                    <DatePick value={date} onChange={setDate} label="Date" size="sm" />
                </div>
                <div className={label}>
                    <span>For work</span>
                    {measureId && !editing ? (
                        <span className={`${field} flex items-center bg-[#F7F7F5]`}>{chosen?.work}</span>
                    ) : (
                        <PickList
                            value={chosen?.work ?? ADVANCE}
                            options={[...s.works.map((w) => w.work), ADVANCE]}
                            onChange={(t) => setWorkId(s.works.find((w) => w.work === t)?.id ?? null)}
                            label="For work"
                        />
                    )}
                </div>
                <label className={label}>
                    Amount paid
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
                        placeholder={chosen && chosen.toPay > 0 ? String(chosen.toPay) : "₹ 0"}
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
                    {(editing || measureId) && (
                        <button type="button" onClick={onDone} className={mono.icon} aria-label="Cancel" title="Cancel">
                            <FiX aria-hidden />
                        </button>
                    )}
                </span>
            </div>
            {chosen && <p className="text-xs text-[#666666]">{chosen.work}: done {money(chosen.amount)}, paid {money(chosen.paid)}, to pay {money(Math.max(0, chosen.toPay))}</p>}
            {(problem || save.isError) && <p role="alert" className="text-sm text-[#B3261E]">{problem ?? describeError(save.error)}</p>}
        </div>
    );
}