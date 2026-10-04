"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
// import { Search } from "@/components/dashboard/Sidebar/Search";
import { Heading } from "@/components/utilites/Label";
import { TasksProvider } from "@/components/labour/Taskscontext";

import { ApiError, toFormData, type ApiProject, type ProjectStatus, type ProjectSummary } from "@/lib/api";
import {
  useCreateProject,
  useDeleteProject,
  useProject,
  useProjects,
  useSetProjectStatus,
  useTaskUpdater,
  useUpdateProject,
} from "@/hooks/useLabourProjects";
import type { ProjectData } from "@/components/labour/LabourManagementForm";
import { ProjectCard } from "@/components/labour/Projectcard";

/* -------------------------------------------------------------------------- */
/*  Code-split the heavy views                                                */
/* -------------------------------------------------------------------------- */

const SectionSkeleton = () => (
  <div aria-busy="true" className="h-64 animate-pulse rounded-xl bg-stone-200/60 motion-reduce:animate-none" />
);

const LabourManagementForm = dynamic(
  () => import("@/components/labour/LabourManagementForm").then((m) => m.LabourManagementForm),
  { loading: SectionSkeleton }
);
const Grid = dynamic(() => import("@/components/dashboard/Dashboard/Grid").then((m) => m.Grid), {
  loading: SectionSkeleton,
});
const ComparisonGrid = dynamic(() => import("@/components/labour/ComparisonGrid").then((m) => m.ComparisonGrid), {
  loading: SectionSkeleton,
});
const LabourGantt = dynamic(() => import("@/components/labour/LabourGantt").then((m) => m.LabourGantt), {
  loading: SectionSkeleton,
});
const PaymentSchedule = dynamic(() => import("@/components/labour/PaymentSchedule").then((m) => m.PaymentSchedule), {
  loading: SectionSkeleton,
});
const ProgressTracker = dynamic(() => import("@/components/labour/Progresstracker").then((m) => m.ProgressTracker), {
  loading: SectionSkeleton,
});
const AttendanceManager = dynamic(() => import("@/components/labour/Attendancemanager").then((m) => m.AttendanceManager), {
  loading: SectionSkeleton,
});
const RecentAttendance = dynamic(() => import("@/components/labour/RecentAttendance").then((m) => m.RecentAttendance), {
  loading: SectionSkeleton,
});

/* -------------------------------------------------------------------------- */
/*  Types & pure helpers                                                      */
/* -------------------------------------------------------------------------- */

type PageView = "menu" | "form" | "dashboard" | "progress" | "payments" | "attendance";
const PROJECT_VIEWS: PageView[] = ["dashboard", "progress", "payments", "attendance"];

type ProcessedTask = {
  id: string;
  title: string;
  work: string;
  area: number;
  contractorRate: number;
  inHouseRate: number;
  progress: number;
  stipulated: number;
  paid: number;
  variance: number;
  status: "Under Budget" | "Over Budget";
  startDate?: string;
  endDate?: string;
};

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatNumber = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format;

/** Server project -> what the grid / chart components expect */
function processTasks(project: ApiProject): ProcessedTask[] {
  return project.tasks.map((task) => {
    const stipulated = toNumber(task.stipulated);
    const paid = toNumber(task.paid);
    const variance = stipulated - paid;
    return {
      id: task.id,
      title: task.work,
      work: task.work,
      area: toNumber(task.area),
      contractorRate: toNumber(task.contractorRate),
      inHouseRate: toNumber(task.inHouseRate),
      progress: Math.min(100, Math.max(0, toNumber(task.progress))),
      stipulated,
      paid,
      variance,
      status: variance >= 0 ? "Under Budget" : "Over Budget",
      startDate: task.startDate,
      endDate: task.endDate,
    };
  });
}

function summarise(tasks: ProcessedTask[]) {
  const stipulated = tasks.reduce((s, t) => s + t.stipulated, 0);
  const paid = tasks.reduce((s, t) => s + t.paid, 0);
  const progress = tasks.length ? tasks.reduce((s, t) => s + t.progress, 0) / tasks.length : 0;
  return { stipulated, paid, balance: stipulated - paid, progress, count: tasks.length };
}

function describeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "Your session has expired. Sign in again to continue.";
    const detail = Array.isArray(e.details)
      ? (e.details as { path: string; message: string }[]).slice(0, 3).map((d) => `${d.path}: ${d.message}`).join("; ")
      : "";
    return detail ? `${e.message} (${detail})` : e.message;
  }
  return "Something went wrong. Check your connection and try again.";
}

/* -------------------------------------------------------------------------- */
/*  Small presentational pieces                                               */
/* -------------------------------------------------------------------------- */

const NAV: { view: PageView; label: string }[] = [
  { view: "menu", label: "Projects" },
  { view: "dashboard", label: "Dashboard" },
  { view: "progress", label: "Progress" },
  { view: "payments", label: "Payments" },
  { view: "attendance", label: "Attendance" },
];

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";
const buttonSecondary = `rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 ${focusRing}`;

const Ledger = memo(function Ledger({ s }: { s: ReturnType<typeof summarise> }) {
  const over = s.balance < 0;
  const cells = [
    { label: "Agreed amount", value: formatNumber(s.stipulated) },
    { label: "Paid so far", value: formatNumber(s.paid) },
    {
      label: over ? "Overpaid by" : "Still to pay",
      value: formatNumber(Math.abs(s.balance)),
      tone: over ? "text-rose-700" : "text-emerald-700",
    },
    { label: `Average progress across ${s.count} ${s.count === 1 ? "task" : "tasks"}`, value: `${Math.round(s.progress)}%` },
  ];
  return (
    <dl className="grid grid-cols-2 divide-stone-200 overflow-hidden rounded-xl border border-stone-200 sm:grid-cols-4 sm:divide-x">
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={`px-5 py-4 ${i > 1 ? "border-t border-stone-200 sm:border-t-0" : ""} ${i % 2 === 1 ? "border-l border-stone-200 sm:border-l-0" : ""}`}
        >
          <dt className="text-xs text-stone-500">{c.label}</dt>
          <dd className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${c.tone ?? "text-stone-900"}`}>{c.value}</dd>
        </div>
      ))}
    </dl>
  );
});

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section aria-label={title} className="min-w-0">
    {children}
  </section>
);

const ErrorNotice = ({ error, onRetry }: { error: unknown; onRetry?: () => void }) => (
  <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
    <p>{describeError(error)}</p>
    {onRetry && !(error instanceof ApiError && error.status === 401) && (
      <button type="button" onClick={onRetry} className="mt-2 font-medium underline">
        Try again
      </button>
    )}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function TeamPage() {
  const [view, setView] = useState<PageView>("menu");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState<Exclude<ProjectStatus, "ARCHIVED">>("ONGOING");
  const [banner, setBanner] = useState<string | null>(null);

  // Everything below comes from the database
  const projects = useProjects(filter);
  const projectQuery = useProject(activeId);
  const project = projectQuery.data;
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const setStatus = useSetProjectStatus();
  const deleteProject = useDeleteProject();
  const { update: updateTask, state: saveState } = useTaskUpdater(activeId);

  const tasks = useMemo(() => (project ? processTasks(project) : undefined), [project]);
  const totals = useMemo(() => (tasks ? summarise(tasks) : null), [tasks]);

  const openProject = useCallback((id: string) => {
    setActiveId(id);
    setView("dashboard");
  }, []);

  const startNew = useCallback(() => {
    setEditing(false);
    setView("form");
  }, []);

  const startEdit = useCallback(() => {
    setEditing(true);
    setView("form");
  }, []);

  const toggleStatus = useCallback(
    (p: ProjectSummary) => {
      setBanner(null);
      setStatus.mutate(
        { id: p.id, status: p.status === "COMPLETED" ? "ONGOING" : "COMPLETED" },
        { onError: (e) => setBanner(describeError(e)) }
      );
    },
    [setStatus]
  );

  // The card's dialog does the confirming and shows any error, so this just throws on failure
  const removeProject = useCallback(
    async (p: ProjectSummary) => {
      await deleteProject.mutateAsync(p.id);
      setActiveId((cur) => (cur === p.id ? null : cur));
    },
    [deleteProject]
  );

  const handleSubmit = useCallback(
    async (data: ProjectData) => {
      setBanner(null);
      try {
        if (editing && activeId) {
          await updateProject.mutateAsync({ id: activeId, data });
        } else {
          const created = await createProject.mutateAsync(data);
          setActiveId(created.id);
        }
        setView("dashboard");
      } catch (e) {
        setBanner(describeError(e));
      }
    },
    [editing, activeId, createProject, updateProject]
  );

  // New screen, start at the top
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  const isProjectView = PROJECT_VIEWS.includes(view);
  const subtitle =
    view === "menu"
      ? "All your projects at one place"
      : view === "form"
        ? editing
          ? (project?.title ?? "Edit project")
          : "New project"
        : (project?.title ?? "Loading project");

  return (
    <div className="min-h-screen text-stone-900">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <header className="border-b border-stone-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-0.5 mb-4">
              <Heading>Project Management</Heading>
              <p className="truncate text-sm text-stone-500">{subtitle}</p>
            </div>
            {/* <div className="w-full sm:w-72">
              <Search className="w-full" />
            </div> */}
          </div>

          {activeId && (
            <nav aria-label="Labour sections" className="-mb-px mt-4 flex gap-1 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
              {NAV.map(({ view: v, label }) => {
                const active =
                  view === v ||
                  (v === "dashboard" && view === "form" && editing) ||
                  (v === "menu" && view === "form" && !editing);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    aria-current={active ? "page" : undefined}
                    className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:py-2.5 ${focusRing} ${active
                        ? "border-amber-500 text-stone-900"
                        : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800"
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      <TasksProvider tasks={tasks}>
        <main id="content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {banner && (
            <div role="alert" className="mb-6 flex items-start justify-between gap-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p>{banner}</p>
              <button type="button" onClick={() => setBanner(null)} className="font-medium underline">
                Dismiss
              </button>
            </div>
          )}

          {/* ------------------------------ Projects ----------------------------- */}
          {view === "menu" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div role="group" aria-label="Filter projects" className="flex rounded border border-stone-300 p-0.5 text-sm">
                  {(["ONGOING", "COMPLETED"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={filter === s}
                      onClick={() => setFilter(s)}
                      className={`rounded px-3 py-1.5 font-medium transition-colors ${focusRing} ${filter === s ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"
                        }`}
                    >
                      {s === "ONGOING" ? "Ongoing" : "Completed"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={startNew}
                  className={`rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 ${focusRing}`}
                >
                  New project
                </button>
              </div>

              {projects.isPending ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-72 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />
                  ))}
                </div>
              ) : projects.isError ? (
                <ErrorNotice error={projects.error} onRetry={() => projects.refetch()} />
              ) : projects.data.length === 0 ? (
                <div className="rounded border border-dashed border-stone-300 px-8 py-14 text-center">
                  <p className="font-semibold">
                    {filter === "ONGOING" ? "No ongoing projects" : "No completed projects yet"}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    {filter === "ONGOING"
                      ? "Create a project with its work items, rates and dates to start tracking it."
                      : "Projects you mark as completed will show up here."}
                  </p>
                </div>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {projects.data.map((p) => (
                    <li key={p.id} className="flex">
                      <div className="w-full">
                        <ProjectCard project={p} onOpen={openProject} onToggleStatus={toggleStatus} onDelete={removeProject} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <section aria-label="Recent attendance" className="space-y-3 pt-4">
                <h2 className="text-lg font-semibold">Recent attendance</h2>
                <RecentAttendance
                  onSelect={(id) => {
                    setActiveId(id);
                    setView("attendance");
                  }}
                />
              </section>
            </div>
          )}

          {/* -------------------------------- Form ------------------------------- */}
          {view === "form" && (
            <div className="mx-auto max-w-4xl">
              <button
                type="button"
                onClick={() => setView(editing ? "dashboard" : "menu")}
                className="mb-4 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
              >
                &larr; {editing ? "Back to dashboard" : "Back to projects"}
              </button>
              {editing && !project ? (
                <SectionSkeleton />
              ) : (
                <LabourManagementForm
                  key={editing ? activeId : "new"}
                  onSubmit={handleSubmit}
                  initialData={editing && project ? toFormData(project) : null}
                  submitting={createProject.isPending || updateProject.isPending}
                />
              )}
            </div>
          )}

          {/* ---------------------- Anything inside a project ---------------------- */}
          {isProjectView && !project && (
            projectQuery.isError ? (
              <div className="space-y-4">
                <ErrorNotice error={projectQuery.error} onRetry={() => projectQuery.refetch()} />
                <button type="button" onClick={() => { setActiveId(null); setView("menu"); }} className={buttonSecondary}>
                  Back to projects
                </button>
              </div>
            ) : (
              <SectionSkeleton />
            )
          )}

          {isProjectView && project && tasks && totals && (
            <>
              {view === "attendance" && <AttendanceManager projectId={project.id} />}

              {view === "payments" && (
                <div className="mx-auto max-w-6xl space-y-6">
                  <Ledger s={totals} />
                  <PaymentSchedule tasks={tasks} />
                </div>
              )}

              {view === "progress" && (
                <div className="mx-auto max-w-4xl space-y-6">
                  <Ledger s={totals} />
                  <p aria-live="polite" className={`text-sm ${saveState === "error" ? "text-red-700" : "text-stone-500"}`}>
                    {saveState === "saving" && "Saving…"}
                    {saveState === "idle" && "All changes saved"}
                    {saveState === "error" && "Couldn't save the last change. The values were reset to what is stored."}
                  </p>
                  <ProgressTracker tasks={tasks} onUpdate={updateTask} />
                </div>
              )}

              {view === "dashboard" && (
                <div className="space-y-8">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <h2 className="text-lg font-semibold">{project.title}</h2>
                    <button type="button" onClick={startEdit} className={buttonSecondary}>
                      Edit project data
                    </button>
                  </div>

                  <Ledger s={totals} />

                  <Section title="Overview">
                    <Grid />
                  </Section>
                  <Section title="Contractor vs in-house comparison">
                    <ComparisonGrid items={tasks} title="Contractor vs In-house Comparison" />
                  </Section>
                  <Section title="Schedule">
                    <LabourGantt tasks={tasks} />
                  </Section>
                  <Section title="Payments">
                    <PaymentSchedule tasks={tasks} />
                  </Section>
                </div>
              )}
            </>
          )}
        </main>
      </TasksProvider>
    </div>
  );
}