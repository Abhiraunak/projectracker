"use client";

import { memo, type ReactNode } from "react";
import Link from "next/link";
import { FiAlertTriangle, FiChevronRight, FiClock, FiDollarSign, FiInbox, FiTruck, FiUserPlus } from "react-icons/fi";
import type { AdminOverview, NeedItem, ProjectStatus } from "@/lib/dashboard/types";
import { ago, inrShort, pct } from "@/lib/dashboard/format";

/** One colour per project, used by the stacked bar and its list */
export const PROJECT_COLORS = ["#1c1917", "#ea580c", "#78716c", "#fdba74", "#a8a29e", "#9a3412", "#d6d3d1", "#c2410c"];
const colorOf = (i: number) => PROJECT_COLORS[i % PROJECT_COLORS.length]!;

const STATUS: Record<ProjectStatus, string> = {
  Completed: "bg-green-100 text-green-800",
  "On track": "bg-blue-100 text-blue-800",
  "Running late": "bg-orange-100 text-orange-900",
  "Over budget": "bg-red-100 text-red-800",
  "Not started": "bg-stone-100 text-stone-700",
};

const Card = ({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) => (
  <section aria-label={label} className={`min-w-0 rounded-xl border border-stone-200 bg-white ${className}`}>
    {children}
  </section>
);

/* ------------------------------ budget by project ------------------------------ */

export const BudgetByProject = memo(function BudgetByProject({ data }: { data: AdminOverview }) {
  const withBudget = data.projects.filter((p) => p.budget !== null);
  const total = withBudget.reduce((s, p) => s + (p.budget ?? 0), 0);
  const spent = data.projects.reduce((s, p) => s + p.spent, 0);
  const over = data.projects.filter((p) => p.status === "Over budget");

  return (
    <Card label="Budget used by project" className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Budget used, by project</h2>
        <span className="text-xs text-stone-500">All time</span>
      </div>
      <div>
        <p className="text-xs text-stone-500">Spent across ongoing projects</p>
        <p className="text-2xl font-semibold tabular-nums">
          {inrShort(spent)} {total > 0 && <span className="text-sm font-normal text-stone-500">of {inrShort(total)}</span>}
        </p>
      </div>
      {total > 0 && (
        <div aria-hidden className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-stone-100">
          {data.projects.map((p, i) =>
            p.budget ? <span key={p.id} style={{ width: `${Math.min(100, (p.spent / total) * 100)}%`, background: colorOf(i) }} /> : null
          )}
        </div>
      )}
      <ul className="divide-y divide-stone-100">
        {data.projects.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2.5 py-2 text-sm">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colorOf(i) }} />
            <span className="min-w-0 flex-1 truncate">{p.title}</span>
            <span className="font-semibold tabular-nums">{inrShort(p.spent)}</span>
            <span className={`w-12 text-right text-xs font-semibold ${p.used !== null && p.used > 100 ? "text-red-700" : "text-stone-600"}`}>
              {p.used === null ? "no budget" : pct(p.used)}
            </span>
          </li>
        ))}
      </ul>
      {over.length > 0 && (
        <p className="flex gap-2 rounded-lg bg-orange-50 p-3 text-sm text-orange-900">
          <FiAlertTriangle aria-hidden className="mt-0.5 shrink-0" />
          <span>
            {over.map((p) => p.title).join(", ")} {over.length === 1 ? "is" : "are"} expected to finish over budget
            {over.length === 1 && over[0]!.budget ? `, by ${inrShort(over[0]!.expected - over[0]!.budget)}` : ""}.
          </span>
        </p>
      )}
    </Card>
  );
});

/* -------------------------------- projects table -------------------------------- */

export const ProjectsTable = memo(function ProjectsTable({ data }: { data: AdminOverview }) {
  return (
    <Card label="Ongoing projects">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="font-semibold">Ongoing projects</h2>
        <Link href="/dashboard/labour" className="text-sm font-semibold text-orange-700 hover:text-orange-800">
          View all
        </Link>
      </div>
      {data.projects.length === 0 ? (
        <p className="p-6 text-center text-sm text-stone-500">No ongoing projects.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-sm">
            <thead className="text-left text-xs text-stone-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Project</th>
                <th className="w-52 px-4 py-2.5 font-medium">Work done · time used</th>
                <th className="px-4 py-2.5 text-right font-medium">Budget used</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.projects.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-xs text-stone-500">{p.next ? `Next: ${p.next}` : "All work items finished"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full bg-stone-900" style={{ width: `${Math.min(100, p.done)}%` }} />
                      </div>
                      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full bg-orange-600" style={{ width: `${Math.min(100, p.time)}%` }} />
                      </div>
                      <span className="text-xs text-stone-500">
                        {pct(p.done)} done · {pct(p.time)} of time
                      </span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${p.used !== null && p.used > 100 ? "text-red-700" : ""}`}>
                    {p.used === null ? <span className="font-normal text-stone-400">No budget</span> : pct(p.used)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[p.status]}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
});

/* ---------------------------------- needs you ---------------------------------- */

const NEED_LOOK: Record<NeedItem["kind"], { Icon: typeof FiInbox; cls: string }> = {
  requests: { Icon: FiInbox, cls: "bg-orange-100 text-orange-800" },
  access: { Icon: FiUserPlus, cls: "bg-sky-100 text-sky-800" },
  late: { Icon: FiTruck, cls: "bg-red-100 text-red-800" },
  budget: { Icon: FiAlertTriangle, cls: "bg-red-100 text-red-800" },
  rates: { Icon: FiDollarSign, cls: "bg-stone-100 text-stone-700" },
};

export const NeedsYou = memo(function NeedsYou({ data }: { data: AdminOverview }) {
  return (
    <Card label="Needs you">
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="font-semibold">Needs you</h2>
        <p className="text-xs text-stone-500">{data.needs.length ? `${data.needs.length} ${data.needs.length === 1 ? "thing" : "things"} to look at` : "Nothing waiting"}</p>
      </div>
      {data.needs.length === 0 ? (
        <p className="flex items-center gap-2 p-4 text-sm text-green-800">All clear: no approvals, sign-ins or late deliveries.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {data.needs.map((n, i) => {
            const { Icon, cls } = NEED_LOOK[n.kind];
            return (
              <li key={i}>
                <Link href={n.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500">
                  <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cls}`}>
                    <Icon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{n.title}</span>
                    <span className="block truncate text-xs text-stone-500">
                      {n.detail}
                      {n.since && ` · ${ago(n.since)}`}
                    </span>
                  </span>
                  <FiChevronRight aria-hidden className="shrink-0 text-stone-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
});

/* -------------------------------- recent activity -------------------------------- */

export const RecentActivity = memo(function RecentActivity({ data }: { data: AdminOverview }) {
  return (
    <Card label="Recent activity">
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="font-semibold">Recent activity</h2>
        <p className="text-xs text-stone-500">The latest changes across every project</p>
      </div>
      {data.activity.length === 0 ? (
        <p className="p-4 text-sm text-stone-500">Nothing yet.</p>
      ) : (
        <ol className="divide-y divide-stone-100 px-4">
          {data.activity.map((e) => (
            <li key={e.id} className="flex gap-3 py-2.5 text-sm">
              <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: e.action.startsWith("stock") || e.action.startsWith("materials") ? "#ea580c" : "#a8a29e" }} />
              <span className="min-w-0 flex-1">
                <span className="block">{e.summary}</span>
                <span className="flex items-center gap-1 text-xs text-stone-500">
                  <FiClock aria-hidden /> {ago(e.at)} · {e.who}
                  {e.project && ` · ${e.project}`}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
});