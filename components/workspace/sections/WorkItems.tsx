"use client";

import { useState, type FormEvent } from "react";
import { FiEdit2, FiPlus } from "react-icons/fi";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { MoneyInput } from "@/components/utilites/MoneyInput";
import { useProject, useUpdateProject } from "@/hooks/useLabourProjects";
import { useCan } from "@/hooks/useProjectAccess";
import { describeError, toFormData, type ApiTask } from "@/lib/api";
import { rupees, shortDate } from "@/lib/projects/hub";

/** Local date: toISOString() would give yesterday early in the morning in India */
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const field = "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:outline-none";

/**
 * The project's work items as a table: name, dates, cost of work, paid, left to pay. "Add work item" and the edit
 * button on each row save straight into the project, so the change shows everywhere (Overview, Progress, Expenditure,
 * the project tile). Materials are not linked to work items.
 */
export function WorkItems({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const canEdit = useCan("project.manage");
  const [dialog, setDialog] = useState<{ editing: ApiTask | null } | null>(null);

  if (project.isPending) return <div aria-busy="true" className="h-40 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />;
  if (project.isError) return null; // the progress block above already reports a failed load
  const tasks = project.data.tasks;
  const total = tasks.reduce((s, t) => s + t.stipulated, 0);
  const paid = tasks.reduce((s, t) => s + t.paid, 0);
  const left = tasks.reduce((s, t) => s + Math.max(0, t.stipulated - t.paid), 0);
  const th = "px-2 py-2 text-xs font-medium uppercase tracking-wide text-stone-500 sm:px-3";
  const td = "px-2 py-2.5 sm:px-3";

  return (
    <section aria-label="Work items and costs" className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-stone-900">
          Work items <span className="font-normal text-stone-500">· {tasks.length}</span>
        </h2>
        {canEdit && (
          <button
            type="button"
            onClick={() => setDialog({ editing: null })}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-stone-900 px-3 text-sm font-medium text-white hover:bg-stone-800"
          >
            <FiPlus aria-hidden /> Add work item
          </button>
        )}
      </header>

      {tasks.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-stone-500">No work items yet. Use Add work item.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100">
              <th scope="col" className={`${th} text-left`}>
                Work
              </th>
              <th scope="col" className={`${th} hidden text-left md:table-cell`}>
                Starts
              </th>
              <th scope="col" className={`${th} hidden text-left md:table-cell`}>
                Ends
              </th>
              <th scope="col" className={`${th} text-right`}>
                Cost<span className="hidden sm:inline"> of work</span>
              </th>
              <th scope="col" className={`${th} hidden text-right sm:table-cell`}>
                Paid
              </th>
              <th scope="col" className={`${th} text-right`}>
                Left
              </th>
              {canEdit && (
                <th scope="col" className={`${th} w-12`}>
                  <span className="sr-only">Edit</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 tabular-nums">
            {tasks.map((t) => {
              const due = t.stipulated - t.paid;
              return (
                <tr key={t.id} className="align-top">
                  <th scope="row" className={`${td} min-w-0 wrap-break-word text-left font-medium text-stone-900`}>
                    {t.work}
                    {/* narrow screens: the dates sit under the name */}
                    <span className="block text-xs font-normal text-stone-500 md:hidden">
                      {t.startDate && t.endDate ? `${shortDate(t.startDate)} – ${shortDate(t.endDate)}` : "No dates"}
                    </span>
                  </th>
                  <td className={`${td} hidden whitespace-nowrap text-stone-700 md:table-cell`}>{t.startDate ? shortDate(t.startDate) : "–"}</td>
                  <td className={`${td} hidden whitespace-nowrap text-stone-700 md:table-cell`}>{t.endDate ? shortDate(t.endDate) : "–"}</td>
                  <td className={`${td} whitespace-nowrap text-right text-stone-900`}>{rupees(t.stipulated)}</td>
                  <td className={`${td} hidden whitespace-nowrap text-right text-stone-700 sm:table-cell`}>{t.paid > 0 ? rupees(t.paid) : "–"}</td>
                  <td className={`${td} whitespace-nowrap text-right font-semibold ${due > 0.5 ? "text-amber-700" : due < -0.5 ? "text-red-700" : "text-emerald-700"}`}>
                    {due > 0.5 ? rupees(due) : due < -0.5 ? `${rupees(-due)} extra` : t.stipulated > 0 ? "Paid" : "–"}
                    {/* narrow screens: what's been paid sits under what's left */}
                    {t.paid > 0 && <span className="block text-xs font-normal text-stone-500 sm:hidden">paid {rupees(t.paid)}</span>}
                  </td>
                  {canEdit && (
                    <td className="px-1 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => setDialog({ editing: t })}
                        aria-label={`Edit ${t.work}`}
                        title="Edit"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                      >
                        <FiEdit2 aria-hidden />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-stone-300 bg-stone-50 font-semibold tabular-nums text-stone-900">
              <th scope="row" className={`${td} text-left`}>
                Total
              </th>
              <td className="hidden md:table-cell" />
              <td className="hidden md:table-cell" />
              <td className={`${td} whitespace-nowrap text-right`}>{rupees(total)}</td>
              <td className={`${td} hidden whitespace-nowrap text-right sm:table-cell`}>{rupees(paid)}</td>
              <td className={`${td} whitespace-nowrap text-right`}>
                {rupees(left)}
                <span className="block text-xs font-normal text-stone-500 sm:hidden">paid {rupees(paid)}</span>
              </td>
              {canEdit && <td />}
            </tr>
          </tfoot>
        </table>
      )}

      {dialog && <WorkItemDialog projectId={projectId} editing={dialog.editing} onClose={() => setDialog(null)} />}
    </section>
  );
}

/** Add or edit one work item: name, dates, cost of work, and (when editing) how much has been paid */
function WorkItemDialog({ projectId, editing, onClose }: { projectId: string; editing: ApiTask | null; onClose: () => void }) {
  const project = useProject(projectId);
  const save = useUpdateProject();
  const [work, setWork] = useState(editing?.work ?? "");
  const [start, setStart] = useState(editing?.startDate || todayLocal());
  const [end, setEnd] = useState(editing?.endDate ?? "");
  const [cost, setCost] = useState<number | "">(editing ? editing.stipulated : "");
  const [paid, setPaid] = useState<number | "">(editing ? editing.paid : "");
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!project.data || save.isPending) return;
    if (!work.trim()) return setProblem("Give the work a name.");
    if (!start || !end) return setProblem("Pick the start and end dates.");
    if (end < start) return setProblem("The end date is before the start.");
    setProblem(null);

    // The whole project is saved with every work item (that's how the server takes it): change one, or add one
    const data = toFormData(project.data);
    const item = { work: work.trim(), startDate: start, endDate: end, stipulated: cost === "" ? 0 : cost, paid: paid === "" ? 0 : paid };
    data.tasks = editing
      ? data.tasks.map((t) => (t.id === editing.id ? { ...t, ...item } : t))
      : [...data.tasks, { id: `new-${Date.now()}`, area: "", contractorRate: "", inHouseRate: "", progress: 0, ...item }];
    save.mutate({ id: projectId, data }, { onSuccess: onClose });
  };

  return (
    <ModalDialog open onClose={onClose} label={editing ? `Edit ${editing.work}` : "Add work item"} locked={save.isPending}>
      <form onSubmit={submit} noValidate className="min-w-0 space-y-4 p-5">
        <h2 className="text-lg font-semibold text-stone-900">{editing ? "Edit work item" : "Add work item"}</h2>
        <label className="block min-w-0 text-sm font-medium text-stone-700">
          Name of work
          <input value={work} onChange={(e) => setWork(e.target.value)} maxLength={120} autoFocus={!editing} placeholder="e.g. Flooring" className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0 text-sm font-medium text-stone-700">
            Starts
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={field} />
          </label>
          <label className="block min-w-0 text-sm font-medium text-stone-700">
            Ends
            <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className={field} />
          </label>
        </div>
        <label className="block min-w-0 text-sm font-medium text-stone-700">
          Cost of work
          <MoneyInput value={cost} onChange={setCost} wrapperClassName="mt-1" className="min-h-11" />
        </label>
        <label className="block min-w-0 text-sm font-medium text-stone-700">
          Paid so far <span className="font-normal text-stone-400">(optional)</span>
          <MoneyInput value={paid} onChange={setPaid} wrapperClassName="mt-1" className="min-h-11" />
        </label>
        {cost !== "" && cost > 0 && (
          <p className="rounded-lg bg-stone-50 px-3 py-2.5 text-sm text-stone-700">
            Left to pay <b className="font-semibold tabular-nums text-stone-900">{rupees(Math.max(0, cost - (paid === "" ? 0 : paid)))}</b>
          </p>
        )}
        {(problem || save.isError) && (
          <p role="alert" className="text-sm text-red-700">
            {problem ?? describeError(save.error)}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={save.isPending} className="min-h-11 rounded-lg px-4 text-sm font-medium text-stone-600 hover:bg-stone-100">
            Cancel
          </button>
          <button type="submit" disabled={save.isPending || !project.data} className="min-h-11 rounded-lg bg-stone-900 px-5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
            {save.isPending ? "Saving…" : editing ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}