"use client";

import { useState } from "react";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { MoneyInput } from "@/components/utilites/MoneyInput";
import { useSetProjectDetails } from "@/hooks/useProjectHub";
import { describeError } from "@/lib/api";

export interface EditableProject {
  id: string;
  title: string;
  firmName?: string | null;
  /** What the whole job should cost; null = not set yet */
  projectCost: number | null;
  /** The project's own start and finish ("2026-11-21"); null = worked out from the work items */
  startDate?: string | null;
  endDate?: string | null;
}

/** Change the project's name, the firm or client shown above it, the project cost, and its start and finish dates */
export function EditDetailsDialog({ project, onClose }: { project: EditableProject; onClose: () => void }) {
  const [title, setTitle] = useState(project.title);
  const [firm, setFirm] = useState(project.firmName ?? "");
  const [cost, setCost] = useState<number | "">(project.projectCost ?? "");
  const [start, setStart] = useState(project.startDate ?? "");
  const [end, setEnd] = useState(project.endDate ?? "");
  const badDates = !!start && !!end && end < start;
  const save = useSetProjectDetails(project.id);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || badDates) return;
    save.mutate(
      { title: title.trim(), firmName: firm.trim() || null, projectCost: cost === "" ? null : cost, startDate: start || null, endDate: end || null },
      { onSuccess: onClose }
    );
  };

  const field = "mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none";

  return (
    <ModalDialog open onClose={onClose} label="Edit project" locked={save.isPending}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Edit project</h2>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Project name</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} className={field} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Firm or client</span>
          <input value={firm} onChange={(e) => setFirm(e.target.value)} maxLength={120} placeholder="Shown above the name on the tile" className={field} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Project cost</span>
          <MoneyInput value={cost} onChange={setCost} max={1_000_000_000_000} wrapperClassName="mt-1" placeholder="e.g. 500000" />
          {cost !== "" && cost > 0 && <span className="mt-1 block text-xs tabular-nums text-stone-500">₹{cost.toLocaleString("en-IN")}</span>}
        </label>
        <fieldset className="text-sm">
          <legend className="font-medium text-stone-700">Project dates</legend>
          <span className="block text-xs text-stone-500">Leave empty to use the work items&apos; dates (earliest start to latest finish).</span>
          <div className="mt-1 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-stone-600">Start</span>
              <input type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="text-xs text-stone-600">Finish</span>
              <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} aria-invalid={badDates} className={field} />
            </label>
          </div>
          {badDates && (
            <span role="alert" className="mt-1 block text-xs text-red-700">
              The finish date can&apos;t be before the start date.
            </span>
          )}
          {(start || end) && (
            <button
              type="button"
              onClick={() => {
                setStart("");
                setEnd("");
              }}
              className="mt-1 text-xs font-medium text-stone-600 underline underline-offset-2"
            >
              Clear dates
            </button>
          )}
        </fieldset>

        {save.isError && (
          <p role="alert" className="text-sm text-red-700">
            {describeError(save.error)}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={save.isPending} className="min-h-11 rounded-lg px-4 text-sm font-medium text-stone-600 hover:bg-stone-100">
            Cancel
          </button>
          <button type="submit" disabled={save.isPending || !title.trim() || badDates} className="min-h-11 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}