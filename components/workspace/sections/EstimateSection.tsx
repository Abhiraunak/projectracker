"use client";

import { useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiEdit2, FiFileText, FiPlus, FiPrinter, FiTrash2, FiX } from "react-icons/fi";
import { ConfirmDeleteDialog } from "@/components/utilites/Confirmdeletedialog";
import { useCan } from "@/hooks/useProjectAccess";
import { useCreateEstimate, useDeleteEstimate, useEstimate, useEstimates, useSendEstimate } from "@/hooks/useMaterialEstimates";
import { goTo, useWorkspaceItem } from "@/hooks/useWorkspacePlace";
import { describeError } from "@/lib/api";
import { estimatesApi, statusNow, type Estimate, type EstimateLine, type EstimateSummary, type LineStatus } from "@/lib/estimates/api";

/** What "Send to Materials" gives back: how many were added and updated, and the estimate as it is now */
type SendResult = { added: number; updated: number; estimate: Estimate };
import { SectionError, SectionSkeleton } from "../ui";
import { EstimatePrint } from "./materials/EstimatePrint";
import { mono } from "./materials/mono";
import { money } from "./materials/purchaseFormat";

/**
 * The project's Material estimate, kept simple: named lists of materials (unit, quantity, rate; the amount and the
 * total work themselves out), typed straight in like a sheet and saved as you type. "Send to Materials" puts new lines
 * in the Materials tab and updates the ones changed since. Opening an estimate puts its id in the address (?i=).
 */
export default function EstimateSection({ projectId }: { projectId: string }) {
    const open = useWorkspaceItem();
    const close = () => goTo({ projectId, section: "boq", item: null });
    return open ? <OpenEstimate key={open} projectId={projectId} id={open} onBack={close} /> : <EstimateList projectId={projectId} />;
}

/* ------------------------------------------------ the list ------------------------------------------------ */

function EstimateList({ projectId }: { projectId: string }) {
    const list = useEstimates(projectId);
    const create = useCreateEstimate(projectId);
    const remove = useDeleteEstimate(projectId);
    const [deleting, setDeleting] = useState<EstimateSummary | null>(null);
    const openOne = (id: string) => goTo({ projectId, section: "boq", item: id });

    if (list.isPending) return <SectionSkeleton />;
    if (list.isError) return <SectionError error={list.error} onRetry={() => void list.refetch()} />;
    const estimates = list.data.estimates;

    return (
        <div className="space-y-4">
            <div className={`${mono.card} overflow-hidden`}>
                <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <h2 className="flex-1 text-lg font-semibold text-[#111111]">Material estimates</h2>
                    <button
                        type="button"
                        disabled={create.isPending}
                        onClick={() => create.mutate(`Estimate ${estimates.length + 1}`, { onSuccess: (e) => openOne(e.id) })}
                        className={mono.primary}
                    >
                        <FiPlus aria-hidden /> {create.isPending ? "Making…" : "New estimate"}
                    </button>
                </div>
                {create.isError && <p role="alert" className="px-5 pb-3 text-sm text-[#B3261E]">{describeError(create.error)}</p>}

                {estimates.length === 0 ? (
                    <p className="border-t border-[#EFEFED] px-5 py-10 text-center text-sm text-[#666666]">
                        No estimates yet. Use New estimate, then type the materials, quantities and rates.
                    </p>
                ) : (
                    <ul className="divide-y divide-[#EFEFED] border-t border-[#EFEFED]">
                        {estimates.map((e) => (
                            <li key={e.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAFAF9]">
                                <button type="button" onClick={() => openOne(e.id)} className={`flex min-w-0 flex-1 items-center gap-3 rounded text-left ${mono.ring}`}>
                                    <FiFileText aria-hidden className="shrink-0 text-xl text-[#185FA5]" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium text-[#111111]">{e.name}</span>
                                        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#666666]">
                                            {e.lines} {e.lines === 1 ? "material" : "materials"}
                                            {e.lines > 0 &&
                                                (e.notInMaterials > 0 ? (
                                                    <span className="rounded-full bg-[#FAEEDA] px-2 py-0.5 font-medium text-[#854F0B]">{e.notInMaterials} not in Materials yet</span>
                                                ) : (
                                                    <span className="rounded-full bg-[#EAF3DE] px-2 py-0.5 font-medium text-[#3B6D11]">all in Materials</span>
                                                ))}
                                        </span>
                                    </span>
                                    <span className="shrink-0 font-semibold tabular-nums text-[#0C447C]">{money(e.total)}</span>
                                </button>
                                <button type="button" onClick={() => openOne(e.id)} className={mono.icon} aria-label={`Edit ${e.name}`} title="Edit">
                                    <FiEdit2 aria-hidden />
                                </button>
                                <button type="button" onClick={() => setDeleting(e)} className={mono.iconDanger} aria-label={`Delete ${e.name}`} title="Delete">
                                    <FiTrash2 aria-hidden />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <ConfirmDeleteDialog
                open={deleting !== null}
                onClose={() => {
                    setDeleting(null);
                    remove.reset();
                }}
                title="Delete estimate?"
                itemName={deleting?.name}
                warning="Materials already sent to the Materials tab stay there."
                pending={remove.isPending}
                error={remove.error ? describeError(remove.error) : null}
                onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
            />
        </div>
    );
}

/* ------------------------------------------------ one estimate ------------------------------------------------ */

function OpenEstimate({ projectId, id, onBack }: { projectId: string; id: string; onBack: () => void }) {
    const one = useEstimate(projectId, id);
    if (one.isPending) return <SectionSkeleton />;
    if (one.isError)
        return (
            <div className="space-y-4">
                <BackButton onBack={onBack} />
                <SectionError error={one.error} onRetry={() => void one.refetch()} />
            </div>
        );
    return <Sheet projectId={projectId} estimate={one.data} onBack={onBack} />;
}

function BackButton({ onBack }: { onBack: () => void }) {
    return (
        <button type="button" onClick={onBack} className={mono.secondary}>
            <FiArrowLeft aria-hidden /> All estimates
        </button>
    );
}

/** A row as typed: numbers stay text while typing ("12." is fine), and turn into numbers when saved */
type Row = { id: string; name: string; unit: string; qty: string; rate: string; sent: EstimateLine["sent"] };

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `l${Date.now()}${Math.random().toString(36).slice(2, 10)}`);
const toRow = (l: EstimateLine): Row => ({ id: l.id, name: l.name, unit: l.unit, qty: l.quantity ? String(l.quantity) : "", rate: l.rate ? String(l.rate) : "", sent: l.sent });
const blank = (): Row => ({ id: newId(), name: "", unit: "", qty: "", rate: "", sent: null });
const n = (v: string) => {
    const x = Number(v);
    return v.trim() !== "" && Number.isFinite(x) && x >= 0 ? x : 0;
};
const amountOf = (r: Row) => Math.round(n(r.qty) * n(r.rate) * 100) / 100;

const STATUS: Record<LineStatus, { text: string; cls: string }> = {
    new: { text: "new", cls: "bg-[#F1F1EF] text-[#666666]" },
    sent: { text: "in Materials", cls: "bg-[#EAF3DE] text-[#3B6D11]" },
    changed: { text: "changed", cls: "bg-[#FAEEDA] text-[#854F0B]" },
};

function Sheet({ projectId, estimate, onBack }: { projectId: string; estimate: Estimate; onBack: () => void }) {
    const canSend = useCan("stock.receive");
    const [name, setName] = useState(estimate.name);
    const [rows, setRows] = useState<Row[]>(() => (estimate.lines.length ? estimate.lines.map(toRow) : [blank()]));
    const [saveState, setSaveState] = useState<"saved" | "waiting" | "saving" | "error">("saved");
    const [saveError, setSaveError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [printing, setPrinting] = useState(false);
    const send = useSendEstimate(projectId, estimate.id);

    // Saving as you type: a short pause after the last key, one save at a time, always the newest state
    const latest = useRef({ name, rows });
    // kept up to date after each render (never during it), for the save that runs a moment later
    useEffect(() => {
        latest.current = { name, rows };
    }, [name, rows]);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const chain = useRef<Promise<void>>(Promise.resolve());
    const first = useRef(true);

    const saveNow = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        const { name: nm, rows: rs } = latest.current;
        const body = {
            name: nm.trim() || "Untitled estimate",
            lines: rs.map((r) => ({ id: r.id, name: r.name.trim(), unit: r.unit.trim(), quantity: n(r.qty), rate: n(r.rate) })),
        };
        setSaveState("saving");
        chain.current = chain.current.then(() =>
            estimatesApi.save(projectId, estimate.id, body).then(
                () => {
                    if (!timer.current) setSaveState("saved");
                    setSaveError(null);
                },
                (err) => {
                    setSaveState("error");
                    setSaveError(describeError(err));
                },
            ),
        );
        return chain.current;
    };

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        setSaveState("waiting");
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void saveNow(), 700);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [name, rows]);

    // leaving the page: save what is still waiting
    useEffect(
        () => () => {
            if (timer.current) void saveNow();
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const edit = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    const addRow = () => {
        setRows((rs) => [...rs, blank()]);
        requestAnimationFrame(() => {
            const inputs = document.querySelectorAll<HTMLInputElement>("[data-estimate-name]");
            inputs[inputs.length - 1]?.focus();
        });
    };
    const removeRow = (i: number) => setRows((rs) => (rs.length === 1 ? [blank()] : rs.filter((_, j) => j !== i)));

    const statusOf = (r: Row) => statusNow({ name: r.name.trim(), quantity: n(r.qty), rate: n(r.rate), sent: r.sent });
    const total = rows.reduce((s, r) => s + amountOf(r), 0);
    const filled = rows.filter((r) => r.name.trim() && n(r.qty) > 0);
    const toSend = filled.filter((r) => statusOf(r) !== "sent").length;

    const sendToMaterials = async () => {
        setMessage(null);
        await saveNow(); // send exactly what is on screen
        send.mutate(undefined, {
            onSuccess: (data) => {
                const r = data as SendResult; // the hook's onSuccess type names only `estimate`; the server sends all three
                setRows((rs) => {
                    // keep what was typed; take the new "sent" marks from the server
                    const sent = new Map<string, EstimateLine["sent"]>(r.estimate.lines.map((l: EstimateLine) => [l.id, l.sent]));
                    return rs.map((row): Row => (sent.has(row.id) ? { ...row, sent: sent.get(row.id) ?? null } : row));
                });
                setMessage(
                    r.added + r.updated === 0
                        ? "Everything is already in Materials."
                        : [r.added > 0 && `${r.added} added to Materials`, r.updated > 0 && `${r.updated} updated there`].filter(Boolean).join(", ") + ".",
                );
            },
        });
    };

    const field = "h-10 w-full min-w-0 rounded-lg border border-[#DADAD7] bg-white px-2.5 text-sm text-[#111111] placeholder:text-[#B0B0AD] focus:border-[#111111] focus:outline-none";

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <BackButton onBack={onBack} />
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={120}
                    aria-label="Estimate name"
                    placeholder="Estimate name, e.g. Ground floor"
                    className={`${field} h-11 min-w-48 flex-1 text-base font-semibold`}
                />
                <span aria-live="polite" className={`w-20 text-xs ${saveState === "error" ? "text-[#B3261E]" : "text-[#8C8C8C]"}`}>
                    {saveState === "saving" || saveState === "waiting" ? "Saving…" : saveState === "error" ? "Not saved" : "Saved"}
                </span>
                <button type="button" onClick={() => setPrinting(true)} className={mono.secondary}>
                    <FiPrinter aria-hidden /> Print
                </button>
                {canSend && (
                    <button type="button" onClick={() => void sendToMaterials()} disabled={send.isPending} className={mono.primary}>
                        <FiArrowRight aria-hidden /> {send.isPending ? "Sending…" : toSend > 0 ? `Send to Materials (${toSend})` : "Send to Materials"}
                    </button>
                )}
            </div>
            {saveError && (
                <p role="alert" className="text-sm text-[#B3261E]">
                    {saveError}{" "}
                    <button type="button" onClick={() => void saveNow()} className="font-medium underline">
                        Try again
                    </button>
                </p>
            )}
            {send.isError && (
                <p role="alert" className="text-sm text-[#B3261E]">
                    {describeError(send.error)}
                </p>
            )}
            {message && <p className="rounded-xl bg-[#EAF3DE] px-4 py-2.5 text-sm text-[#3B6D11]">{message}</p>}

            <div className={`${mono.card} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-176 text-sm">
                        <thead>
                            <tr className="border-b border-[#EFEFED] bg-[#F7F7F5]">
                                <th scope="col" className={`${mono.th} w-12`}>No.</th>
                                <th scope="col" className={mono.th}>Material</th>
                                <th scope="col" className={`${mono.th} w-24`}>Unit</th>
                                <th scope="col" className={`${mono.th} w-28 text-right`}>Quantity</th>
                                <th scope="col" className={`${mono.th} w-28 text-right`}>Rate (₹)</th>
                                <th scope="col" className={`${mono.th} w-32 text-right`}>Amount</th>
                                <th scope="col" className="w-12">
                                    <span className="sr-only">Remove</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFEFED]">
                            {rows.map((r, i) => {
                                const st = r.name.trim() ? STATUS[statusOf(r)] : null;
                                return (
                                    <tr key={r.id}>
                                        <td className="px-3 py-2 tabular-nums text-[#8C8C8C]">{i + 1}</td>
                                        <td className="px-2 py-2">
                                            <span className="flex items-center gap-2">
                                                <input data-estimate-name value={r.name} onChange={(e) => edit(i, { name: e.target.value })} maxLength={200} aria-label={`Material ${i + 1}`} placeholder="Cement OPC 53" className={field} />
                                                {st && <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.text}</span>}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2">
                                            <input value={r.unit} onChange={(e) => edit(i, { unit: e.target.value })} maxLength={30} aria-label={`Unit ${i + 1}`} placeholder="bags" className={field} />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input value={r.qty} onChange={(e) => edit(i, { qty: e.target.value })} type="number" inputMode="decimal" min={0} step="any" aria-label={`Quantity ${i + 1}`} placeholder="0" className={`${field} text-right tabular-nums`} />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                value={r.rate}
                                                onChange={(e) => edit(i, { rate: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && i === rows.length - 1) {
                                                        e.preventDefault();
                                                        addRow(); // Enter on the last rate: a new line
                                                    }
                                                }}
                                                type="number"
                                                inputMode="decimal"
                                                min={0}
                                                step="any"
                                                aria-label={`Rate ${i + 1}`}
                                                placeholder="0"
                                                className={`${field} text-right tabular-nums`}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-[#111111]">{money(amountOf(r))}</td>
                                        <td className="px-1 py-2 text-center">
                                            <button type="button" onClick={() => removeRow(i)} className={mono.icon} aria-label={`Remove line ${i + 1}`} title="Remove">
                                                <FiX aria-hidden />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="border-t border-[#EFEFED] px-4 py-3">
                    <button type="button" onClick={addRow} className={mono.secondary}>
                        <FiPlus aria-hidden /> Add material
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between rounded-[22px] border border-[#B5D4F4] bg-[#E6F1FB] px-5 py-4">
                <span className="text-sm text-[#185FA5]">
                    Estimated total · {filled.length} {filled.length === 1 ? "material" : "materials"}
                </span>
                <span className="text-xl font-semibold tabular-nums text-[#0C447C] sm:text-2xl">{money(total)}</span>
            </div>
            <p className="text-xs text-[#8C8C8C]">
                Saved as you type. Send to Materials adds the new lines to the Materials tab and updates the changed ones; deliveries logged there stay as they are.
            </p>

            {printing && (
                <EstimatePrint
                    name={name.trim() || "Untitled estimate"}
                    lines={rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), unit: r.unit.trim(), quantity: n(r.qty), rate: n(r.rate), amount: amountOf(r) }))}
                    total={total}
                    onDone={() => setPrinting(false)}
                />
            )}
        </div>
    );
}