"use client";

import { useState } from "react";
import { FiPlus } from "react-icons/fi";
import { useProjects } from "@/hooks/useLabourProjects";
import { useAccess } from "@/hooks/useProjectAccess";
import { goTo } from "@/hooks/useWorkspacePlace";
import { plural } from "@/lib/projects/hub";
import { NewProjectDialog } from "@/components/workspace/NewProjectDialog";
import { ProjectTiles } from "@/components/workspace/ProjectTiles";
import { ProjectWorkspace } from "@/components/workspace/ProjectWorkspace";
import { isOverCost, timeLeftOf } from "@/components/workspace/ProjectTile";

/**
 * The dashboard: "Street House Projects", a one-line summary, Create new project, then every project as a card.
 * Tapping a card opens that project's details right here (?p=… on the dashboard), not on a separate Projects page;
 * the back arrow in the project returns to the cards. BOQ, Clients, Admin and Log out are in the top bar's menu.
 */
export function SimpleDashboard() {
  return <ProjectWorkspace home={<DashboardHomeScreen />} />;
}

function DashboardHomeScreen() {
  const access = useAccess();
  const canCreate = access.can("project.manage");
  const [creating, setCreating] = useState(false);
  const projects = useProjects(); // the same list the cards use: one request

  // "6 projects · 1 overdue · 1 over cost": only the parts that apply
  const list = projects.data ?? [];
  const late = list.filter((p) => timeLeftOf(p).tone === "bad").length;
  const over = list.filter(isOverCost).length;
  const summary = projects.data ? [plural(list.length, "project"), late ? `${late} overdue` : "", over ? `${over} over cost` : ""].filter(Boolean).join(" · ") : " ";

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[#111111] sm:text-[32px]">Street House Projects</h1>
          <p className="mt-1.5 text-[15px] text-[#666666]">{summary}</p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#111111] px-4.5 text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(17,17,17,0.16)] transition-colors duration-180 hover:bg-[#2B2B2B] active:bg-black focus:outline-none focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#111111] motion-reduce:transition-none"
          >
            <FiPlus aria-hidden className="text-lg" /> Create new project
          </button>
        )}
      </header>

      {/* every project as a card; a tap opens it here on the dashboard */}
      <ProjectTiles showNew={false} />

      {creating && <NewProjectDialog onClose={() => setCreating(false)} onCreated={(id) => goTo({ projectId: id, section: "overview" })} />}
    </div>
  );
}