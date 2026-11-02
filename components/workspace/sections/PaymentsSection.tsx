"use client";

import { useProject } from "@/hooks/useLabourProjects";
import { PaymentSchedule } from "@/components/labour/PaymentSchedule";
import { SectionError, SectionSkeleton } from "../ui";

/** Labour payments: agreed, paid and what's left, per work item */
export default function PaymentsSection({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  if (project.isPending) return <SectionSkeleton />;
  if (project.isError) return <SectionError error={project.error} onRetry={() => void project.refetch()} />;
  return <PaymentSchedule tasks={project.data.tasks} />;
}
