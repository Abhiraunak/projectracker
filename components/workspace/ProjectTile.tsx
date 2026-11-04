"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiAlertTriangle, FiCalendar, FiCheckCircle, FiClock, FiEdit2 } from "react-icons/fi";
import { useDeleteProject, useSetProjectStatus } from "@/hooks/useLabourProjects";
import { useCan } from "@/hooks/useProjectAccess";
import { hrefFor, onPlaceClick } from "@/hooks/useWorkspacePlace";
import { describeError, type ProjectSummary } from "@/lib/api";
import { plural, rupees, rupeesShort } from "@/lib/projects/hub";
import { EditDetailsDialog } from "./EditDetailsDialog";
import { ConfirmDeleteDialog } from "../utilites/Confirmdeletedialog";

/** Full amounts while they fit in a third of the tile; ₹1.29 Cr beyond ₹10 L */
const fit = (v: number) => (Math.abs(v) >= 1_000_000 ? rupeesShort(v) : rupees(v));

/* ------------------------------------------- what to show ------------------------------------------- */

const DAY = 86_400_000;
const dateOf = (s: string | null) => (s ? new Date(`${s}T00:00:00`) : null);
const longDay = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

type Tone = "good" | "bad" | "neutral";

/** "18d left", "Overdue by 3d", "Due today", "Ready to complete"… */
export function scheduleOf(p: Pick<ProjectSummary, "status" | "progress" | "endDate">, today = new Date()): { label: string; tone: Tone } {
  if (p.status === "COMPLETED") return { label: "Completed", tone: "good" };
  if (p.progress >= 100) return { label: "Ready to complete", tone: "good" };
  const end = dateOf(p.endDate);
  if (!end) return { label: "No end date", tone: "neutral" };
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((end.getTime() - start.getTime()) / DAY);
  if (days < 0) return { label: `Overdue by ${-days}d`, tone: "bad" };
  return { label: days === 0 ? "Due today" : `${days}d left`, tone: "neutral" };
}

const CHIP: Record<Tone, { cls: string; Icon: typeof FiClock }> = {
  good: { cls: "border-emerald-200 text-emerald-700", Icon: FiCheckCircle },
  bad: { cls: "border-red-200 text-red-700", Icon: FiAlertTriangle },
  neutral: { cls: "border-stone-200 text-stone-600", Icon: FiClock },
};

/* --------------------------------------------- the tile --------------------------------------------- */

/**
 * One project on the Projects page: when it runs and how much time is left, the budget and what's spent, the labour
 * figures (agreed, paid, still to pay), and how much work is done. Tap anywhere on it to open the project.
 * Mark completed / Reopen and Delete sit underneath for people allowed to use them.
 *
 * Memoised, so a tile re-renders only when its own project's figures change.
 */
export const ProjectTile = memo(function ProjectTile({
  project: p,
  onIntent,
  linkBase,
}: {
  project: ProjectSummary;
  onIntent: (id: string) => void;
  /** Shown outside the Projects page (e.g. on the dashboard): the page the tile opens, e.g. "/dashboard/projects" */
  linkBase?: string;
}) {
  const router = useRouter();
  const place = useMemo(() => ({ projectId: p.id, section: "overview" as const }), [p.id]);
  const href = linkBase ? `${linkBase}${hrefFor(place)}` : hrefFor(place);
  // On the Projects page the tile moves inside the workspace; elsewhere it goes to the Projects page
  const open = linkBase
    ? (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      router.push(href);
    }
    : onPlaceClick(place);
  const intent = useCallback(() => onIntent(p.id), [onIntent, p.id]);

  const s = scheduleOf(p);
  const chip = CHIP[s.tone];
  const start = dateOf(p.startDate);
  const end = dateOf(p.endDate);

  // The project cost is the whole budget; without one, the work items' agreed amounts are the budget
  const budget = p.projectCost ?? p.budget;
  const left = budget - p.spent;
  const usedPct = budget > 0 ? Math.min(100, Math.round((p.spent / budget) * 100)) : 0;
  const toPay = p.budget - p.paid;
  const progress = Math.max(0, Math.min(100, Math.round(p.progress)));

  return (
    <li className="[content-visibility:auto] [contain-intrinsic-size:auto_340px]">
      <article className="flex h-full flex-col rounded-xl border border-stone-200 bg-white transition-[border-color,box-shadow] hover:border-stone-400 hover:shadow-sm">
        <a
          href={href}
          onClick={open}
          onPointerEnter={intent}
          onTouchStart={intent}
          onFocus={intent}
          aria-label={`Open ${p.title}`}
          className="flex flex-1 flex-col gap-4 rounded-t-xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900 active:bg-stone-50 sm:p-5"
        >
          {/* name, dates, time left */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {p.firmName && <p className="truncate text-xs font-medium uppercase tracking-wide text-stone-500">{p.firmName}</p>}
              <h2 className="line-clamp-2 text-base font-semibold leading-snug text-stone-900">{p.title}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                <FiCalendar aria-hidden className="shrink-0" />
                {start && end ? `${longDay.format(start)} to ${longDay.format(end)}` : start ? `From ${longDay.format(start)}` : "No dates set"}
              </p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${chip.cls}`}>
              <chip.Icon aria-hidden /> {s.label}
            </span>
          </div>

          {/* budget */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">{p.projectCost === null ? "Labour budget" : "Project budget"}</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-stone-900">{rupees(budget)}</p>
            <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div className={`h-full rounded-full ${left < 0 ? "bg-red-600" : "bg-stone-800"}`} style={{ width: `${usedPct}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between gap-2 text-xs tabular-nums">
              <span className="text-stone-500">{rupees(p.spent)} spent</span>
              <span className={left < 0 ? "font-medium text-red-700" : "text-stone-500"}>{left < 0 ? `Over by ${rupees(-left)}` : `${rupees(left)} left`}</span>
            </div>
          </div>

          {/* labour */}
          <div className="rounded-lg border border-stone-200 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Labour · {plural(p.taskCount, "work item")}</p>
            <dl className="mt-1.5 grid grid-cols-3 gap-2 text-sm">
              <Figure label="Agreed" value={p.budget} />
              <Figure label="Paid" value={p.paid} />
              <Figure label={toPay < 0 ? "Overpaid" : "To pay"} value={Math.abs(toPay)} warn={toPay < 0} />
            </dl>
          </div>

          {/* work done */}
          <div className="mt-auto">
            <div className="flex justify-between text-xs text-stone-500">
              <span>Work done</span>
              <span className="font-medium tabular-nums text-stone-900">{progress}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={`${p.title}: work done`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100"
            >
              <div className="h-full rounded-full bg-orange-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </a>

        <TileActions project={p} />
      </article>
    </li>
  );
});

function Figure({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd title={rupees(value)} className={`truncate font-semibold tabular-nums ${warn ? "text-red-700" : "text-stone-900"}`}>
        {fit(value)}
      </dd>
    </div>
  );
}

/* -------------------------------------------- the actions -------------------------------------------- */

/** Mark completed / Reopen, Edit (name, firm, project cost) and Delete, for people allowed to. Outside the link, so they never open the project. */
function TileActions({ project: p }: { project: ProjectSummary }) {
  const canToggle = useCan("project.manage");
  const canDelete = useCan("project.delete");
  const setStatus = useSetProjectStatus();
  const remove = useDeleteProject();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!canToggle && !canDelete) return null;
  const completed = p.status === "COMPLETED";
  // What the Edit dialog needs. firmName is optional on ProjectSummary (older APIs leave it out), so undefined
  // becomes null. Built as a variable, so it fits both the older dialog (no cost) and the newer one (with cost).
  const editable = { id: p.id, title: p.title, firmName: p.firmName ?? null, projectCost: p.projectCost };
  // Everything that goes with the project, so nobody is surprised
  const connected = [plural(p.taskCount, "work item"), ...(p.attendanceCount > 0 ? [plural(p.attendanceCount, "attendance entry", "attendance entries")] : [])].join(" and ");

  return (
    <div className="flex min-h-11 items-center justify-between gap-2 border-t border-stone-100 px-2 text-sm">
      {canToggle ? (
        <button
          type="button"
          disabled={setStatus.isPending}
          onClick={() => setStatus.mutate({ id: p.id, status: completed ? "ONGOING" : "COMPLETED" })}
          className="min-h-10 rounded-lg px-2 font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50"
        >
          {setStatus.isPending ? "Saving…" : completed ? "Reopen" : "Mark completed"}
        </button>
      ) : (
        <span />
      )}
      {setStatus.isError && (
        <span role="alert" className="truncate text-xs text-red-700">
          {describeError(setStatus.error)}
        </span>
      )}
      <span className="flex items-center gap-1">
        {canToggle && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
          >
            <FiEdit2 aria-hidden /> Edit
          </button>
        )}
        {canDelete && (
          <button type="button" onClick={() => setConfirming(true)} className="min-h-10 rounded-lg px-2 font-medium text-red-700 hover:bg-red-50">
            Delete
          </button>
        )}
      </span>
      {editing && <EditDetailsDialog project={editable} onClose={() => setEditing(false)} />}
      {confirming && (
        <ConfirmDeleteDialog
          open
          onClose={() => setConfirming(false)}
          onConfirm={() => remove.mutate(p.id, { onSuccess: () => setConfirming(false) })}
          title="Delete project?"
          itemName={p.title}
          warning={
            <>
              By deleting this project, <strong>{connected}</strong> will also be permanently deleted.
            </>
          }
          confirmPhrase="delete my project"
          confirmLabel="Delete project"
          pending={remove.isPending}
          error={remove.isError ? describeError(remove.error) : null}
        />
      )}
    </div>
  );
}