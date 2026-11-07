"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { FiPlus, FiSearch, FiX } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useProjects } from "@/hooks/useLabourProjects";
import { usePrefetchProject } from "@/hooks/useProjectHub";
import { EmptyState, SectionError } from "./ui";
import { ProjectTile } from "./ProjectTile";
import { NewProjectDialog } from "./NewProjectDialog";

const SEARCH_FROM = 2; // a search box as soon as there is more than one project to choose from
// What was typed in the search box, kept while the app is open: opening a project and coming back keeps the search
let lastSearch = "";
/** Lower case, without accents and extra spaces, so "sharma  res" finds "Sharma Residence" */
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * The workspace's first screen: one tile per project, ongoing and completed together (ongoing first; each tile says
 * which it is). Tap a tile to open it.
 * Also used on the simple dashboard: `linkBase` makes the tiles open the Projects page, and `showNew={false}` hides
 * the New project button (the dashboard has its own).
 */
export function ProjectTiles({ linkBase, showNew = true }: { linkBase?: string; showNew?: boolean } = {}) {
  const [search, setSearchState] = useState(lastSearch);
  const setSearch = (v: string) => {
    lastSearch = v;
    setSearchState(v);
  };
  const projects = useProjects(); // every project that isn't archived
  const prefetch = usePrefetchProject();
  const canCreate = useCan("project.manage");
  const [creating, setCreating] = useState(false);

  // Typing stays instant: the list filters a moment behind the keystrokes when there are many projects
  const query = useDeferredValue(norm(search));
  // Ongoing first, then completed; each keeps the server's order (latest change first)
  const all = useMemo(() => (projects.data ? [...projects.data].sort((a, b) => Number(a.status === "COMPLETED") - Number(b.status === "COMPLETED")) : undefined), [projects.data]);
  // Every word typed must appear in the project's name, firm, or status ("ongoing" / "completed"), in any order
  const shown = useMemo(() => {
    if (!all) return [];
    if (!query) return all;
    const words = query.split(" ");
    return all.filter((p) => {
      const text = norm(`${p.title} ${p.firmName ?? ""} ${p.status === "COMPLETED" ? "completed" : "ongoing"}`);
      return words.every((w) => text.includes(w));
    });
  }, [all, query]);

  const showSearch = !!all && all.length >= SEARCH_FROM;
  const showNewButton = canCreate && showNew;

  return (
    <div className="space-y-5">
      {(showSearch || showNewButton) && (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {showSearch && (
          <div role="search" className="min-w-0 flex-1 sm:max-w-110">
            <label className="relative block">
              <span className="sr-only">Search projects</span>
              <FiSearch aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#666666]" />
              <input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setSearch("")}
                placeholder="Search by project or firm name"
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-[#DADAD7] bg-white pl-10 pr-11 text-[15px] text-[#111111] placeholder:text-[#8C8C8C] transition-[border-color,box-shadow] duration-180 focus:border-[#111111] focus:shadow-[0_0_0_3px_rgba(17,17,17,0.10)] focus:outline-none motion-reduce:transition-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#666666] hover:bg-[#F1F1EF] hover:text-[#111111] focus:outline-none focus-visible:outline focus-visible:outline-[#111111]"
                >
                  <FiX aria-hidden />
                </button>
              )}
            </label>
            {query && (
              <p aria-live="polite" className="mt-2 px-1 text-[13px] text-[#666666]">
                {shown.length} of {all!.length} projects
              </p>
            )}
          </div>
        )}
        {showNewButton && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            <FiPlus aria-hidden /> New project
          </button>
        )}
      </div>
      )}
      {creating && <NewProjectDialog onClose={() => setCreating(false)} />}

      {projects.isPending ? (
        <TileGrid>
          {[0, 1, 2].map((i) => (
            <li key={i} aria-hidden className="h-64 animate-pulse rounded-[22px] bg-[#F1F1EF] motion-reduce:animate-none" />
          ))}
        </TileGrid>
      ) : projects.isError ? (
        <SectionError error={projects.error} onRetry={() => void projects.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState
          title={query ? "No project matches that" : "No projects yet"}
          hint={query ? "Try part of the name or the firm." : canCreate ? "Use Create new project to start one." : undefined}
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
  <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4 sm:gap-5">{children}</ul>
);