"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { FiAlertTriangle, FiCalendar, FiCheckCircle, FiClock } from "react-icons/fi";

import { useDeleteProject, useSetProjectStatus } from "@/hooks/useLabourProjects";
import { useCan } from "@/hooks/useProjectAccess";
import { hrefFor, onPlaceClick } from "@/hooks/useWorkspacePlace";
import { describeError, type ProjectSummary } from "@/lib/api";
import { plural, rupees, rupeesShort } from "@/lib/projects/hub";
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
  good: { cls: "bg-emerald-50 text-emerald-700", Icon: FiCheckCircle },
  bad: { cls: "bg-red-50 text-red-700", Icon: FiAlertTriangle },
  neutral: { cls: "bg-stone-100 text-stone-600", Icon: FiClock },
};

/* --------------------------------------------- the tile --------------------------------------------- */

/**
 * One project on the Projects page: the project name large with its firm beneath, the dates and time left,
 * the total cost of the project, money spent so far, the balance, and how much work is still pending.
 * Tap anywhere on it to open the project. Mark completed / Reopen and Delete sit underneath for people allowed to.
 *
 * Memoised, so a tile re-renders only when its own project's figures change.
 */
export const ProjectTile = memo(function ProjectTile({ project: p, onIntent }: { project: ProjectSummary; onIntent: (id: string) => void }) {
  const place = useMemo(() => ({ projectId: p.id, section: "overview" as const }), [p.id]);
  const intent = useCallback(() => onIntent(p.id), [onIntent, p.id]);

  const s = scheduleOf(p);
  const chip = CHIP[s.tone];
  const start = dateOf(p.startDate);
  const end = dateOf(p.endDate);

  const totalCost = p.projectCost; // null until someone sets it on the project
  const balance = totalCost === null ? null : totalCost - p.spent;
  const done = p.status === "COMPLETED" ? 100 : Math.max(0, Math.min(100, Math.round(p.progress)));
  const pending = 100 - done;

  return (
    <li className="[content-visibility:auto] [contain-intrinsic-size:auto_320px]">
      <article className="flex h-full flex-col rounded-xl border border-stone-200 bg-white transition-[border-color,box-shadow] hover:border-stone-300 hover:shadow-sm">
        <a
          href={hrefFor(place)}
          onClick={onPlaceClick(place)}
          onPointerEnter={intent}
          onTouchStart={intent}
          onFocus={intent}
          aria-label={`Open ${p.title}`}
          className="flex flex-1 flex-col gap-5 rounded-t-xl p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900 active:bg-stone-50"
        >
          {/* name (large), firm (small), dates, time left */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-stone-900">{p.title}</h2>
              <p className="truncate text-sm text-stone-500">{p.firmName || "No firm"}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-500">
                <FiCalendar aria-hidden className="shrink-0" />
                {start && end ? `${longDay.format(start)} to ${longDay.format(end)}` : start ? `From ${longDay.format(start)}` : "No dates set"}
              </p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${chip.cls}`}>
              <chip.Icon aria-hidden /> {s.label}
            </span>
          </div>

          {/* money */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Project cost</p>
            <dl className="mt-2 grid grid-cols-3 gap-2 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
              <Figure label="Total cost" value={totalCost} />
              <Figure label="Spent" value={p.spent} />
              <Figure label={balance !== null && balance < 0 ? "Over budget" : "Balance"} value={balance === null ? null : Math.abs(balance)} warn={balance !== null && balance < 0} />
            </dl>
            {totalCost === null && <p className="mt-2 text-sm text-stone-500">Total cost not set yet. Edit the project to add what the whole job should cost.</p>}
          </div>

          {/* pending work */}
          <div className="mt-auto">
            <div className="flex justify-between text-sm text-stone-600">
              <span>Work pending</span>
              <span className="tabular-nums">{pending}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={`${p.title}: work done`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={done}
              aria-valuetext={`${done}% done, ${pending}% pending`}
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200"
            >
              <div className="h-full rounded-full bg-stone-900" style={{ width: `${done}%` }} />
            </div>
          </div>
        </a>

        <TileActions project={p} />
      </article>
    </li>
  );
});

function Figure({ label, value, warn }: { label: string; value: number | null; warn?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd
        title={value === null ? undefined : rupees(value)}
        className={`truncate font-semibold tabular-nums ${value === null ? "text-stone-400" : warn ? "text-red-700" : "text-stone-900"}`}
      >
        {value === null ? "—" : fit(value)}
      </dd>
    </div>
  );
}

/* -------------------------------------------- the actions -------------------------------------------- */

/** Mark completed / Reopen and Delete, for people allowed to. Outside the link, so they never open the project. */
function TileActions({ project: p }: { project: ProjectSummary }) {
  const canToggle = useCan("project.manage");
  const canDelete = useCan("project.delete");
  const setStatus = useSetProjectStatus();
  const remove = useDeleteProject();
  const [confirming, setConfirming] = useState(false);

  if (!canToggle && !canDelete) return null;
  const completed = p.status === "COMPLETED";
  // Everything that goes with the project, so nobody is surprised
  const connected = [plural(p.taskCount, "work item"), ...(p.attendanceCount > 0 ? [plural(p.attendanceCount, "attendance entry", "attendance entries")] : [])].join(" and ");

  return (
    <div className="flex min-h-12 items-center justify-between gap-2 border-t border-stone-200 px-3 text-sm">
      {canToggle ? (
        <button
          type="button"
          disabled={setStatus.isPending}
          onClick={() => setStatus.mutate({ id: p.id, status: completed ? "ONGOING" : "COMPLETED" })}
          className="min-h-10 rounded-lg px-2 text-stone-700 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50"
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
      {canDelete && (
        <button type="button" onClick={() => setConfirming(true)} className="min-h-10 rounded-lg px-2 text-red-700 hover:bg-red-50">
          Delete
        </button>
      )}
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