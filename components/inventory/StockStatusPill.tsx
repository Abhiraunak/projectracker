import { FiAlertCircle, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import type { StockStatus } from "@/lib/materials/types";
import { Pill } from "@/components/materials/Pill";

const CONFIG = {
  ok: { label: "In stock", tone: "good", icon: FiCheckCircle },
  low: { label: "Low stock", tone: "warn", icon: FiAlertTriangle },
  shortage: { label: "Shortage", tone: "bad", icon: FiAlertCircle },
} as const;

/** Green, yellow or red, with an icon too so colour isn't the only signal */
export function StockStatusPill({ status }: { status: StockStatus }) {
  const { label, tone, icon } = CONFIG[status];
  return (
    <Pill tone={tone} icon={icon}>
      {label}
    </Pill>
  );
}
