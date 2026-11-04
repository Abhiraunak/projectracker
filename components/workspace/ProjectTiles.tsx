"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { FiPlus, FiSearch } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useProjects } from "@/hooks/useLabourProjects";
import { usePrefetchProject } from "@/hooks/useProjectHub";
import { EmptyState, SectionError } from "./ui";
import { ProjectTile } from "./ProjectTile";
import { NewProjectDialog } from "./NewProjectDialog";

type Filter = "ONGOING" | "COMPLETED";
const SEARCH_FROM = 7; // a search box only once there are enough projects to need one

/**
 * The workspace's first screen: one tile per project. Tap a tile to open it.
 * Also used on the simple dashboard: `linkBase` makes the tiles open the Projects page, and `showNew={false}` hides
 * the New project button (the dashboard has its own).
 */
export function ProjectTiles({ linkBase, showNew = true }: { linkBase?: string; showNew?: boolean } = {}) {
  const [filter, setFilter] = useState<Filter>("ONGOING");
  const [search, setSearch] = useState("");
  const projects = useProjects(filter);
  const prefetch = usePrefetchProject();
  const canCreate = useCan("project.manage");
  const [creating, setCreating] = useState(false);

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
        {canCreate && showNew && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            <FiPlus aria-hidden /> New project
          </button>
        )}
        </div>
      </div>
      {creating && <NewProjectDialog onClose={() => setCreating(false)} />}

      {projects.isPending ? (
        <TileGrid>
          {[0, 1, 2].map((i) => (
            <li key={i} aria-hidden className="h-80 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />
          ))}
        </TileGrid>
      ) : projects.isError ? (
        <SectionError error={projects.error} onRetry={() => void projects.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState
          title={query ? "No project matches that" : filter === "ONGOING" ? "No ongoing projects" : "No completed projects"}
          hint={query ? "Try part of the name or the firm." : filter === "ONGOING" && canCreate ? "Use New project to start one." : undefined}
        />
      ) : (
        <TileGrid>
          {shown.map((p) => (
            <ProjectTile key={p.id} project={p} onIntent={prefetch} linkBase={linkBase} />
          ))}
        </TileGrid>
      )}
    </div>
  );
}

const TileGrid = ({ children }: { children: React.ReactNode }) => (
  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">{children}</ul>
);