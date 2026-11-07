"use client";

import { useEffect, type ReactNode } from "react";
import { useWorkspaceItem, useWorkspaceProjectId, useWorkspaceSection } from "@/hooks/useWorkspacePlace";
import { ProjectTiles } from "./ProjectTiles";
import { ProjectHub } from "./ProjectHub";

/**
 * A new screen starts at the top. On large screens the layout's card scrolls, not the window.
 * Its own little component, so following the section re-renders nothing else.
 */
function ScrollToTop() {
  const projectId = useWorkspaceProjectId();
  const section = useWorkspaceSection();
  const item = useWorkspaceItem();
  useEffect(() => {
    document.getElementById("main-content")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [projectId, section, item]);
  return null;
}

/**
 * The project workspace: one page for everything. The tiles, a project's hub and each of its sections are
 * swapped in place as the address changes (see useWorkspacePlace): the page never reloads.
 * `home`: what shows when no project is open (the dashboard passes its own); by default, the project tiles.
 */
export function ProjectWorkspace({ home }: { home?: ReactNode } = {}) {
  const projectId = useWorkspaceProjectId(); // re-renders only when the project changes, not the section

  return (
    <div className="min-w-0 text-stone-900">
      <ScrollToTop />
      {projectId ? (
        // A new key per project: its sections and their state start fresh, and nothing from the last project shows
        <ProjectHub key={projectId} projectId={projectId} />
      ) : home ? (
        home
      ) : (
        <>
          <h1 className="mb-5 text-xl font-semibold tracking-tight sm:text-2xl">street-house projects</h1>
          <ProjectTiles />
        </>
      )}
    </div>
  );
}