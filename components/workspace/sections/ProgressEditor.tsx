"use client";

import { useCan } from "@/hooks/useProjectAccess";
import { useProject, useTaskUpdater } from "@/hooks/useLabourProjects";
import { ProgressTracker } from "@/components/labour/Progresstracker";
import { SaveState, SectionError, SectionSkeleton } from "../ui";

/**
 * Today's per-item editor, opened from the Progress page. Each change shows at once and is saved half a second
 * after the last touch; the page's figures above refresh after the save (they share the "projects" key).
 */
export default function ProgressEditor({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const { update, state } = useTaskUpdater(projectId);
  const canEditPaid = useCan("project.manage");

  if (project.isPending) return <SectionSkeleton />;
  if (project.isError) return <SectionError error={project.error} onRetry={() => void project.refetch()} />;
  return (
    <>
      <SaveState state={state} />
      <ProgressTracker tasks={project.data.tasks} onUpdate={update} canEditPaid={canEditPaid} />
    </>
  );
}
