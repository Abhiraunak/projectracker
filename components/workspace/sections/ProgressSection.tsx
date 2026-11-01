"use client";

import { useCan } from "@/hooks/useProjectAccess";
import { useProject, useTaskUpdater } from "@/hooks/useLabourProjects";
import { ProjectCostTracker } from "@/components/labour/ProjectCostTracker";
import { ProgressTracker } from "@/components/labour/Progresstracker";
import { SectionError, SectionSkeleton, SaveState } from "../ui";

/** Progress: the budget against what's spent, then each work item's progress (and, for managers, amount paid) */
export default function ProgressSection({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const { update, state } = useTaskUpdater(projectId);
  const canEditPaid = useCan("project.manage");

  if (project.isPending) return <SectionSkeleton />;
  if (project.isError) return <SectionError error={project.error} onRetry={() => void project.refetch()} />;

  return (
    <div className="space-y-6">
      <ProjectCostTracker projectCost={project.data.projectCost} tasks={project.data.tasks} projectId={projectId} />
      <div>
        <SaveState state={state} />
        <ProgressTracker tasks={project.data.tasks} onUpdate={update} canEditPaid={canEditPaid} />
      </div>
    </div>
  );
}
