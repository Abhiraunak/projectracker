"use client";

import { memo, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
// import { FiEdit2 } from "react-icons/fi";
// import { useDeleteProject, useSetProjectStatus } from "@/hooks/useLabourProjects";
// import { useCan } from "@/hooks/useProjectAccess";
import { hrefFor, onPlaceClick } from "@/hooks/useWorkspacePlace";
import {type ProjectSummary } from "@/lib/api";
import { plural, rupees, rupeesShort } from "@/lib/projects/hub";
// import { EditDetailsDialog } from "./EditDetailsDialog";
// import { ConfirmDeleteDialog } from "../utilites/Confirmdeletedialog";

/** Full amounts while they fit in half the tile; ₹1.29 Cr beyond ₹10 L */
const fit = (v: number) => (Math.abs(v) >= 1_000_000 ? rupeesShort(v) : rupees(v));

/* ------------------------------------------- time left ------------------------------------------- */

type Tone = "good" | "bad" | "warn" | "neutral";
const dateOf = (s: string | null) => (s ? new Date(`${s}T00:00:00`) : null);

/** Whole months, then the days after them, from `a` to `b` (a ≤ b): 3 Nov → 8 Dec = 1 month 5 days */
function monthsAndDays(a: Date, b: Date) {
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  const after = new Date(a.getFullYear(), a.getMonth() + months, a.getDate());
  const days = Math.round((b.getTime() - after.getTime()) / 86_400_000);
  return { months, days };
}
const spell = ({ months, days }: { months: number; days: number }) =>
  [months > 0 ? plural(months, "month") : "", days > 0 ? plural(days, "day") : ""].filter(Boolean).join(" ");

/** "1 month 5 days left", "12 days left", "Due today", "Overdue by 3 days", "Completed" */
export function timeLeftOf(p: Pick<ProjectSummary, "status" | "endDate">, now = new Date()): { label: string; tone: Tone } {
  if (p.status === "COMPLETED") return { label: "Completed", tone: "good" };
  const end = dateOf(p.endDate);
  if (!end) return { label: "No end date", tone: "neutral" };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (end < today) return { label: `Overdue by ${spell(monthsAndDays(end, today))}`, tone: "bad" };
  const left = monthsAndDays(today, end);
  if (left.months === 0 && left.days === 0) return { label: "Due today", tone: "warn" };
  return { label: `${spell(left)} left`, tone: left.months === 0 && left.days <= 7 ? "warn" : "neutral" };
}

const PILL: Record<Tone, string> = {
  good: "border-emerald-200 bg-emerald-50/90 text-emerald-800",
  bad: "border-red-200 bg-red-50/90 text-red-700",
  warn: "border-amber-200 bg-amber-50/90 text-amber-800",
  neutral: "border-stone-200 bg-white/80 text-stone-700",
};

/* --------------------------------------------- the tile --------------------------------------------- */

/**
 * One project as a soft, rounded card: time left at the top, the project and firm name in the middle, and the
 * project's total cost against what has been spent at the bottom. Tap anywhere on it to open the project.
 * Mark completed / Reopen, Edit and Delete sit underneath for people allowed to use them.
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

  const time = timeLeftOf(p);
  const cost = p.projectCost; // our own cost for the job (not the BOQ)
  const spent = p.totalSpent ?? p.spent; // older servers: labour paid + materials only
  const over = cost !== null && spent > cost + 0.5;

  return (
    <li className="[content-visibility:auto] [contain-intrinsic-size:auto_300px]">
      <article
        className="flex h-full flex-col overflow-hidden rounded-[28px] border border-stone-200 bg-[#FCFBF8] shadow-[0_1px_2px_rgba(28,27,25,0.04),0_8px_24px_-12px_rgba(28,27,25,0.12)] transition-[border-color,box-shadow] hover:border-stone-300 hover:shadow-[0_1px_2px_rgba(28,27,25,0.06),0_16px_32px_-12px_rgba(28,27,25,0.18)]"
        style={{ backgroundImage: "radial-gradient(110% 85% at 100% 0%, rgba(234,108,40,0.16) 0%, rgba(234,108,40,0.05) 45%, rgba(234,108,40,0) 70%)" }}
      >
        <a
          href={href}
          onClick={open}
          onPointerEnter={intent}
          onTouchStart={intent}
          onFocus={intent}
          aria-label={`Open ${p.title}`}
          className="flex flex-1 flex-col gap-2 rounded-t-[28px] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900 sm:p-5"
        >
          {/* time left */}
          <div className="flex justify-end">
            <span className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm ${PILL[time.tone]}`}>{time.label}</span>
          </div>

          {/* project and firm */}
          <div className="flex flex-1 flex-col items-center justify-center px-2 py-5 text-center sm:py-7">
            <h2 className="line-clamp-2 wrap-break-word text-xl font-semibold leading-snug tracking-tight text-stone-900 sm:text-2xl">{p.title}</h2>
            {p.firmName && <p className="mt-1 line-clamp-1 text-sm text-stone-500 sm:text-base">{p.firmName}</p>}
          </div>

          {/* total cost and total spend */}
          <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-stone-200/80 bg-white/75 px-4 py-3">
            <div className="min-w-0">
              <dt className="text-xs text-stone-500">Total cost</dt>
              <dd title={cost !== null ? rupees(cost) : undefined} className={`truncate text-lg font-semibold tabular-nums ${cost === null ? "text-stone-400" : "text-stone-900"}`}>
                {cost !== null ? fit(cost) : "Not set"}
              </dd>
            </div>
            <div className="min-w-0 text-right">
              <dt className="text-xs text-stone-500">Total spend</dt>
              <dd title={rupees(spent)} className={`truncate text-lg font-semibold tabular-nums ${over ? "text-red-700" : "text-stone-900"}`}>
                {fit(spent)}
              </dd>
              {over && <dd className="truncate text-[11px] font-medium text-red-700">Over by {fit(spent - cost!)}</dd>}
            </div>
          </dl>
        </a>

        {/* <TileActions project={p} /> */}
      </article>
    </li>
  );
});

/* -------------------------------------------- the actions -------------------------------------------- */

/** Mark completed / Reopen, Edit (name, firm, project cost) and Delete, for people allowed to. Outside the link, so they never open the project. */
// function TileActions({ project: p }: { project: ProjectSummary }) {
//   const canToggle = useCan("project.manage");
//   const canDelete = useCan("project.delete");
//   const setStatus = useSetProjectStatus();
//   const remove = useDeleteProject();
//   const [confirming, setConfirming] = useState(false);
//   const [editing, setEditing] = useState(false);

//   if (!canToggle && !canDelete) return null;
//   const completed = p.status === "COMPLETED";
//   // What the Edit dialog needs. firmName is optional on ProjectSummary (older APIs leave it out), so undefined
//   // becomes null. Built as a variable, so it fits both the older dialog (no cost) and the newer one (with cost).
//   const editable = { id: p.id, title: p.title, firmName: p.firmName ?? null, projectCost: p.projectCost };
//   // Everything that goes with the project, so nobody is surprised
//   const connected = [plural(p.taskCount, "work item"), ...(p.attendanceCount > 0 ? [plural(p.attendanceCount, "attendance entry", "attendance entries")] : [])].join(" and ");

//   return (
//     <div className="flex min-h-11 items-center justify-between gap-2 px-3 pb-2 text-sm">
//       {canToggle ? (
//         <button
//           type="button"
//           disabled={setStatus.isPending}
//           onClick={() => setStatus.mutate({ id: p.id, status: completed ? "ONGOING" : "COMPLETED" })}
//           className="min-h-10 rounded-full px-3 font-medium text-stone-600 hover:bg-stone-900/5 hover:text-stone-900 disabled:opacity-50"
//         >
//           {setStatus.isPending ? "Saving…" : completed ? "Reopen" : "Mark completed"}
//         </button>
//       ) : (
//         <span />
//       )}
//       {setStatus.isError && (
//         <span role="alert" className="truncate text-xs text-red-700">
//           {describeError(setStatus.error)}
//         </span>
//       )}
//       <span className="flex items-center gap-1">
//         {canToggle && (
//           <button
//             type="button"
//             onClick={() => setEditing(true)}
//             className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 font-medium text-stone-600 hover:bg-stone-900/5 hover:text-stone-900"
//           >
//             <FiEdit2 aria-hidden /> Edit
//           </button>
//         )}
//         {canDelete && (
//           <button type="button" onClick={() => setConfirming(true)} className="min-h-10 rounded-full px-3 font-medium text-red-700 hover:bg-red-50">
//             Delete
//           </button>
//         )}
//       </span>
//       {editing && <EditDetailsDialog project={editable} onClose={() => setEditing(false)} />}
//       {confirming && (
//         <ConfirmDeleteDialog
//           open
//           onClose={() => setConfirming(false)}
//           onConfirm={() => remove.mutate(p.id, { onSuccess: () => setConfirming(false) })}
//           title="Delete project?"
//           itemName={p.title}
//           warning={
//             <>
//               By deleting this project, <strong>{connected}</strong> will also be permanently deleted.
//             </>
//           }
//           confirmPhrase="delete my project"
//           confirmLabel="Delete project"
//           pending={remove.isPending}
//           error={remove.isError ? describeError(remove.error) : null}
//         />
//       )}
//     </div>
//   );
// }