import { DashBoard } from "@/components/dashboard/Dashboard/DashBoard";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

/**
 * /dashboard: the simple dashboard first. "Switch to full dashboard" brings back the previous one:
 * the admin overview for admins, and <DashBoard /> for everyone else.
 */
export default function Page() {
  return (
    <DashboardHome>
      <DashBoard />
    </DashboardHome>
  );
}