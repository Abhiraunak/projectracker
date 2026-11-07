"use client";

import { useState, type FormEvent } from "react";
import { FiEdit2, FiPlus, FiSliders } from "react-icons/fi";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { MoneyInput } from "@/components/utilites/MoneyInput";
import { useProject, useUpdateProject } from "@/hooks/useLabourProjects";
import { useProjectProgress } from "@/hooks/useProjectPages";
import { useCan } from "@/hooks/useProjectAccess";
import { describeError, toFormData, type ApiTask } from "@/lib/api";
import { rupees, shortDate } from "@/lib/projects/hub";

/** Local date: toISOString() would give yesterday early in the morning in India */
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const field = "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:outline-none";
const clampPct = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
const isLate = (t: ApiTask, today: string) => t.progress < 100 && !!t.endDate && t.endDate < today;

/**
 * The project's work items in one card: each work item with its
 * dates, progress, cost of work, paid and left. "Add work item" adds one; the pencil edits one (name, dates, cost,
 * paid, progress); "Update progress" turns the progress column into sliders for every item at once.
 * A work item past its end date and not finished gets a red "late" tag. Everything saves into the project, so it
 * shows everywhere (Expenditure, the project tile). Materials are not linked to work items.
 */
export function WorkItems({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const progress = useProjectProgress(projectId); // work done vs time used, worked out by the server
  const canEdit = useCan("project.manage");
  const save = useUpdateProject();
  const [dialog, setDialog] = useState<{ editing: ApiTask | null } | null>(null);
  const [draft, setDraft] = useState<Record<string, number> | null>(null); // "Update progress": id → %

  if (project.isPending) return <div aria-busy="true" className="h-64 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />;
  if (project.isError)
    return (
      <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Couldn&rsquo;t load the work items. {describeError(project.error)}
      </p>
    );

  const tasks = project.data.tasks;
  const today = progress.data?.today ?? todayLocal();
  const total = tasks.reduce((s, t) => s + t.stipulated, 0);
  const paid = tasks.reduce((s, t) => s + t.paid, 0);
  const left = tasks.reduce((s, t) => s + Math.max(0, t.stipulated - t.paid), 0);
  const th = "px-2 py-2 text-xs font-medium uppercase tracking-wide text-stone-500 sm:px-3";
  const td = "px-2 py-2.5 sm:px-3";
  const updating = draft !== null;

  const startUpdating = () => setDraft(Object.fromEntries(tasks.map((t) => [t.id, clampPct(t.progress)])));
  const saveProgress = () => {
    if (!draft || save.isPending) return;
    const data = toFormData(project.data);
    data.tasks = data.tasks.map((t) => (t.id in draft ? { ...t, progress: draft[t.id]! } : t));
    save.mutate({ id: projectId, data }, { onSuccess: () => setDraft(null) });
  };

  const progressCell = (t: ApiTask) => {
    const pct = clampPct(draft?.[t.id] ?? t.progress);
    if (updating)
      return (
        <span className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={pct}
            onChange={(e) => setDraft((d) => ({ ...d, [t.id]: Number(e.target.value) }))}
            aria-label={`Progress of ${t.work}`}
            className="h-6 min-w-0 flex-1 accent-stone-900"
          />
          <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-stone-900">{pct}%</span>
        </span>
      );
    const tone = pct >= 100 ? "bg-emerald-600" : isLate(t, today) ? "bg-red-500" : "bg-blue-600";
    return (
      <span className="flex items-center gap-2">
        <span aria-hidden className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-100">
          <span className={`block h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
        </span>
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-stone-700">{pct}%</span>
      </span>
    );
  };

  return (
    <section aria-label="Work items" className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <header className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-stone-50 px-4 py-2.5">
        <h2 className="mr-auto text-sm font-semibold text-stone-900">
          Work items <span className="font-normal text-stone-500">· {tasks.length}</span>
        </h2>
        {canEdit &&
          (updating ? (
            <>
              <button type="button" onClick={() => setDraft(null)} disabled={save.isPending} className="min-h-10 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100">
                Cancel
              </button>
              <button type="button" onClick={saveProgress} disabled={save.isPending} className="min-h-10 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
                {save.isPending ? "Saving…" : "Save progress"}
              </button>
            </>
          ) : (
            <>
              {tasks.length > 0 && (
                <button type="button" onClick={startUpdating} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:border-stone-500">
                  <FiSliders aria-hidden /> <span className="sm:hidden">Progress</span>
                  <span className="hidden sm:inline">Update progress</span>
                </button>
              )}
              <button type="button" onClick={() => setDialog({ editing: null })} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-stone-900 px-3 text-sm font-medium text-white hover:bg-stone-800">
                <FiPlus aria-hidden /> Add<span className="hidden sm:inline"> work item</span>
              </button>
            </>
          ))}
      </header>


      {updating && save.isError && (
        <p role="alert" className="px-4 pt-3 text-sm text-red-700">
          {describeError(save.error)}
        </p>
      )}

      {tasks.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-stone-500">No work items yet. Use Add work item.</p>
      ) : (
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col />
            <col className="hidden w-[22%] sm:table-column" />
            <col className="w-[26%] sm:w-[14%]" />
            <col className="hidden w-[14%] sm:table-column" />
            <col className="w-[26%] sm:w-[14%]" />
            {canEdit && <col className="w-12" />}
          </colgroup>
          <thead>
            <tr className="border-b border-stone-100">
              <th scope="col" className={`${th} text-left`}>
                Work
              </th>
              <th scope="col" className={`${th} hidden text-left sm:table-cell`}>
                Progress
              </th>
              <th scope="col" className={`${th} text-right`}>
                Cost
              </th>
              <th scope="col" className={`${th} hidden text-right sm:table-cell`}>
                Paid
              </th>
              <th scope="col" className={`${th} text-right`}>
                Left
              </th>
              {canEdit && (
                <th scope="col" className={th}>
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
                  <th scope="row" className={`${td} min-w-0 text-left font-medium text-stone-900`}>
                    <span className="wrap-break-word">{t.work}</span>
                    {isLate(t, today) && <span className="ml-1.5 inline-block rounded-full bg-red-50 px-2 py-0.5 align-middle text-[11px] font-medium text-red-700">late</span>}
                    <span className="block text-xs font-normal text-stone-500">
                      {t.startDate && t.endDate ? `${shortDate(t.startDate)} – ${shortDate(t.endDate)}` : "No dates"}
                    </span>
                    {/* narrow screens: progress sits under the name */}
                    <span className="mt-1.5 block font-normal sm:hidden">{progressCell(t)}</span>
                  </th>
                  <td className={`${td} hidden pt-3 sm:table-cell`}>{progressCell(t)}</td>
                  <td className={`${td} whitespace-nowrap text-right text-stone-900`}>{rupees(t.stipulated)}</td>
                  <td className={`${td} hidden whitespace-nowrap text-right text-stone-700 sm:table-cell`}>{t.paid > 0 ? rupees(t.paid) : "–"}</td>
                  <td className={`${td} whitespace-nowrap text-right font-semibold ${due > 0.5 ? "text-amber-700" : due < -0.5 ? "text-red-700" : "text-emerald-700"}`}>
                    {due > 0.5 ? rupees(due) : due < -0.5 ? `${rupees(-due)} extra` : t.stipulated > 0 ? "Paid" : "–"}
                    {t.paid > 0 && <span className="block text-xs font-normal text-stone-500 sm:hidden">paid {rupees(t.paid)}</span>}
                  </td>
                  {canEdit && (
                    <td className="px-1 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => setDialog({ editing: t })}
                        disabled={updating}
                        aria-label={`Edit ${t.work}`}
                        title="Edit"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30"
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
              <td className="hidden sm:table-cell" />
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


/** Add or edit one work item: name, dates, cost of work, paid so far and (when editing) progress */
function WorkItemDialog({ projectId, editing, onClose }: { projectId: string; editing: ApiTask | null; onClose: () => void }) {
  const project = useProject(projectId);
  const save = useUpdateProject();
  const [work, setWork] = useState(editing?.work ?? "");
  const [start, setStart] = useState(editing?.startDate || todayLocal());
  const [end, setEnd] = useState(editing?.endDate ?? "");
  const [cost, setCost] = useState<number | "">(editing ? editing.stipulated : "");
  const [paid, setPaid] = useState<number | "">(editing ? editing.paid : "");
  const [done, setDone] = useState(clampPct(editing?.progress ?? 0));
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
    const item = { work: work.trim(), startDate: start, endDate: end, stipulated: cost === "" ? 0 : cost, paid: paid === "" ? 0 : paid, progress: done };
    data.tasks = editing
      ? data.tasks.map((t) => (t.id === editing.id ? { ...t, ...item } : t))
      : [...data.tasks, { id: `new-${Date.now()}`, area: "", contractorRate: "", inHouseRate: "", ...item }];
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
        {editing && (
          <label className="block min-w-0 text-sm font-medium text-stone-700">
            Progress <b className="font-semibold tabular-nums text-stone-900">{done}%</b>
            <input type="range" min={0} max={100} step={5} value={done} onChange={(e) => setDone(Number(e.target.value))} className="mt-2 h-6 w-full accent-stone-900" />
          </label>
        )}
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