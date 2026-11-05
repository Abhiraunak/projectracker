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
  /** Our own cost for the whole job (set with Edit). Everything spent is measured against this. null = not set */
  projectCost: number | null;
  /** What the client sees: all linked BOQs added up. Shown for reference only, never used to judge spending. null = none */
  boqTotal: number | null;
  /** What spent is measured against: always the project cost (null until it is set) */
  against: number | null;
  againstName: "the project cost";
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
  // Two different amounts: the BOQ is what the client is charged; the project cost is what the job costs us.
  // Spending belongs to the project cost, so only that is used for spent %, left and over.
  const against = projectCost;

  return {
    hub: h,
    labour: labourSpent,
    material: materialSpent,
    general: generalSpent,
    spent,
    projectCost,
    boqTotal,
    against,
    againstName: "the project cost",
    pct: against ? Math.round((spent / against) * 100) : null,
    left: against !== null ? against - spent : null,
    labourToPay: Math.max(0, labour.data?.toPay ?? h.labour.due),
  };
}