"use client";

import { useQuery } from "@tanstack/react-query";
import { useExpenses } from "@/hooks/useExpenses";
import { labourSummaryKey } from "@/hooks/useLabour";
import { useAccess } from "@/hooks/useProjectAccess";
import { useProjectHub } from "@/hooks/useProjectHub";
import { labourApi } from "@/lib/projects/labour";
import type { ProjectHub } from "@/lib/projects/hub";

export interface Spend {
  hub: ProjectHub;
  /** Labour = work done (attendance) + labour expenses */
  labour: number;
  /** Material = the Materials list + material expenses */
  material: number;
  general: number;
  spent: number;
  projectCost: number | null; // set with Edit; null = not set
  boqTotal: number | null; // all linked BOQs; null = none
  /** What spent is measured against: the project cost, or the BOQ without one */
  against: number | null;
  againstName: "the project cost" | "the BOQ";
  pct: number | null;
  left: number | null; // below 0: over
  /** Attendance not yet paid to contractors (0 when paid ahead) */
  labourToPay: number;
}

/**
 * The project's money, worked out once for the Overview and the Expenditure tab so both always show the same figures.
 * Built only from what the project already loads (the hub, the expenses, the Labour page's summary).
 */
export function useSpend(projectId: string): Spend | null {
  const access = useAccess();
  const hub = useProjectHub(projectId);
  const expenses = useExpenses(projectId);
  // Same key as the Labour page, so the figures are shared and refresh together
  const labour = useQuery({ queryKey: labourSummaryKey(projectId), queryFn: () => labourApi.summary(projectId), enabled: access.can("attendance.view"), staleTime: 30_000 });

  if (!hub.data || !expenses.data) return null;
  const h = hub.data;
  const cat = expenses.data.byCategory;
  const labourSpent = (labour.data?.labour ?? h.labour.earned) + (cat?.labour.total ?? 0);
  const materialSpent = (h.materials?.spent ?? 0) + (cat?.material.total ?? 0);
  const generalSpent = cat?.general.total ?? (cat ? 0 : expenses.data.total);
  const spent = labourSpent + materialSpent + generalSpent;

  const projectCost = h.money.budgetIsSet ? h.money.budget : null;
  const boqTotal = h.boqs && h.boqs.length > 0 ? h.boqs.reduce((s, b) => s + b.grandTotal, 0) : null;
  const against = projectCost ?? boqTotal;

  return {
    hub: h,
    labour: labourSpent,
    material: materialSpent,
    general: generalSpent,
    spent,
    projectCost,
    boqTotal,
    against,
    againstName: projectCost !== null ? "the project cost" : "the BOQ",
    pct: against ? Math.round((spent / against) * 100) : null,
    left: against !== null ? against - spent : null,
    labourToPay: Math.max(0, labour.data?.toPay ?? h.labour.due),
  };
}