"use client";

import { useState } from "react";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { MoneyInput } from "@/components/utilites/MoneyInput";
import { useSetProjectDetails } from "@/hooks/useProjectHub";
import { describeError } from "@/lib/api";
import { DatePick } from "./sections/labour-simple/DatePick";
import { useAccess } from "@/hooks/useProjectAccess";

/** Always "YYYY-MM-DD" for the server (a date that came with a time keeps only its day); "" stays empty */
const ymd = (v: string | null | undefined) => (v ? v.slice(0, 10) : "");

export interface EditableProject {
  id: string;
  title: string;
  firmName?: string | null;
  /** PT-001, or the admin's own number */
  number?: string;
  customNumber?: boolean;
  /** What the whole job should cost; null = not set yet */
  projectCost: number | null;
  /** The project's own start and finish ("2026-11-21"); null = worked out from the work items */
  startDate?: string | null;
  endDate?: string | null;
}

/** Change the project's name, the firm or client shown above it, the project cost, and its start and finish dates */
export function EditDetailsDialog({ project, onClose }: { project: EditableProject; onClose: () => void }) {
  const isAdmin = useAccess().isAdmin; // only an admin may change the project number
  const [number, setNumber] = useState(project.number ?? "");
  const [title, setTitle] = useState(project.title);
  const [firm, setFirm] = useState(project.firmName ?? "");
  const [cost, setCost] = useState<number | "">(project.projectCost ?? "");
  const [start, setStart] = useState(ymd(project.startDate));
  const [end, setEnd] = useState(ymd(project.endDate));
  const badDates = !!start && !!end && end < start;
  const save = useSetProjectDetails(project.id);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || badDates) return;
    save.mutate(
      {
        // The number goes only when an admin changed it (others can't, and the server would refuse)
        ...(isAdmin && number.trim().toUpperCase() !== (project.number ?? "").toUpperCase() ? { number: number.trim() || null } : {}),
        title: title.trim(),
        firmName: firm.trim() || null,
        projectCost: cost === "" ? null : Number(cost),
        startDate: ymd(start) || null,
        endDate: ymd(end) || null,
      },
      { onSuccess: onClose }
    );
  };

  const field = "mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none";

  return (
    <ModalDialog open onClose={onClose} label="Edit project" locked={save.isPending}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Edit project</h2>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Project number</span>
          {isAdmin ? (
            <>
              <span className="block text-xs text-stone-500">Given in order (PT-001, PT-002…). You can set your own, like the firm&apos;s job number; leave empty to go back to the automatic one.</span>
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value.toUpperCase())}
                maxLength={30}
                pattern="[A-Za-z0-9\-/ ]*"
                placeholder="PT-001"
                className={`${field} font-mono uppercase tracking-wide`}
              />
            </>
          ) : (
            <span className="mt-1 flex min-h-11 items-center rounded-lg border border-stone-200 bg-stone-50 px-3 font-mono tracking-wide text-stone-600">
              {project.number ?? "—"}
              <span className="ml-auto font-sans text-xs text-stone-500">Only an admin can change it</span>
            </span>
          )}
        </label>
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
          <span className="block text-xs text-stone-500">Our own cost for the whole job, not the BOQ amount the client sees. Everything spent is measured against it. Leave empty if not decided yet.</span>
          <MoneyInput value={cost} onChange={setCost} max={1_000_000_000_000} wrapperClassName="mt-1" placeholder="e.g. 500000" />
          {cost !== "" && cost > 0 && <span className="mt-1 block text-xs tabular-nums text-stone-500">₹{cost.toLocaleString("en-IN")}</span>}
        </label>
        <fieldset className="text-sm">
          <legend className="font-medium text-stone-700">Project dates</legend>
          <span className="block text-xs text-stone-500">Leave empty to use the work items&apos; dates (earliest start to latest finish).</span>
          <div className="mt-1 grid grid-cols-2 gap-3">
            {/* The app's date picker: shows day month year (1 Nov 2026), sends 2026-11-01 */}
            <div className="block">
              <span className="text-xs text-stone-600">Start</span>
              <DatePick value={start} onChange={setStart} label="Start" className="mt-1 w-full" />
            </div>
            <div className="block">
              <span className="text-xs text-stone-600">Finish</span>
              <DatePick value={end} onChange={setEnd} label="Finish" className="mt-1 w-full" align="right" />
            </div>
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