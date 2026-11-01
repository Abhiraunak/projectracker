"use client";

import { useEffect } from "react";
import { ProjectInventory } from "@/components/inventory/ProjectInventory";

/** Materials: the project's inventory (plan, stock, requests, orders, cost, log) */
export default function MaterialsSection({ projectId }: { projectId: string }) {
  // The Inventory page in the menu opens on this project next time too
  useEffect(() => {
    try {
      window.localStorage.setItem("active-project", projectId);
    } catch {
      /* storage blocked: nothing to remember */
    }
  }, [projectId]);
  return <ProjectInventory projectId={projectId} />;
}
