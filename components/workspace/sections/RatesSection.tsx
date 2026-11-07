"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { FiCheck, FiEdit2, FiPlus, FiTrendingDown, FiTrendingUp, FiX } from "react-icons/fi";
import { ComparisonGrid } from "@/components/labour/ComparisonGrid";
import { useCan } from "@/hooks/useProjectAccess";
import { useProject, useUpdateProject } from "@/hooks/useLabourProjects";
import { hrefFor, onPlaceClick } from "@/hooks/useWorkspacePlace";
import { describeError, toFormData, type ApiProject, type ApiTask } from "@/lib/api";
import { rupees } from "@/lib/projects/hub";
import { SectionError, SectionSkeleton } from "../ui";

const toNumber = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

/** The work items in the shape the comparison grid takes: the same conversion as the Project page */
function toGridItems(tasks: ApiTask[]) {
    return tasks.map((task) => {
        const stipulated = toNumber(task.stipulated);
        const paid = toNumber(task.paid);
        const variance = stipulated - paid;
        return {
            id: task.id,
            title: task.work,
            work: task.work,
            area: toNumber(task.area),
            contractorRate: toNumber(task.contractorRate),
            inHouseRate: toNumber(task.inHouseRate),
            progress: Math.min(100, Math.max(0, toNumber(task.progress))),
            stipulated,
            paid,
            variance,
            status: (variance >= 0 ? "Under Budget" : "Over Budget") as "Under Budget" | "Over Budget",
            startDate: task.startDate,
            endDate: task.endDate,
        };
    });
}

/**
 * Rate comparison: contractor vs in-house for each work item. Edit sets the area and the two rates, and can add new
 * work items too (name, dates, area, rates); they are the project's work items, so they show on the Overview as well.
 * Names, dates, cost and paid of existing items are still changed on the Overview.
 */
export default function RatesSection({ projectId }: { projectId: string }) {
    const project = useProject(projectId); // the same data as Labour payment, so switching between them is instant
    const canEdit = useCan("project.manage");
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);
    const items = useMemo(() => (project.data ? toGridItems(project.data.tasks) : []), [project.data]);

    if (project.isPending) return <SectionSkeleton />;
    if (project.isError) return <SectionError error={project.error} onRetry={() => void project.refetch()} />;

    if (editing)
        return (
            <RatesEditor
                projectId={projectId}
                project={project.data}
                onCancel={() => setEditing(false)}
                onSaved={() => {
                    setEditing(false);
                    setSaved(true);
                }}
            />
        );

    // No work items yet: add them here (or on the Overview)
    if (project.data.tasks.length === 0) {
        const overview = { projectId, section: "overview" as const, item: null };
        return (
            <div className="rounded-xl border border-dashed border-stone-300 px-4 py-10 text-center text-sm text-stone-600">
                No work items to compare yet.{" "}
                <a href={hrefFor(overview)} onClick={onPlaceClick(overview)} className="font-medium text-stone-900 underline underline-offset-4">
                    Add work items on the Overview
                </a>
                , or add them here with their area and rates.
                {canEdit && (
                    <div className="mt-4">
                        <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800">
                            <FiPlus aria-hidden /> Add work items
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {(canEdit || saved) && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-700">
                        {saved && (
                            <>
                                <FiCheck aria-hidden /> Rates saved
                            </>
                        )}
                    </p>
                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => {
                                setSaved(false);
                                setEditing(true);
                            }}
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:border-stone-500"
                        >
                            <FiEdit2 aria-hidden /> Edit rates / add work
                        </button>
                    )}
                </div>
            )}
            <ComparisonGrid items={items} title="Contractor vs In-house Comparison" />
        </div>
    );
}

/* ---------------------------------------------- the editor ---------------------------------------------- */

interface RateRowState {
    key: string;
    /** A work item added here (not saved yet): its name and dates are typed here too */
    isNew?: boolean;
    /** Existing items: shown, not edited (the name is changed on the Overview) */
    work: string;
    startDate: string;
    endDate: string;
    area: number | "";
    contractorRate: number | "";
    inHouseRate: number | "";
}
type Patch = Partial<Pick<RateRowState, "area" | "contractorRate" | "inHouseRate" | "work" | "startDate" | "endDate">>;

const pad = (v: number) => String(v).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
let seq = 0;
/** A blank new work item. Dates aren't asked here: it starts today and ends in 30 days (change them on the Overview) */
function newRow(): RateRowState {
    const end = new Date();
    end.setDate(end.getDate() + 30);
    return { key: `new-${Date.now()}-${seq++}`, isNew: true, work: "", startDate: ymd(new Date()), endDate: ymd(end), area: "", contractorRate: "", inHouseRate: "" };
}

const asInput = (v: number): number | "" => (v ? v : "");
const n = (v: number | "") => (v === "" ? 0 : v);

/**
 * Only the area and the two rates of each work item. Saving starts from the project as it is now (not as it was
 * when the editor opened), and changes only those three numbers, so a work item added or edited on the Overview in
 * the meantime is never lost or undone.
 */
function RatesEditor({ projectId, project, onCancel, onSaved }: { projectId: string; project: ApiProject; onCancel: () => void; onSaved: () => void }) {
    const latest = useProject(projectId); // the same cached project, kept fresh
    const update = useUpdateProject(); // refreshes this project, the hub and the project tiles after saving
    const [rows, setRows] = useState<RateRowState[]>(() => {
        const existing = project.tasks.map((t) => ({ key: t.id, work: t.work, startDate: t.startDate, endDate: t.endDate, area: asInput(t.area), contractorRate: asInput(t.contractorRate), inHouseRate: asInput(t.inHouseRate) }));
        return existing.length ? existing : [newRow()]; // nothing yet: open with one blank work item
    });
    const [problem, setProblem] = useState<string | null>(null);
    const change = (key: string, patch: Patch) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    const add = () => {
        const r = newRow();
        setRows((prev) => [...prev, r]);
        setTimeout(() => document.getElementById(`work-${r.key}`)?.focus(), 0);
    };
    const drop = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (update.isPending) return;
        // New rows left completely empty are ignored; a started one needs a name and dates
        const added = rows.filter((r) => r.isNew && (r.work.trim() || n(r.area) || n(r.contractorRate) || n(r.inHouseRate)));
        const bad = added.find((r) => !r.work.trim());
        if (bad) {
            setProblem("Give each new work item a name.");
            document.getElementById(`work-${bad.key}`)?.focus();
            return;
        }
        setProblem(null);
        const data = toFormData(latest.data ?? project);
        const byKey = new Map(rows.map((r) => [r.key, r]));
        data.tasks = data.tasks.map((t) => {
            const r = byKey.get(t.id);
            return r ? { ...t, area: n(r.area), contractorRate: n(r.contractorRate), inHouseRate: n(r.inHouseRate) } : t;
        });
        // The cost of the new work starts as area × contractor rate; it can be changed on the Overview
        data.tasks = [
            ...data.tasks,
            ...added.map((r) => ({
                id: r.key,
                work: r.work.trim(),
                startDate: r.startDate,
                endDate: r.endDate,
                area: n(r.area),
                contractorRate: n(r.contractorRate),
                inHouseRate: n(r.inHouseRate),
                stipulated: Math.round(n(r.area) * n(r.contractorRate) * 100) / 100,
                paid: 0,
                progress: 0,
            })),
        ];
        try {
            await update.mutateAsync({ id: project.id, data });
            onSaved();
        } catch {
            /* shown below */
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Edit rates and work items</h2>
                <button type="button" onClick={onCancel} disabled={update.isPending} className="min-h-11 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100">
                    Cancel
                </button>
            </div>

            <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
                {rows.map((r) => (
                    <RateRow key={r.key} r={r} onChange={(patch) => change(r.key, patch)} onRemove={r.isNew ? () => drop(r.key) : undefined} />
                ))}
            </ul>

            <button type="button" onClick={add} disabled={update.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-stone-400 px-4 text-sm font-medium text-stone-700 hover:border-stone-700 hover:text-stone-900">
                <FiPlus aria-hidden /> Add work item
            </button>

            <p className="text-xs text-stone-500">New work items also show on the Overview, where their dates, cost, paid and progress can be changed.</p>

            {(problem || update.isError) && (
                <p role="alert" className="text-sm text-red-700">
                    {problem ?? describeError(update.error)}
                </p>
            )}
            <div className="flex justify-end">
                <button type="submit" disabled={update.isPending} className="min-h-11 rounded-lg bg-stone-900 px-5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
                    {update.isPending ? "Saving…" : "Save"}
                </button>
            </div>
        </form>
    );
}

const input = "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-stone-300 bg-white pr-2 text-sm tabular-nums focus:border-stone-900 focus:outline-none";

function RateRow({ r, onChange, onRemove }: { r: RateRowState; onChange: (patch: Patch) => void; onRemove?: () => void }) {
    const ready = n(r.area) > 0 && n(r.contractorRate) > 0 && n(r.inHouseRate) > 0;
    const saving = n(r.area) * (n(r.contractorRate) - n(r.inHouseRate));
    const field = (label: string, key: "area" | "contractorRate" | "inHouseRate", prefix: string) => (
        <label className="block text-sm">
            <span className="block truncate text-xs text-stone-500 sm:text-sm">{label}</span>
            <span className="relative block">
                {prefix && (
                    <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 mt-1 flex items-center text-xs text-stone-400">
                        {prefix}
                    </span>
                )}
                <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={r[key]}
                    onChange={(e) => onChange({ [key]: e.target.value === "" ? "" : Number(e.target.value) })}
                    className={`${input} ${prefix ? "pl-7" : "pl-3"}`}
                />
            </span>
        </label>
    );

    return (
        <li className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_24rem_14rem] md:items-end">
            {r.isNew ? (
                <div className="min-w-0">
                    <div className="flex items-end gap-2">
                        <label className="block min-w-0 flex-1 text-sm">
                            <span className="block text-xs text-stone-500 sm:text-sm">New work item</span>
                            <input id={`work-${r.key}`} value={r.work} onChange={(e) => onChange({ work: e.target.value })} maxLength={120} placeholder="e.g. Flooring" className={`${input} pl-3`} />
                        </label>
                        {onRemove && (
                            <button type="button" onClick={onRemove} aria-label="Remove this new work item" className="mb-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900">
                                <FiX aria-hidden />
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <p className="min-w-0 wrap-break-word font-medium text-stone-900 md:pb-2.5">{r.work}</p>
            )}
            {/* Side by side even on a phone: one short row per work item */}
            <div className="grid grid-cols-3 gap-2">
                {field("Area sqft", "area", "")}
                {field("Contractor ₹", "contractorRate", "₹")}
                {field("In-house ₹", "inHouseRate", "₹")}
            </div>
            <div className="md:flex md:justify-end md:pb-2.5">
                {ready ? (
                    // The same green / red pill as the Project page's work item form
                    <span
                        className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${saving >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                        {saving >= 0 ? <FiTrendingUp aria-hidden /> : <FiTrendingDown aria-hidden />}
                        {saving >= 0 ? `In-house saves ${rupees(saving)}` : `In-house costs ${rupees(-saving)} more`}
                    </span>
                ) : (
                    <span className="text-sm text-stone-400">Enter all three to compare</span>
                )}
            </div>
        </li>
    );
}