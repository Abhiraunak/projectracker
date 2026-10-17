import { FiAlertTriangle } from "react-icons/fi";
import type { ProcurementStatus } from "@/lib/materials/types";
import { Pill, type Tone } from "@/components/materials/Pill";

const STATUS: Record<ProcurementStatus, { label: string; tone: Tone }> = {
  not_ordered: { label: "Not ordered", tone: "neutral" },
  requested: { label: "Awaiting approval", tone: "info" },
  ordered: { label: "Ordered", tone: "dark" },
  partly_delivered: { label: "Partly delivered", tone: "warn" },
  delivered: { label: "Delivered", tone: "good" },
};

export const STATUS_OPTIONS = (Object.keys(STATUS) as ProcurementStatus[]).map((value) => ({ value, label: STATUS[value].label }));

export function ProcurementStatusPill({ status, overdue = false }: { status: ProcurementStatus; overdue?: boolean }) {
  const { label, tone } = STATUS[status];
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Pill tone={tone}>{label}</Pill>
      {overdue && (
        <Pill tone="bad" icon={FiAlertTriangle}>
          Overdue
        </Pill>
      )}
    </span>
  );
}
