"use client";

import { useEffect } from "react";
import { ProjectInventory } from "@/components/inventory/ProjectInventory";

/**
 * "More" on the Materials tab: the full inventory (plan, stock, requests, orders, cost, log).
 * Material expenses have their own Expenditure tab on the Materials tab.
 */
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