import type { Metadata } from "next";
import { BoqDashboard } from "@/components/boq/dashboard/BoqDashboard";

export const metadata: Metadata = { title: "BOQ" };

/** The BOQ dashboard (replaces the old one-page BOQ builder) */
export default function Page() {
  return <BoqDashboard />;
}
