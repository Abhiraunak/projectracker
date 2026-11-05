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
}

/** Change the project's name, the firm or client shown above it, and the project cost (the total cost on the tile) */
export function EditDetailsDialog({ project, onClose }: { project: EditableProject; onClose: () => void }) {
  const [title, setTitle] = useState(project.title);
  const [firm, setFirm] = useState(project.firmName ?? "");
  const [cost, setCost] = useState<number | "">(project.projectCost ?? "");
  const save = useSetProjectDetails(project.id);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    save.mutate({ title: title.trim(), firmName: firm.trim() || null, projectCost: cost === "" ? null : cost }, { onSuccess: onClose });
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
          <span className="block text-xs text-stone-500">What the whole job should cost. Leave empty if not decided yet.</span>
          <MoneyInput value={cost} onChange={setCost} max={1_000_000_000_000} wrapperClassName="mt-1" placeholder="e.g. 500000" />
          {cost !== "" && cost > 0 && <span className="mt-1 block text-xs tabular-nums text-stone-500">₹{cost.toLocaleString("en-IN")}</span>}
        </label>
        {save.isError && (
          <p role="alert" className="text-sm text-red-700">
            {describeError(save.error)}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={save.isPending} className="min-h-11 rounded-lg px-4 text-sm font-medium text-stone-600 hover:bg-stone-100">
            Cancel
          </button>
          <button type="submit" disabled={save.isPending || !title.trim()} className="min-h-11 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}