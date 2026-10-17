import type { Requirement } from "@/lib/materials/types";
import { RequirementCard } from "./RequirementCard";
import { RequirementsTable } from "./RequirementsTable";

interface Props {
  items: Requirement[];
  today: Date;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Cards on phones, a table from tablet width up */
export function RequirementList(props: Props) {
  return (
    <>
      <ul className="space-y-3 md:hidden">
        {props.items.map((r) => (
          <li key={r.id}>
            <RequirementCard requirement={r} today={props.today} onEdit={props.onEdit} onDelete={props.onDelete} />
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <RequirementsTable {...props} />
      </div>
    </>
  );
}
