"use client";

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiEdit2 } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { hrefFor, onPlaceClick } from "@/hooks/useWorkspacePlace";
import type { ProjectSummary } from "@/lib/api";
import { plural, rupees, rupeesShort } from "@/lib/projects/hub";
import { EditDetailsDialog } from "./EditDetailsDialog";

/** Full amounts while they fit in half the tile; ₹1.29 Cr beyond ₹10 L */
const fit = (v: number) => (Math.abs(v) >= 1_000_000 ? rupeesShort(v) : rupees(v));

/* ------------------------------------------- time left ------------------------------------------- */

export type Tone = "good" | "bad" | "warn" | "neutral";
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

/** Over its project cost? (Nothing to compare with while the cost isn't set.) */
export const isOverCost = (p: ProjectSummary) => p.projectCost !== null && (p.totalSpent ?? p.spent) > p.projectCost + 0.5;

/** Monochrome: grey for ordinary, black for "soon", green and red only for done and late */
const PILL: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: "bg-[#F1F1EF] text-[#333333]", dot: "bg-[#8C8C8C]" },
  warn: { pill: "bg-[#E9E9E6] text-[#111111]", dot: "bg-[#111111]" },
  good: { pill: "bg-[#E9F5EE] text-[#1A6B3C]", dot: "bg-[#1E7B45]" },
  bad: { pill: "bg-[#FCEDEC] text-[#B3261E]", dot: "bg-[#C4302B]" },
};

/* --------------------------------------------- the tile --------------------------------------------- */

/**
 * One project as a quiet white card: time left, the project and firm, total cost against total spend, and a thin
 * meter of how much of the cost is used. The whole card opens the project; the ⋯ button holds Edit details
 * (title, firm, project cost) for people allowed to change them.
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
  const tone = PILL[time.tone];
  const cost = p.projectCost; // our own cost for the job (not the BOQ)
  const spent = p.totalSpent ?? p.spent; // older servers: labour paid + materials only
  const over = isOverCost(p);
  const pct = cost && cost > 0 ? (spent / cost) * 100 : 0;
  const used = cost === null ? "Set a project cost to track spending" : over ? `Over by ${fit(spent - cost)}` : `${Math.round(pct)}% of cost used`;

  return (
    <li className="[content-visibility:auto] [contain-intrinsic-size:auto_260px]">
      <article className="group relative flex h-full flex-col gap-4.5 rounded-[22px] border border-[#E8E8E6] bg-white px-5 pb-5.5 pt-5 shadow-[0_1px_2px_rgba(17,17,17,0.04)] transition-[border-color,box-shadow] duration-180 ease-[cubic-bezier(.2,0,0,1)] hover:border-[#CFCFCC] hover:shadow-[0_1px_2px_rgba(17,17,17,0.04),0_6px_16px_-8px_rgba(17,17,17,0.12)] focus-within:border-[#CFCFCC] motion-reduce:transition-none">
        <div className="flex items-center justify-between gap-3">
          <span className={`inline-flex h-6.5 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${tone.pill}`}>
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            {time.label}
          </span>
          <TileMenu project={p} />
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-[19px] font-semibold leading-tight tracking-[-0.01em] text-[#111111]">
            {/* The whole card is this link: its ::after covers the card, the ⋯ button sits above it */}
            <a
              href={href}
              onClick={open}
              onPointerEnter={intent}
              onTouchStart={intent}
              onFocus={intent}
              className="rounded-sm after:absolute after:inset-0 after:rounded-[22px] after:content-[''] focus:outline-none focus-visible:after:outline focus-visible:after:-outline-offset-2 focus-visible:after:outline-[#111111]"
            >
              {p.title}
            </a>
          </h2>
          <p className={`mt-1 truncate text-sm ${p.firmName ? "text-[#666666]" : "text-[#8C8C8C]"}`}>{p.firmName || "No firm added"}</p>
        </div>

        <div aria-hidden className="h-px bg-[#EFEFED]" />

        <dl className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <dt className="text-xs text-[#666666]">Total cost</dt>
            <dd title={cost !== null ? rupees(cost) : undefined} className={`mt-1 truncate text-xl font-semibold tabular-nums tracking-[-0.01em] ${cost === null ? "text-[#8C8C8C]" : "text-[#111111]"}`}>
              {cost !== null ? fit(cost) : "Not set"}
            </dd>
          </div>
          <div className="min-w-0 text-right">
            <dt className="text-xs text-[#666666]">Total spend</dt>
            <dd title={rupees(spent)} className={`mt-1 truncate text-xl font-semibold tabular-nums tracking-[-0.01em] ${over ? "text-[#B3261E]" : "text-[#111111]"}`}>
              {fit(spent)}
            </dd>
          </div>
        </dl>

        <div className="mt-auto">
          <div aria-hidden className="h-1 overflow-hidden rounded-full bg-[#EFEFED]">
            <div className={`h-full rounded-full ${over ? "bg-[#C4302B]" : time.tone === "good" ? "bg-[#1E7B45]" : "bg-[#111111]"}`} style={{ width: `${cost ? Math.min(100, pct) : 0}%` }} />
          </div>
          <p className={`mt-2 text-xs ${over ? "text-[#B3261E]" : "text-[#666666]"}`}>{used}</p>
        </div>
      </article>
    </li>
  );
});

/* ------------------------------------------- the ⋯ menu ------------------------------------------- */

/** The ⋯ button: one option, Edit details (project title, firm name, project cost). Only for people who may change them. */
function TileMenu({ project: p }: { project: ProjectSummary }) {
  const canEdit = useCan("project.manage");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Close on a click outside, or Escape (focus goes back to the ⋯ button)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!canEdit) return null;
  // firmName is optional on ProjectSummary (older APIs leave it out), so undefined becomes null
  const editable = { id: p.id, title: p.title, firmName: p.firmName ?? null, projectCost: p.projectCost };

  return (
    <div ref={wrap} className="relative z-1 -my-1.5 -mr-1.5">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`More actions for ${p.title}`}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-[#666666] transition-colors duration-180 hover:bg-[#F1F1EF] hover:text-[#111111] focus:outline-none focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#111111] motion-reduce:transition-none"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      {open && (
        <div id={menuId} className="absolute right-0 top-12 z-20 w-52 rounded-2xl border border-[#E8E8E6] bg-white p-1.5 shadow-[0_2px_4px_rgba(17,17,17,0.04),0_12px_32px_-12px_rgba(17,17,17,0.18)]">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setEditing(true);
            }}
            className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm text-[#111111] hover:bg-[#F7F7F5] focus:outline-none focus-visible:bg-[#F1F1EF]"
          >
            <FiEdit2 aria-hidden className="shrink-0 text-[#666666]" /> Edit details
          </button>
        </div>
      )}
      {editing && <EditDetailsDialog project={editable} onClose={() => setEditing(false)} />}
    </div>
  );
}