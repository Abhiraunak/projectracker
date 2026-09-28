import { SideBar } from "@/components/dashboard/Sidebar/SideBar";



export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="grid gap-4 p-4 grid-cols-[220px_1fr] bg-stone-100 text-stone-950 min-h-screen">
      {/* Fixed Left Sidebar */}
      <SideBar />

      {/* Dynamic Right White Main Area */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-stone-200 min-h-[calc(100vh-2rem)]">
        {children}
      </div>
    </main>
  );
}