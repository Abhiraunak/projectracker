"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { MoneyInput } from "@/components/utilites/MoneyInput";
import { useCreateProject } from "@/hooks/useLabourProjects";
import { goTo } from "@/hooks/useWorkspacePlace";
import { describeError } from "@/lib/api";
import { hubApi } from "@/lib/projects/hub";

const field = "mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:outline-none";

/** Local date: toISOString() would give yesterday early in the morning in India */
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Start a project from the Projects page. Only what's needed to begin: name, firm, budget, dates and the first work
 * item (every project has at least one; more are added on the Project page, as before).
 * When it's saved, the new project opens (in the workspace, or wherever `onCreated` sends it, e.g. from the dashboard).
 */
export function NewProjectDialog({ onClose, onCreated }: { onClose: () => void; onCreated?: (projectId: string) => void }) {
  const create = useCreateProject();
  const [title, setTitle] = useState("");
  const [firm, setFirm] = useState("");
  const [cost, setCost] = useState<number | "">("");
  const [start, setStart] = useState(todayLocal());
  const [end, setEnd] = useState("");
  const [work, setWork] = useState("");
  const [agreed, setAgreed] = useState<number | "">("");
  const [firmError, setFirmError] = useState<string | null>(null);

  const datesBad = !!end && end < start;
  const valid = title.trim() && start && end && !datesBad;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || create.isPending) return;
    try {
      const project = await create.mutateAsync({
        title: title.trim(),
        projectCost: cost,
        tasks: [
          {
            id: "new",
            work: work.trim() || "General work",
            area: "",
            contractorRate: "",
            inHouseRate: "",
            progress: 0,
            stipulated: agreed,
            paid: "",
            startDate: start,
            endDate: end,
          },
        ],
      });
      // The firm is saved separately (creating takes the work items; the firm is a project detail)
      if (firm.trim()) {
        try {
          await hubApi.setDetails(project.id, { firmName: firm.trim() });
        } catch (err) {
          setFirmError(`The project was created, but the firm name wasn't saved: ${describeError(err)}`);
          return;
        }
      }
      onClose();
      if (onCreated) onCreated(project.id);
      else goTo({ projectId: project.id, section: "overview" });
    } catch {
      /* shown below */
    }
  };

  return (
    <ModalDialog open onClose={onClose} label="New project" size="lg" locked={create.isPending}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">New project</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Project name">
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} autoFocus placeholder="e.g. Welham Road Residence" className={field} />
          </Field>
          <Field label="Firm or client" optional>
            <input value={firm} onChange={(e) => setFirm(e.target.value)} maxLength={120} placeholder="e.g. Mehta & Sons" className={field} />
          </Field>
        </div>

        <Field label="Project budget" optional hint="What the whole project should cost. You can set it later.">
          <MoneyInput value={cost} onChange={setCost} wrapperClassName="mt-1" className="min-h-11" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts">
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required className={field} />
          </Field>
          <Field label="Ends">
            <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} required aria-invalid={datesBad} className={`${field} ${datesBad ? "border-red-400" : ""}`} />
          </Field>
        </div>
        {datesBad && <p className="-mt-2 text-xs text-red-700">The end date is before the start.</p>}

        <fieldset className="rounded-lg border border-stone-200 p-3">
          <legend className="px-1 text-sm font-medium text-stone-700">First work item</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Work" optional>
              <input value={work} onChange={(e) => setWork(e.target.value)} maxLength={120} placeholder="General work" className={field} />
            </Field>
            <Field label="Agreed labour amount" optional>
              <MoneyInput value={agreed} onChange={setAgreed} wrapperClassName="mt-1" className="min-h-11" />
            </Field>
          </div>
          <p className="mt-2 text-xs text-stone-500">It runs on the project&apos;s dates. Add more work items any time on the Project page.</p>
        </fieldset>

        {(create.isError || firmError) && (
          <p role="alert" className="text-sm text-red-700">
            {firmError ?? describeError(create.error)}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={create.isPending} className="min-h-11 rounded-lg px-4 text-sm font-medium text-stone-600 hover:bg-stone-100">
            {firmError ? "Close" : "Cancel"}
          </button>
          <button type="submit" disabled={!valid || create.isPending} className="min-h-11 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
            {create.isPending ? "Creating…" : "Create project"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

function Field({ label, optional, hint, children }: { label: string; optional?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-stone-700">
        {label} {optional && <span className="font-normal text-stone-400">(optional)</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}