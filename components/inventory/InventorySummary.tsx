import { summarizeInventory } from "@/lib/materials/stock";
import type { InventoryItem } from "@/lib/materials/types";
import { Pill } from "@/components/materials/Pill";
import { StatCard } from "@/components/materials/StatCard";

export function InventorySummary({ items }: { items: InventoryItem[] }) {
  const s = summarizeInventory(items);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard title="Materials tracked" value={String(s.tracked)} note="With stock or a requirement" />
      <StatCard
        title="Shortages"
        value={String(s.shortages)}
        note="Stock plus orders won't cover the need"
        pill={s.shortages > 0 ? <Pill tone="bad">Act now</Pill> : <Pill tone="good">None</Pill>}
      />
      <StatCard
        title="Low stock"
        value={String(s.low)}
        note="At or under the reorder level"
        pill={s.low > 0 ? <Pill tone="warn">Reorder soon</Pill> : undefined}
      />
      <StatCard title="With reservations" value={String(s.withReservations)} note="Material set aside for work items" />
    </div>
  );
}
