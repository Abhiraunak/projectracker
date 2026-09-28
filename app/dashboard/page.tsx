import { DashBoard } from "@/components/dashboard/dashboard";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function Page() {
  return (
    <main className="grid gap-4 p-4 grid-cols-[220px_1fr] bg-stone-100 text-stone-950">
      <Sidebar />
      <DashBoard />
    </main>
  );
}