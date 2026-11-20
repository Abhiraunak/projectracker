"use client";

import { useState, type FormEvent } from "react";
import { FiPlus } from "react-icons/fi";
import { useAddWorkItem, useWorkItems } from "@/hooks/useAttendance";
import { describeError } from "@/lib/api";
import { rupees } from "@/lib/attendance/form";

/** The work item a sheet is for; taskId null = General (site cleaning, shifting, odd jobs) */
export interface PickedWorkItem {
    taskId: string | null;
    work: string;
}

export const GENERAL: PickedWorkItem = { taskId: null, work: "General" };
export const workLabel = (w: { work?: string | null } | null | undefined) => w?.work?.trim() || "General";

/**
 * Step one of Mark attendance: what did the team work on? One button per work item of the project (the same list as
 * the Overview), General for everything else, and "Add work item", which asks only for a name.
 */
export function WorkItemPicker({ projectId, onPick }: { projectId: string; onPick: (item: PickedWorkItem) => void }) {
    const list = useWorkItems(projectId);
    const add = useAddWorkItem(projectId);
    const [adding, setAdding] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        const work = name.replace(/\s+/g, " ").trim();
        if (!work) {
            setError("Enter a name first");
            return;
        }
        setError(null);
        try {
            const { item } = await add.mutateAsync(work);
            setName("");
            setAdding(false);
            onPick({ taskId: item.id, work: item.work }); // straight to its sheet
        } catch (err) {
            setError(describeError(err));
        }
    };

    const button = "min-h-14 rounded-lg border border-stone-300 px-4 py-2 text-left hover:border-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900";
    const sub = (total: number) => (total > 0 ? rupees(total) + " so far" : "Nothing marked yet");

    return (
        <section aria-labelledby="work-item-heading" className="rounded border border-stone-300 p-4">
            <h2 id="work-item-heading" className="text-base font-semibold">
                What did the team work on?
            </h2>
            <p className="mt-0.5 text-sm text-stone-500">Pick a work item to mark its attendance. General is for site cleaning, shifting and odd jobs.</p>

            {list.isPending ? (
                <div aria-busy="true" className="mt-3 h-14 animate-pulse rounded bg-stone-100" />
            ) : list.isError ? (
                <p role="alert" className="mt-3 text-sm text-red-700">
                    {describeError(list.error)}{" "}
                    <button type="button" onClick={() => void list.refetch()} className="font-semibold underline">
                        Try again
                    </button>
                </p>
            ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                    {list.data.items.map((w) => (
                        <button key={w.id} type="button" onClick={() => onPick({ taskId: w.id, work: w.work })} className={button}>
                            <span className="block font-semibold text-stone-900">{w.work}</span>
                            <span className="block text-xs text-stone-500">{sub(w.total)}</span>
                        </button>
                    ))}
                    <button type="button" onClick={() => onPick(GENERAL)} className={button}>
                        <span className="block font-semibold text-stone-900">General</span>
                        <span className="block text-xs text-stone-500">{sub(list.data.general.total)}</span>
                    </button>
                    {!adding && (
                        <button
                            type="button"
                            onClick={() => setAdding(true)}
                            className="inline-flex min-h-14 items-center gap-2 rounded-lg border border-dashed border-stone-400 px-4 text-sm font-medium text-stone-700 hover:border-stone-900"
                        >
                            <FiPlus aria-hidden /> Add work item
                        </button>
                    )}
                </div>
            )}

            {adding && (
                <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-2">
                    <label htmlFor="new-work-item" className="sr-only">
                        Work item name
                    </label>
                    <input
                        id="new-work-item"
                        autoFocus
                        value={name}
                        maxLength={80}
                        onChange={(e) => {
                            setName(e.target.value);
                            setError(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") setAdding(false);
                        }}
                        placeholder="Waterproofing"
                        aria-invalid={!!error}
                        aria-describedby={error ? "new-work-item-error" : undefined}
                        className="h-10 w-full max-w-xs rounded border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none"
                    />
                    <button type="submit" disabled={add.isPending} className="h-10 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60">
                        {add.isPending ? "Adding…" : "Add"}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setAdding(false);
                            setName("");
                            setError(null);
                        }}
                        className="h-10 rounded-lg px-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
                    >
                        Cancel
                    </button>
                    {error && (
                        <p id="new-work-item-error" role="alert" className="w-full text-sm text-red-700">
                            {error}
                        </p>
                    )}
                </form>
            )}
        </section>
    );
}