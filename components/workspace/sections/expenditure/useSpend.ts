"use client";

import { useQuery } from "@tanstack/react-query";
import { useProjectHub } from "@/hooks/useProjectHub";
import { hubApi, spendKey, type ProjectHub, type ProjectSpend } from "@/lib/projects/hub";

export interface Spend {
  hub: ProjectHub;
  /** Labour = attendance + contract work (Labour section) */
  labour: number;
  /** Materials = what the deliveries cost (Materials › Delivery log) */
  material: number;
  /** Equipment = hire charged to this site so far (Equipment section) */
  equipment: number;
  /** General expenses (General section) */
  general: number;
  spent: number;
  /** Every part, so the Overview can say exactly where each head's figure comes from */
  parts: ProjectSpend;
  /** Our own cost for the whole job (set with Edit). Everything spent is measured against this. null = not set */
  projectCost: number | null;
  /** What the client sees: all linked BOQs added up. Shown for reference only, never used to judge spending. null = none */
  boqTotal: number | null;
  /** What spent is measured against: always the project cost (null until it is set) */
  against: number | null;
  againstName: "the project cost";
  pct: number | null;
  left: number | null; // below 0: over
  /** Labour work not yet paid to contractors (0 when paid ahead) */
  labourToPay: number;
}

/**
 * The project's money for the Overview and the Expenditure tab, so both show the same figures. The spending comes
 * from the server in one sum (GET /projects/:id/spend), built only from the workspace sections' own records, so it
 * does not depend on which sections this person may open. Its key starts with "attendance", so saving attendance,
 * contract work, a payment, a delivery, an equipment move or an expense refreshes it straight away.
 */
export function useSpend(projectId: string): Spend | null {
  const hub = useProjectHub(projectId);
  const spend = useQuery({ queryKey: spendKey(projectId), queryFn: () => hubApi.spend(projectId), staleTime: 30_000 });

  if (!hub.data || !spend.data) return null;
  const h = hub.data;
  const s = spend.data;

  const projectCost = h.money.budgetIsSet ? h.money.budget : null;
  const boqTotal = h.boqs && h.boqs.length > 0 ? h.boqs.reduce((sum, b) => sum + b.grandTotal, 0) : null;
  // Two different amounts: the BOQ is what the client is charged; the project cost is what the job costs us.
  // Spending belongs to the project cost, so only that is used for spent %, left and over.
  const against = projectCost;

  return {
    hub: h,
    labour: s.labour.total,
    material: s.material.total,
    equipment: s.equipment,
    general: s.general,
    spent: s.total,
    parts: s,
    projectCost,
    boqTotal,
    against,
    againstName: "the project cost",
    pct: against ? Math.round((s.total / against) * 100) : null,
    left: against !== null ? Math.round((against - s.total) * 100) / 100 : null,
    labourToPay: Math.max(0, s.labour.toPay),
  };
}