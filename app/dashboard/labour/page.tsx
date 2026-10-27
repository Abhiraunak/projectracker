"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Search } from "@/components/dashboard/Sidebar/Search";
import { Heading } from "@/components/utilites/Label";
import { TasksProvider } from "@/components/labour/Taskscontext";
import { ProjectAccessProvider, useMyAccess } from "@/hooks/useProjectAccess";
import type { Permission } from "@/lib/access/types";
import { ProjectCard } from "@/components/labour/Projectcard";
import { ProjectCostTracker } from "@/components/labour/ProjectCostTracker";
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
// Materials (the plan from the BOQ) and Inventory (the store) are two tabs of the same inventory screen
// const ProjectInventory = dynamic(() => import("@/components/inventory/ProjectInventory").then((m) => m.ProjectInventory), {
//   loading: SectionSkeleton,
// });
// const AuditLog = dynamic(() => import("@/components/audit/AuditLog").then((m) => m.AuditLog), {
//   loading: SectionSkeleton,
// });

/* -------------------------------------------------------------------------- */
/*  Types & pure helpers                                                      */
/* -------------------------------------------------------------------------- */

type PageView = "menu" | "form" | "dashboard" | "progress" | "materials" | "inventory" | "payments" | "attendance" | "activity";
const PROJECT_VIEWS: PageView[] = ["dashboard", "progress", "materials", "inventory", "payments", "attendance", "activity"];

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
  // Weighted by each task's agreed amount, the same way the project cards work it out; a plain average when nothing is agreed yet
  const progress =
    stipulated > 0
      ? tasks.reduce((s, t) => s + t.stipulated * t.progress, 0) / stipulated
      : tasks.length
        ? tasks.reduce((s, t) => s + t.progress, 0) / tasks.length
        : 0;
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

// `needs`: the right a person must have for the tab to show. A tab someone can't use isn't offered.
// No Team tab: access is company-wide now, so who can do what is set for everyone on the Admin page.
const NAV: { view: PageView; label: string; needs?: Permission }[] = [
  { view: "menu", label: "Projects" },
  { view: "dashboard", label: "Dashboard" },
  { view: "progress", label: "Progress", needs: "tasks.progress" },
  { view: "materials", label: "Materials", needs: "materials.view" },
  { view: "inventory", label: "Inventory", needs: "materials.view" },
  { view: "payments", label: "Payments" },
  { view: "attendance", label: "Attendance", needs: "attendance.view" },
  { view: "activity", label: "Activity", needs: "audit.view" },
];

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";
// Mobile: 44px tall tap target. sm+: the compact size.
const buttonSecondary = `min-h-11 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 active:bg-stone-100 sm:min-h-0 ${focusRing}`;

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
    { label: `Progress across ${s.count} ${s.count === 1 ? "task" : "tasks"}`, value: `${Math.round(s.progress)}%` },
  ];
  return (
    // Mobile: 2x2. sm+: one row of four
    <dl className="grid grid-cols-2 divide-stone-200 overflow-hidden rounded-xl border border-stone-200 sm:grid-cols-4 sm:divide-x">
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={`min-w-0 px-3 py-3 sm:px-5 sm:py-4 ${i > 1 ? "border-t border-stone-200 sm:border-t-0" : ""} ${i % 2 === 1 ? "border-l border-stone-200 sm:border-l-0" : ""}`}
        >
          <dt className="text-xs text-stone-500">{c.label}</dt>
          <dd className={`mt-1 wrap-break-word text-xl font-semibold tabular-nums tracking-tight sm:text-2xl ${c.tone ?? "text-stone-900"}`}>
            {c.value}
          </dd>
        </div>
      ))}
    </dl>
  );
});

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section aria-label={title} className="min-w-0">
    {children}
  </section>
);

const ErrorNotice = ({ error, onRetry }: { error: unknown; onRetry?: () => void }) => (
  <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:p-4">
    <p>{describeError(error)}</p>
    {error instanceof ApiError && error.status === 401 ? (
      <Link href="/signin" className="mt-2 inline-flex min-h-11 items-center font-medium underline sm:min-h-0">
        Sign in again
      </Link>
    ) : (
      onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 min-h-11 font-medium underline sm:min-h-0">
          Try again
        </button>
      )
    )}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function LabourPage() {
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
  // What the signed-in person may do: company-wide (the same on every project), set on the Admin page.
  // Read here as well as in the layout, so the page works whether or not the layout provides it (it's cached once).
  const access = useMyAccess();

  const tasks = useMemo(() => (project ? processTasks(project) : undefined), [project]);
  const totals = useMemo(() => (tasks ? summarise(tasks) : null), [tasks]);

  const openProject = useCallback((id: string) => {
    setBanner(null); // an error about another project doesn't belong here
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

  // New screen, start at the top. On large screens the dashboard layout's <main> scrolls, not the window.
  useEffect(() => {
    document.getElementById("main-content")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [view]);

  const isProjectView = PROJECT_VIEWS.includes(view);
  const subtitle =
    view === "menu"
      ? "All your labour projects"
      : view === "form"
        ? editing
          ? (project?.title ?? "Edit project")
          : "New project"
        : (project?.title ?? "Loading project");

  return (
    // The dashboard layout gives the page its <main>, padding and height, so this is a plain wrapper
    <div className="min-w-0 text-stone-900">
      {/*
        Stays at the top while the page scrolls. On phones and tablets it sits just under the layout's 56px top bar
        (top-14). On large screens the white card scrolls, and a sticky element sticks inside the card's 24px
        padding, so lg:-top-6 lifts it flush to the card's edge; the negative margins with matching padding stretch
        its white background over the card's padding, so nothing shows through above or beside it.
      */}
      <header className="sticky top-14 z-20 -mx-4 -mt-5 border-b border-stone-200 bg-white px-4 pt-3 sm:-mx-6 sm:-mt-6 sm:px-6 lg:-top-6 lg:-mx-8 lg:px-8 lg:pt-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="mb-3 min-w-0 space-y-0.5 sm:mb-4">
              <Heading>Labour management</Heading>
              <p className="truncate text-sm text-stone-500">{subtitle}</p>
            </div>
            <div className="mb-3 w-full sm:mb-4 sm:w-72">
              <Search className="w-full" />
            </div>
          </div>

          {activeId && (
            // Mobile: tabs scroll sideways and run edge to edge. sm+: inside the header's padding.
            <nav
              aria-label="Labour sections"
              className="-mx-4 -mb-px flex gap-1 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
            >
              {NAV.filter((item) => !item.needs || access.can(item.needs)).map(({ view: v, label }) => {
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
                    className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:py-2.5 ${focusRing} ${active
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

      <ProjectAccessProvider value={access}>
        <TasksProvider tasks={tasks}>
          <div className="mx-auto max-w-7xl py-5 sm:py-8">
            {banner && (
              <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mb-6">
                <p className="min-w-0">{banner}</p>
                <button type="button" onClick={() => setBanner(null)} className="shrink-0 font-medium underline">
                  Dismiss
                </button>
              </div>
            )}

            {/* ------------------------------ Projects ----------------------------- */}
            {view === "menu" && (
              <div className="space-y-5 sm:space-y-6">
                {/* Mobile: filter on top, "New project" under it, both full width. sm+: one row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div role="group" aria-label="Filter projects" className="flex rounded border border-stone-300 p-0.5 text-sm sm:inline-flex">
                    {(["ONGOING", "COMPLETED"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={filter === s}
                        onClick={() => setFilter(s)}
                        className={`min-h-10 flex-1 rounded px-3 py-1.5 font-medium transition-colors sm:min-h-0 sm:flex-none ${focusRing} ${filter === s ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"
                          }`}
                      >
                        {s === "ONGOING" ? "Ongoing" : "Completed"}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={startNew}
                    className={`min-h-11 w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 sm:min-h-0 sm:w-auto ${focusRing}`}
                  >
                    New project
                  </button>
                </div>

                {projects.isPending ? (
                  <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3" aria-busy="true">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-72 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />
                    ))}
                  </div>
                ) : projects.isError ? (
                  <ErrorNotice error={projects.error} onRetry={() => projects.refetch()} />
                ) : projects.data.length === 0 ? (
                  <div className="rounded border border-dashed border-stone-300 px-4 py-10 text-center sm:px-8 sm:py-14">
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
                  // 1 column on phones, 2 from sm, 3 from xl. Grid items stretch, so cards in a row match height.
                  <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                    {projects.data.map((p) => (
                      <li key={p.id} className="min-w-0">
                        <ProjectCard project={p} onOpen={openProject} onToggleStatus={toggleStatus} onDelete={removeProject} />
                      </li>
                    ))}
                  </ul>
                )}

                <section aria-label="Recent attendance" className="min-w-0 space-y-3 pt-2 sm:pt-4">
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
                  className={`mb-2 inline-flex min-h-11 items-center text-sm font-medium text-stone-500 transition-colors hover:text-stone-900 sm:mb-4 sm:min-h-0 ${focusRing}`}
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
                {view === "materials" && <ProjectInventory key="plan" projectId={project.id} initialTab="plan" />}
                {view === "inventory" && <ProjectInventory key="stock" projectId={project.id} initialTab="stock" />}
                {view === "activity" && <AuditLog projectId={project.id} />}

                {view === "payments" && (
                  <div className="mx-auto min-w-0 max-w-6xl space-y-5 sm:space-y-6">
                    <ProjectCostTracker
                      projectId={project.id}
                      projectCost={project.projectCost}
                      tasks={tasks}
                      onSetCost={access.can("project.manage") ? startEdit : undefined}
                    />

                    <Ledger s={totals} />
                    <PaymentSchedule tasks={tasks} />
                  </div>
                )}

                {view === "progress" && (
                  <div className="mx-auto min-w-0 max-w-4xl space-y-5 sm:space-y-6">
                    <Ledger s={totals} />
                    <p aria-live="polite" className={`text-sm ${saveState === "error" ? "text-red-700" : "text-stone-500"}`}>
                      {saveState === "saving" && "Saving…"}
                      {saveState === "idle" && "All changes saved"}
                      {saveState === "error" && "Couldn't save the last change. The values were reset to what is stored."}
                    </p>
                    <ProgressTracker tasks={tasks} onUpdate={updateTask} canEditPaid={access.can("project.manage")} />
                  </div>
                )}

                {view === "dashboard" && (
                  <div className="min-w-0 space-y-6 sm:space-y-8">
                    {/* Mobile: title, then a full-width edit button. sm+: title left, button right */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <h2 className="min-w-0 wrap-break-word text-lg font-semibold">{project.title}</h2>
                      {access.can("project.manage") && (
                        <button type="button" onClick={startEdit} className={`${buttonSecondary} w-full sm:w-auto`}>
                          Edit project data
                        </button>
                      )}
                    </div>

                    <ProjectCostTracker
                      projectId={project.id}
                      projectCost={project.projectCost}
                      tasks={tasks}
                      onSetCost={access.can("project.manage") ? startEdit : undefined}
                    />

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
          </div>
        </TasksProvider>
      </ProjectAccessProvider>
    </div>
  );
}