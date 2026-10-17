import { FiAlertCircle } from "react-icons/fi";
import { formatQty } from "@/lib/materials/format";
import type { InventoryItem } from "@/lib/materials/types";

/** A red banner naming every material the project will run short of. Shows nothing when there are none. */
export function ShortageAlert({ items }: { items: InventoryItem[] }) {
  const short = items.filter((item) => item.shortage > 0);
  if (short.length === 0) return null;

  return (
    <div role="alert" className="flex gap-3 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <FiAlertCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">Material shortage</p>
        <p className="mt-1">
          {short.map((item, index) => (
            <span key={item.material.id}>
              {index > 0 && ", "}
              {item.material.name} is short by <strong>{formatQty(item.shortage, item.material.unit)}</strong>
            </span>
          ))}
          . Order more to keep work from stopping.
        </p>
      </div>
    </div>
  );
}
