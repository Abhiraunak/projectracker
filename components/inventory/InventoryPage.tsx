"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useProjects } from "@/hooks/useLabourProjects";
import { useActiveProject } from "@/hooks/useActiveProject";
import { useAccess } from "@/hooks/useProjectAccess";
import { Heading } from "@/components/utilites/Label";
import { QueryError } from "@/components/materials/QueryError";
import { INVENTORY_TABS, ProjectInventory, type InventoryTab } from "./ProjectInventory";
import { ProjectSwitcher } from "./ProjectSwitcher";

const Skeleton = () => <div aria-busy="true" className="h-64 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />;
function tabFromUrl(): InventoryTab | undefined {
  if (typeof window === "undefined") return undefined;
  const wanted = new URLSearchParams(window.location.search).get("tab");
  return wanted && (INVENTORY_TABS as string[]).includes(wanted) ? (wanted as InventoryTab) : undefined;
}

function Notice({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded border border-dashed border-stone-300 px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{hint}</p>
    </div>
  );
}

/** The Inventory page: one project at a time (the last one used, or a switcher), its materials worked out from its BOQs */
export function InventoryPage() {
  const projects = useProjects("ONGOING");
  const usable = useMemo(() => projects.data ?? [], [projects.data]);
  const { activeId, select } = useActiveProject(usable.map((p) => p.id));
  const access = useAccess();

  // Opened from a notification (/dashboard/inventory?project=<id>&tab=requests): that project, that tab.
  // Read once on arrival; window.location avoids Next's useSearchParams, which needs a Suspense boundary.
  const [tab] = useState<InventoryTab | undefined>(tabFromUrl);
  // The project goes to the browser's saved choice (updating something outside React, which is what an
  // effect is for; useActiveProject then re-reads it). Runs once, on arrival.
  useEffect(() => {
    const project = new URLSearchParams(window.location.search).get("project");
    if (project) select(project);
  }, [select]);

  if (projects.isPending || access.isLoading) return <Skeleton />;
  if (projects.isError) return <QueryError error={projects.error} onRetry={() => projects.refetch()} />;
  if (!access.can("materials.view")) return <Notice title="You don't have access to inventory" hint="Ask an admin to give you the materials permission." />;
  if (usable.length === 0) return <Notice title="No ongoing projects yet" hint="Stock is kept per project. Create a project, then link its BOQ to it." />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Heading>Inventory</Heading>
          <p className="mt-1 text-sm text-stone-500">Materials worked out from the project&rsquo;s BOQ, and everything received, used and ordered.</p>
        </div>
        {activeId && <ProjectSwitcher projects={usable} activeId={activeId} onChange={select} />}
      </header>
      {/* key: another project starts the screen fresh (tab, dialogs) */}
      {activeId ? <ProjectInventory key={`${activeId}:${tab ?? ""}`} projectId={activeId} initialTab={tab} /> : <Skeleton />}
    </div>
  );
}
