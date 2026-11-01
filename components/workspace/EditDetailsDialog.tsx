"use client";

import { useState } from "react";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { useSetProjectDetails } from "@/hooks/useProjectHub";
import { describeError } from "@/lib/api";

/** Change the name on the tile and the firm or client shown above it */
export function EditDetailsDialog({ project, onClose }: { project: { id: string; title: string; firmName: string | null }; onClose: () => void }) {
  const [title, setTitle] = useState(project.title);
  const [firm, setFirm] = useState(project.firmName ?? "");
  const save = useSetProjectDetails(project.id);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    save.mutate({ title: title.trim(), firmName: firm.trim() || null }, { onSuccess: onClose });
  };

  return (
    <ModalDialog open onClose={onClose} label="Edit project details" locked={save.isPending}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Project details</h2>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Project name</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Firm or client</span>
          <input
            value={firm}
            onChange={(e) => setFirm(e.target.value)}
            maxLength={120}
            placeholder="Shown above the name on the tile"
            className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
          />
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
