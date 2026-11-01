import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isFeatureOn } from "@/lib/features";
import { ProjectWorkspace } from "@/components/workspace/ProjectWorkspace";

export const metadata: Metadata = { title: "Projects" };

/** /dashboard/projects, ?p=<project>&s=<section>. Exists only while NEXT_PUBLIC_FEATURES has projectHub. */
export default function ProjectsPage() {
  if (!isFeatureOn("projectHub")) notFound();
  return <ProjectWorkspace />;
}
