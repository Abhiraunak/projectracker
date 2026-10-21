import type { BoqStats as Stats } from "@/lib/boq/api";
import { fmtMoney } from "@/lib/boq/format";
import { StatCard } from "@/components/materials/StatCard";

/** The figures at the top of the BOQ dashboard (for all BOQs, whatever the search) */
export function BoqStats({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard title="BOQs" value={String(stats.count)} note={`${stats.drafts} draft, ${stats.finals} final`} />
      <StatCard title="Total value" value={`₹${fmtMoney(stats.totalValue)}`} note="All BOQs, grand totals" />
      <StatCard title="Final" value={String(stats.finals)} note="Locked, ready to send" />
      <StatCard title="Changed this week" value={String(stats.updatedThisWeek)} note="In the last 7 days" />
    </div>
  );
}
