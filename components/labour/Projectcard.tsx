"use client";

import React, { memo, useState } from "react";
import { FiCalendar, FiClock, FiTrendingDown, FiTrendingUp } from "react-icons/fi";
import { describeError, type ProjectSummary } from "@/lib/api";
import { ConfirmDeleteDialog } from "../utilites/Confirmdeletedialog";

const DAY = 86_400_000;
const rupees = (v: number) => `₹${Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function parse(s: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}
const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type Tone = "good" | "bad" | "neutral";

function schedule(p: ProjectSummary): { label: string; tone: Tone } {
  if (p.status === "COMPLETED") return { label: "Completed", tone: "good" };
  if (p.progress >= 100) return { label: "Ready to complete", tone: "good" };
  const end = parse(p.endDate);
  if (!end) return { label: "No dates set", tone: "neutral" };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((end.getTime() - today.getTime()) / DAY);
  if (days < 0) return { label: `Overdue by ${-days}d`, tone: "bad" };
  return { label: days === 0 ? "Due today" : `${days}d left`, tone: "neutral" };
}

const TONE = {
  good: { cls: "bg-green-100 text-green-700", Icon: FiTrendingUp },
  bad: { cls: "bg-red-100 text-red-700", Icon: FiTrendingDown },
  neutral: { cls: "bg-stone-100 text-stone-600", Icon: FiClock },
} as const;

interface ProjectCardProps {
  project: ProjectSummary;
  onOpen: (id: string) => void;
  onToggleStatus: (project: ProjectSummary) => void;
  /** Return the promise so the dialog can show "Deleting…" and any error */
  onDelete: (project: ProjectSummary) => Promise<void> | void;
}

export const ProjectCard = memo(function ProjectCard({ project: p, onOpen, onToggleStatus, onDelete }: ProjectCardProps) {
  const s = schedule(p);
  const { cls, Icon } = TONE[s.tone];
  const start = parse(p.startDate);
  const end = parse(p.endDate);
  const balance = p.budget - p.paid;
  const progress = Math.min(100, Math.max(0, p.progress));

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const askToDelete = () => {
    setDeleteError(null);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(p);
      setConfirmOpen(false); // usually the card disappears when the list refreshes
    } catch (e) {
      setDeleteError(describeError(e)); // stays open so the user can retry
    } finally {
      setDeleting(false);
    }
  };

  // Everything that goes with the project, so nobody is surprised
  const connected = [
    plural(p.taskCount, "work item", "work items"),
    ...(p.attendanceCount > 0 ? [plural(p.attendanceCount, "attendance entry", "attendance entries")] : []),
  ].join(" and ");

  return (
    <article className="flex h-full min-w-0 flex-col rounded border border-stone-300">
      {/* ───────── Main (clickable) area ───────── */}
      <button
        type="button"
        onClick={() => onOpen(p.id)}
        className="flex min-w-0 flex-1 flex-col rounded-t p-3 text-left transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900 active:bg-stone-100 sm:p-4 lg:p-5"
      >
        {/* Mobile: badge stacks under the title. sm+: sits beside it */}
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 wrap-break-word text-base font-semibold sm:text-lg">{p.title}</h3>
            <p className="mt-1 flex items-start gap-1 text-xs text-stone-500">
              <FiCalendar aria-hidden className="mt-0.5 shrink-0" />
              <span>{start && end ? `${fmt(start)} to ${fmt(end)}` : "No dates set"}</span>
            </p>
          </div>
          <span
            className={`flex items-center gap-1 self-start whitespace-nowrap rounded px-2 py-1 text-xs font-medium sm:shrink-0 ${cls}`}
          >
            <Icon aria-hidden /> {s.label}
          </span>
        </div>

        <p className="mb-1 text-xs text-stone-500 sm:mb-2 sm:text-sm">Labour budget</p>
        {/* No truncate: money values should never be cut off on small screens */}
        <p className="wrap-break-word text-2xl font-semibold leading-tight tabular-nums sm:text-3xl">
          {rupees(p.budget)}
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:mt-4">
          <div className="min-w-0">
            <dt className="text-xs text-stone-500 sm:text-sm">Paid</dt>
            <dd className="wrap-break-word font-medium tabular-nums">{rupees(p.paid)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-stone-500 sm:text-sm">{balance < 0 ? "Overpaid" : "Remaining"}</dt>
            <dd className={`wrap-break-word font-medium tabular-nums ${balance < 0 ? "text-red-700" : ""}`}>
              {rupees(balance)}
            </dd>
          </div>
        </dl>

        {/* mt-auto pins progress to the bottom so rows of cards line up */}
        <div className="mt-3 sm:mt-4">
          <div className="mb-1.5 flex justify-between gap-2 text-xs text-stone-500">
            <span className="min-w-0">{plural(p.taskCount, "work item", "work items")}</span>
            <span className="whitespace-nowrap tabular-nums">{progress}% complete</span>
          </div>
          <div
            role="progressbar"
            aria-label={`${p.title} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-1.5 overflow-hidden rounded bg-stone-200"
          >
            <div className="h-full bg-stone-900" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </button>

      <div className="grid grid-cols-2 divide-x divide-stone-200 border-t border-stone-200 text-sm sm:flex sm:items-center sm:justify-between sm:divide-x-0 sm:px-4 sm:py-2">
        <button
          type="button"
          onClick={() => onToggleStatus(p)}
          className="min-h-11 rounded-bl px-3 text-stone-600 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900 active:bg-stone-100 sm:min-h-0 sm:rounded sm:px-1 sm:active:bg-transparent"
        >
          {p.status === "COMPLETED" ? "Reopen" : "Mark completed"}
        </button>
        <button
          type="button"
          onClick={askToDelete}
          className="min-h-11 rounded-br px-3 text-red-700 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-700 active:bg-red-50 sm:min-h-0 sm:rounded sm:px-1 sm:active:bg-transparent"
        >
          Delete
        </button>
      </div>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete project?"
        itemName={p.title}
        warning={
          <>
            By deleting this project, <strong>{connected}</strong> will also be permanently deleted.
          </>
        }
        confirmPhrase="delete my project"
        confirmLabel="Delete project"
        pending={deleting}
        error={deleteError}
      />
    </article>
  );
});