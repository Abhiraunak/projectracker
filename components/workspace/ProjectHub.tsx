"use client";

import { memo, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiEdit2, FiGrid } from "react-icons/fi";
import { useQueryClient } from "@tanstack/react-query";
import { useAccess } from "@/hooks/useProjectAccess";
import { useProjectHub } from "@/hooks/useProjectHub";
import { usePrefetchSection } from "@/hooks/useProjectPages";
import { hrefFor, onPlaceClick, useWorkspaceSection } from "@/hooks/useWorkspacePlace";
import type { ProjectSummary } from "@/lib/api";
import type { ProjectHub as Hub } from "@/lib/projects/hub";
import type { SectionKey } from "@/lib/projects/place";
import { SECTIONS, sectionByKey, type SectionDef } from "./sections";
import { Overview } from "./Overview";
import { EditDetailsDialog } from "./EditDetailsDialog";
import { SectionBoundary, SectionError, SectionSkeleton } from "./ui";

/**
 * One project: a header, a row of sections, and the open section below.
 *
 * Fast by design:
 *  - The header shows straight away from the project list already in memory; the hub's figures fill in after.
 *  - A section's code downloads when someone points at or touches its tab, before the tap.
 *  - Sections once opened stay mounted (hidden) until you leave the project, so switching back is instant and
 *    nothing typed is lost (an attendance sheet half filled, an inventory tab, a scroll position).
 */
export function ProjectHub({ projectId }: { projectId: string }) {
  const access = useAccess();
  const hub = useProjectHub(projectId);
  const section = useWorkspaceSection();
  const fromList = useListedProject(projectId);
  const [editing, setEditing] = useState(false);
  const startEditing = useCallback(() => setEditing(true), []);

  // Pointing at or touching a tab or tile: download the section's code and start its one request
  const prefetchSection = usePrefetchSection();
  const warm = useCallback(
    (def: SectionDef) => {
      void def.load();
      prefetchSection(def.key, projectId);
    },
    [prefetchSection, projectId]
  );

  const allowed = useMemo(() => SECTIONS.filter((s) => access.can(s.needs)), [access]);
  const current: SectionKey = section !== "overview" && allowed.some((s) => s.key === section) ? section : "overview";

  // The tab moves at once; the content follows. If a section's code is still downloading, the old section stays
  // on screen until the new one is ready, instead of flashing a loading block.
  const shown = useDeferredValue(current);

  // Sections opened so far in this project. Read and written during render on purpose: adding the current
  // section is idempotent, and it saves a second render that an effect would cost.
  const visited = useRef(new Set<SectionKey>());
  if (shown !== "overview") visited.current.add(shown);

  const title = hub.data?.project.title ?? fromList?.title ?? "";
  const firm = hub.data?.project.firmName ?? fromList?.firmName ?? null;

  return (
    <div className="min-w-0">
      <HubHeader
        projectId={projectId}
        title={title}
        firm={firm}
        canEdit={access.can("project.manage") && !!hub.data}
        onEdit={startEditing}
      />
      <SectionNav projectId={projectId} current={current} sections={allowed} onWarm={warm} />

      <div className="pt-5 sm:pt-6">
        {shown === "overview" &&
          (hub.isError ? (
            <SectionError error={hub.error} onRetry={() => void hub.refetch()} />
          ) : hub.data ? (
            <Overview projectId={projectId} hub={hub.data} sections={allowed} onWarm={warm} />
          ) : (
            <SectionSkeleton />
          ))}

        {[...visited.current].map((key) => {
          const def = sectionByKey.get(key as SectionDef["key"]);
          if (!def || !allowed.includes(def)) return null;
          return (
            <div key={key} hidden={key !== shown}>
              <KeptSection def={def} projectId={projectId} />
            </div>
          );
        })}
      </div>

      {editing && hub.data && <EditDetailsDialog project={hub.data.project} onClose={() => setEditing(false)} />}
    </div>
  );
}

/**
 * A section that has been opened. Memoised: switching to another section only hides its wrapper, so the section
 * itself doesn't re-render, keeps its state, and costs nothing while hidden.
 */
const KeptSection = memo(function KeptSection({ def, projectId }: { def: SectionDef; projectId: string }) {
  return (
    <SectionBoundary resetKey={projectId}>
      <Suspense fallback={<SectionSkeleton />}>
        <def.Section projectId={projectId} />
      </Suspense>
    </SectionBoundary>
  );
});

/** The project's card from the list already loaded, if any: lets the header show before the hub arrives */
function useListedProject(projectId: string): Pick<ProjectSummary, "title" | "firmName"> | undefined {
  const qc = useQueryClient();
  return useMemo(() => {
    for (const [, data] of qc.getQueriesData<ProjectSummary[] | Hub>({ queryKey: ["projects"] })) {
      if (Array.isArray(data)) {
        const found = data.find((p) => p.id === projectId);
        if (found) return found;
      }
    }
    return undefined;
  }, [qc, projectId]);
}

const HubHeader = memo(function HubHeader({
  projectId,
  title,
  firm,
  canEdit,
  onEdit,
}: {
  projectId: string;
  title: string;
  firm: string | null;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const back = useMemo(() => ({ projectId: null, section: "overview" as const }), []);
  return (
    <div className="flex items-start gap-2">
      <a
        href={hrefFor(back)}
        onClick={onPlaceClick(back)}
        aria-label="All projects"
        title="All projects"
        className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900"
      >
        <FiArrowLeft aria-hidden />
      </a>
      <div className="min-w-0 flex-1 pt-1">
        {firm && <p className="truncate text-xs font-medium uppercase tracking-wide text-stone-500">{firm}</p>}
        <h1 className="truncate text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl" aria-busy={!title || undefined}>
          {title || <span className="inline-block h-6 w-48 animate-pulse rounded bg-stone-100 align-middle" />}
        </h1>
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="flex h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
        >
          <FiEdit2 aria-hidden />
          <span className="hidden sm:inline">Edit</span>
        </button>
      )}
    </div>
  );
});

/**
 * The section tabs. On phones they scroll sideways in one row. Re-renders only when the section changes.
 * Pointing at or touching a tab downloads its code and starts its data.
 */
const SectionNav = memo(function SectionNav({
  projectId,
  current,
  sections,
  onWarm: warm,
}: {
  projectId: string;
  current: SectionKey;
  sections: SectionDef[];
  onWarm: (def: SectionDef) => void;
}) {
  // On a phone the tabs scroll sideways: keep the open one in view (after the back button, or a shared link)
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    listRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);

  const tabs = useMemo(
    () => [{ key: "overview" as const, label: "Overview", Icon: FiGrid, def: null as SectionDef | null }, ...sections.map((d) => ({ key: d.key, label: d.label, Icon: d.Icon, def: d }))],
    [sections]
  );

  return (
    <nav
      aria-label="Project sections"
      className="sticky top-14 z-10 -mx-4 mt-3 border-b border-stone-200 bg-white px-4 sm:-mx-6 sm:px-6 lg:-top-6 lg:-mx-8 lg:px-8"
    >
      <ul ref={listRef} className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(({ key, label, Icon, def }) => {
          const place = { projectId, section: key };
          const active = key === current;
          return (
            <li key={key} className="shrink-0">
              <a
                href={hrefFor(place)}
                onClick={onPlaceClick(place)}
                onPointerEnter={def ? () => warm(def) : undefined}
                onTouchStart={def ? () => warm(def) : undefined}
                onFocus={def ? () => warm(def) : undefined}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors ${
                  active ? "border-orange-500 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-900"
                }`}
              >
                <Icon aria-hidden className="text-base" />
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});
