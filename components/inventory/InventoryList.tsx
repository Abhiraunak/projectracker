import type { InventoryItem } from "@/lib/materials/types";
import { InventoryCard } from "./InventoryCard";
import { InventoryTable } from "./InventoryTable";

interface Props {
  items: InventoryItem[];
  onRecord: (materialId: string) => void;
  onHistory: (materialId: string) => void;
}

/** Cards on phones, a table from tablet width up */
export function InventoryList(props: Props) {
  return (
    <>
      <ul className="space-y-3 md:hidden">
        {props.items.map((item) => (
          <li key={item.material.id}>
            <InventoryCard item={item} onRecord={props.onRecord} onHistory={props.onHistory} />
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <InventoryTable {...props} />
      </div>
    </>
  );
}
