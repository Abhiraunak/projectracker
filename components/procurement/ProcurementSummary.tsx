import { summarizeRequirements } from "@/lib/materials/procurement";
import type { Requirement } from "@/lib/materials/types";
import { Pill } from "@/components/materials/Pill";
import { StatCard } from "@/components/materials/StatCard";

/** The four numbers that tell you what needs attention */
export function ProcurementSummary({ requirements, today }: { requirements: Requirement[]; today: Date }) {
  const s = summarizeRequirements(requirements, today);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard title="Not yet ordered" value={String(s.notOrdered)} note="Requirements with no request or order" />
      <StatCard title="Awaiting approval" value={String(s.awaitingApproval)} note="Requests waiting for a manager" />
      <StatCard title="Pending orders" value={String(s.pendingOrders)} note="Ordered, not fully delivered yet" />
      <StatCard
        title="Overdue deliveries"
        value={String(s.overdue)}
        note="Past the expected date"
        pill={s.overdue > 0 ? <Pill tone="bad">Follow up</Pill> : <Pill tone="good">None late</Pill>}
      />
    </div>
  );
}
