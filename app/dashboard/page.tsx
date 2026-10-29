import { DashBoard } from "@/components/dashboard/Dashboard/DashBoard";
import { AdminOr } from "@/components/dashboard/admin/AdminOr";

export default function Page() {
  return (
    <AdminOr>
      <DashBoard />
    </AdminOr >
  );
}