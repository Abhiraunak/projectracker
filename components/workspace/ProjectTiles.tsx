"use client";

import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { useProjects } from "@/hooks/useLabourProjects";
import { usePrefetchProject } from "@/hooks/useProjectHub";
import { hrefFor, onPlaceClick } from "@/hooks/useWorkspacePlace";
import { rupeesShort, shortDate } from "@/lib/projects/hub";
import type { ProjectSummary } from "@/lib/api";
import { EmptyState, ProgressRing, SectionError } from "./ui";

type Filter = "ONGOING" | "COMPLETED";
const SEARCH_FROM = 7; // a search box only once there are enough projects to need one

/** The workspace's first screen: one tile per project. Tap a tile to open it. */
export function ProjectTiles() {
  const [filter, setFilter] = useState<Filter>("ONGOING");
  const [search, setSearch] = useState("");
  const projects = useProjects(filter);
  const prefetch = usePrefetchProject();

  // Typing stays instant: the list filters a moment behind the keystrokes when there are many projects
  const query = useDeferredValue(search.trim().toLowerCase());
  const all = projects.data;
  const shown = useMemo(
    () => (query && all ? all.filter((p) => `${p.title} ${p.firmName ?? ""}`.toLowerCase().includes(query)) : (all ?? [])),
    [all, query]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Show projects" className="flex rounded-lg bg-stone-100 p-1 text-sm sm:inline-flex">
          {(["ONGOING", "COMPLETED"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`min-h-10 flex-1 rounded-md px-4 font-medium transition-colors sm:flex-none ${
                filter === f ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {f === "ONGOING" ? "Ongoing" : "Completed"}
            </button>
          ))}
        </div>
        {all && all.length >= SEARCH_FROM && (
          <label className="relative block sm:w-72">
            <span className="sr-only">Find a project</span>
            <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a project"
              className="min-h-11 w-full rounded-lg border border-stone-300 pl-9 pr-3 text-sm focus:border-stone-900 focus:outline-none"
            />
          </label>
        )}
      </div>

      {projects.isPending ? (
        <TileGrid>
          {[0, 1, 2].map((i) => (
            <li key={i} aria-hidden className="h-40 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />
          ))}
        </TileGrid>
      ) : projects.isError ? (
        <SectionError error={projects.error} onRetry={() => void projects.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState
          title={query ? "No project matches that" : filter === "ONGOING" ? "No ongoing projects" : "No completed projects"}
          hint={query ? "Try part of the name or the firm." : filter === "ONGOING" ? "Projects are created on the Project page." : undefined}
          action={!query && filter === "ONGOING" ? { href: "/dashboard/labour", label: "Go to Project page" } : undefined}
        />
      ) : (
        <TileGrid>
          {shown.map((p) => (
            <ProjectTile key={p.id} project={p} onIntent={prefetch} />
          ))}
        </TileGrid>
      )}
    </div>
  );
}

const TileGrid = ({ children }: { children: React.ReactNode }) => (
  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">{children}</ul>
);

/**
 * One project. Memoised, so a tile re-renders only when its own project's figures change, not when the filter,
 * the search box or another tile does. It is a real link, so "open in new tab" works too.
 */
const ProjectTile = memo(function ProjectTile({ project: p, onIntent }: { project: ProjectSummary; onIntent: (id: string) => void }) {
  const place = useMemo(() => ({ projectId: p.id, section: "overview" as const }), [p.id]);
  const intent = useCallback(() => onIntent(p.id), [onIntent, p.id]);
  const budget = p.projectCost ?? p.budget;
  const usedPct = budget > 0 ? Math.min(100, Math.round((p.spent / budget) * 100)) : 0;
  const over = budget > 0 && p.spent > budget;

  return (
    <li className="[content-visibility:auto] [contain-intrinsic-size:auto_160px]">
      <a
        href={hrefFor(place)}
        onClick={onPlaceClick(place)}
        onPointerEnter={intent}
        onTouchStart={intent}
        onFocus={intent}
        className="group flex h-full flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 transition-[border-color,box-shadow] hover:border-stone-400 hover:shadow-sm focus-visible:border-stone-900 focus-visible:outline-none active:bg-stone-50 sm:p-5"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-stone-500">{p.firmName || " "}</p>
            <h2 className="mt-0.5 line-clamp-2 text-base font-semibold leading-snug text-stone-900">{p.title}</h2>
          </div>
          <ProgressRing percent={p.progress} />
        </div>

        <div className="mt-auto">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-stone-500">
              <span className={`font-semibold tabular-nums ${over ? "text-red-700" : "text-stone-900"}`}>{rupeesShort(p.spent)}</span> of {rupeesShort(budget)}
            </span>
            {p.endDate && <span className="shrink-0 text-xs text-stone-500">ends {shortDate(p.endDate)}</span>}
          </div>
          <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div className={`h-full rounded-full ${over ? "bg-red-600" : "bg-stone-800"}`} style={{ width: `${usedPct}%` }} />
          </div>
        </div>
      </a>
    </li>
  );
});
