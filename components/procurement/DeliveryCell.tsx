import { formatDay } from "@/lib/materials/format";
import { describeDelivery } from "@/lib/materials/procurement";
import type { Requirement } from "@/lib/materials/types";

/** Expected delivery date, plus "in 3 days" or "2 days late" while something is still pending */
export function DeliveryCell({ requirement, today }: { requirement: Requirement; today: Date }) {
  if (!requirement.expectedDelivery) return <span className="text-stone-400">Not set</span>;
  const info = describeDelivery(requirement, today);
  return (
    <div>
      <p>{formatDay(requirement.expectedDelivery)}</p>
      {info && <p className={`text-xs ${info.late ? "font-medium text-red-700" : "text-stone-500"}`}>{info.text}</p>}
    </div>
  );
}
