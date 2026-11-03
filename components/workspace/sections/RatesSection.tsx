"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { FiCheck, FiEdit2, FiPlus, FiTrash2, FiTrendingDown, FiTrendingUp } from "react-icons/fi";
import { ComparisonGrid } from "@/components/labour/ComparisonGrid";
import { useCan } from "@/hooks/useProjectAccess";
import { useProject, useUpdateProject } from "@/hooks/useLabourProjects";
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

/** Rate comparison: contractor vs in-house for each work item, and only the area and the two rates to edit */
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
                project={project.data}
                onCancel={() => setEditing(false)}
                onSaved={() => {
                    setEditing(false);
                    setSaved(true);
                }}
            />
        );

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
                            <FiEdit2 aria-hidden /> {project.data.tasks.length ? "Edit rates" : "Add work items"}
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
    /** true for a row added here: its name is typed in; existing work items keep theirs */
    isNew: boolean;
    work: string;
    area: number | "";
    contractorRate: number | "";
    inHouseRate: number | "";
}
type Patch = Partial<Omit<RateRowState, "key" | "isNew">>;

const asInput = (v: number): number | "" => (v ? v : "");
const n = (v: number | "") => (v === "" ? 0 : v);
let nextKey = 0;
const blankRow = (): RateRowState => ({ key: `new-${++nextKey}`, isNew: true, work: "", area: "", contractorRate: "", inHouseRate: "" });

/** Local date: toISOString() would give yesterday early in the morning in India */
const todayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * The area and the two rates of each work item, and new work items with just a name, area and rates. Saving sends the
 * whole project back as the Project page does, with everything else (dates, budget, paid, progress) exactly as it was.
 * New items take the project's dates; they can be changed on the Project page.
 */
function RatesEditor({ project, onCancel, onSaved }: { project: ApiProject; onCancel: () => void; onSaved: () => void }) {
    const update = useUpdateProject(); // refreshes this project, the hub and the project tiles after saving
    const [rows, setRows] = useState<RateRowState[]>(() => [
        ...project.tasks.map((t) => ({ key: t.id, isNew: false, work: t.work, area: asInput(t.area), contractorRate: asInput(t.contractorRate), inHouseRate: asInput(t.inHouseRate) })),
        ...(project.tasks.length === 0 ? [blankRow()] : []),
    ]);
    const [error, setError] = useState<string | null>(null);

    const change = (key: string, patch: Patch) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    const [focusKey, setFocusKey] = useState<string | null>(null); // the row just added: its name box takes the cursor
    const addRow = () => {
        const row = blankRow();
        setRows((prev) => [...prev, row]);
        setFocusKey(row.key);
    };
    const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        // A new row left completely empty is simply ignored; one with numbers but no name is a mistake
        const added = rows.filter((r) => r.isNew && (r.work.trim() || n(r.area) || n(r.contractorRate) || n(r.inHouseRate)));
        if (added.some((r) => !r.work.trim())) {
            setError("Give every new work item a name.");
            document.getElementById(`${added.find((r) => !r.work.trim())!.key}-work`)?.focus();
            return;
        }
        setError(null);

        const starts = project.tasks.map((t) => t.startDate).filter(Boolean).sort();
        const ends = project.tasks.map((t) => t.endDate).filter(Boolean).sort();
        const startDate = starts[0] ?? todayLocal();
        const endDate = ends[ends.length - 1] ?? startDate;

        const data = toFormData(project);
        const byKey = new Map(rows.map((r) => [r.key, r]));
        data.tasks = [
            ...data.tasks.map((t) => {
                const r = byKey.get(t.id);
                return r ? { ...t, area: n(r.area), contractorRate: n(r.contractorRate), inHouseRate: n(r.inHouseRate) } : t;
            }),
            ...added.map((r) => ({
                id: r.key, // the server gives new items their own id
                work: r.work.trim(),
                area: n(r.area),
                contractorRate: n(r.contractorRate),
                inHouseRate: n(r.inHouseRate),
                progress: 0,
                stipulated: 0,
                paid: 0,
                startDate,
                endDate,
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
                <h2 className="text-lg font-semibold">Edit rates</h2>
                <button type="button" onClick={onCancel} disabled={update.isPending} className="min-h-11 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100">
                    Cancel
                </button>
            </div>

            <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
                {rows.map((r) => (
                    <RateRow key={r.key} r={r} autoFocus={r.key === focusKey} onChange={(patch) => change(r.key, patch)} onRemove={r.isNew ? () => removeRow(r.key) : undefined} />
                ))}
            </ul>

            <button
                type="button"
                onClick={addRow}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 text-sm font-medium text-stone-600 hover:border-stone-500 hover:text-stone-900"
            >
                <FiPlus aria-hidden /> Add work item
            </button>

            {(error || update.isError) && (
                <p role="alert" className="text-sm text-red-700">
                    {error ?? describeError(update.error)}
                </p>
            )}
            <div className="flex justify-end">
                <button type="submit" disabled={update.isPending} className="min-h-11 rounded-lg bg-stone-900 px-5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
                    {update.isPending ? "Saving…" : "Save rates"}
                </button>
            </div>
        </form>
    );
}

const input = "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-stone-300 bg-white pr-2 text-sm tabular-nums focus:border-stone-900 focus:outline-none";

function RateRow({ r, autoFocus, onChange, onRemove }: { r: RateRowState; autoFocus?: boolean; onChange: (patch: Patch) => void; onRemove?: () => void }) {
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
                <div className="flex items-end gap-2">
                    <label className="block min-w-0 flex-1 text-sm">
                        <span className="text-stone-500">New work item</span>
                        <input
                            id={`${r.key}-work`}
                            autoFocus={autoFocus} // once, when the row appears: never moves the cursor later
                            value={r.work}
                            onChange={(e) => onChange({ work: e.target.value })}
                            maxLength={120}
                            placeholder="e.g. Reinforced concrete works"
                            className={`${input} pl-3`}
                        />
                    </label>
                    {onRemove && (
                        <button type="button" onClick={onRemove} aria-label="Remove this new work item" className="mb-0.5 min-h-11 shrink-0 rounded-lg px-2 text-stone-400 hover:bg-red-50 hover:text-red-600">
                            <FiTrash2 aria-hidden />
                        </button>
                    )}
                </div>
            ) : (
                <p className="font-medium text-stone-900 md:pb-3">{r.work || "Untitled"}</p>
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