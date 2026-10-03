"use client";

import React, { memo } from "react";
import { FiCalendar, FiClock, FiTrendingDown, FiTrendingUp } from "react-icons/fi";
import type { ProjectSummary } from "@/lib/api";

const DAY = 86_400_000;
const rupees = (v: number) => `₹${Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function parse(s: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}
const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

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
  onDelete: (project: ProjectSummary) => void;
}

export const ProjectCard = memo(function ProjectCard({ project: p, onOpen, onToggleStatus, onDelete }: ProjectCardProps) {
  const s = schedule(p);
  const { cls, Icon } = TONE[s.tone];
  const start = parse(p.startDate);
  const end = parse(p.endDate);
  const balance = p.budget - p.paid;

  return (
    <article className="flex flex-col rounded border border-stone-300">
      <button
        type="button"
        onClick={() => onOpen(p.id)}
        className="flex-1 rounded-t p-4 text-left transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
      >
        <div className="mb-6 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{p.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
              <FiCalendar aria-hidden />
              {start && end ? `${fmt(start)} to ${fmt(end)}` : "No dates set"}
            </p>
          </div>
          <span className={`flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${cls}`}>
            <Icon aria-hidden /> {s.label}
          </span>
        </div>

        <p className="mb-2 text-sm text-stone-500">Labour budget</p>
        <p className="text-3xl font-semibold tabular-nums">{rupees(p.budget)}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-stone-500">Paid</dt>
            <dd className="font-medium tabular-nums">{rupees(p.paid)}</dd>
          </div>
          <div>
            <dt className="text-stone-500">{balance < 0 ? "Overpaid" : "Remaining"}</dt>
            <dd className={`font-medium tabular-nums ${balance < 0 ? "text-red-700" : ""}`}>{rupees(balance)}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-stone-500">
            <span>{p.taskCount} work {p.taskCount === 1 ? "item" : "items"}</span>
            <span className="tabular-nums">{p.progress}% complete</span>
          </div>
          <div
            role="progressbar"
            aria-label={`${p.title} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={p.progress}
            className="h-1.5 overflow-hidden rounded bg-stone-200"
          >
            <div className="h-full bg-stone-900" style={{ width: `${p.progress}%` }} />
          </div>
        </div>
      </button>

      <div className="flex items-center justify-between border-t border-stone-200 px-4 py-2 text-sm">
        <button
          type="button"
          onClick={() => onToggleStatus(p)}
          className="rounded px-1 text-stone-600 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
        >
          {p.status === "COMPLETED" ? "Reopen" : "Mark completed"}
        </button>
        <button
          type="button"
          onClick={() => onDelete(p)}
          className="rounded px-1 text-red-700 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        >
          Delete
        </button>
      </div>
    </article>
  );
});