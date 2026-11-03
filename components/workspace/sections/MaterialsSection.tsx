"use client";

import { lazy, Suspense, useEffect } from "react";
import { ProjectInventory } from "@/components/inventory/ProjectInventory";
import { SectionSkeleton } from "../ui";

// Material expenses download after the inventory, and only here
const ExpensesSection = lazy(() => import("./ExpensesSection"));

/** Materials: the project's inventory (plan, stock, requests, orders, cost, log), then money spent on material */
export default function MaterialsSection({ projectId }: { projectId: string }) {
  // The Inventory page in the menu opens on this project next time too
  useEffect(() => {
    try {
      window.localStorage.setItem("active-project", projectId);
    } catch {
      /* storage blocked: nothing to remember */
    }
  }, [projectId]);
  return (
    <div className="space-y-8">
      <ProjectInventory projectId={projectId} />
      <section aria-label="Material expenses" className="border-t border-stone-200 pt-6">
        <Suspense fallback={<SectionSkeleton />}>
          <ExpensesSection projectId={projectId} sections={["material"]} />
        </Suspense>
      </section>
    </div>
  );
}