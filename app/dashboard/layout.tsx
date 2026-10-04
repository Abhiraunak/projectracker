"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FiMenu, FiX } from "react-icons/fi";
import { SideBar } from "@/components/dashboard/Sidebar/SideBar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Remember which page the drawer was opened on. If the path changes, it's no longer "open".
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  const openMenu = () => setOpenedOn(pathname);
  const closeMenu = () => setOpenedOn(null);

  // Escape closes it, and the page behind doesn't scroll while it's open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenedOn(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <main className="min-h-dvh bg-stone-100 text-stone-950 lg:grid lg:grid-cols-[220px_1fr] lg:gap-4 lg:p-4">
      {/* Mobile top bar (hidden on lg+) */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-2 lg:hidden">
        <button
          type="button"
          onClick={openMenu}
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="dashboard-sidebar"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded text-xl hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
        >
          <FiMenu aria-hidden />
        </button>
        <span className="text-sm font-semibold">Dashboard</span>
      </header>

      {/* Backdrop (mobile only) */}
      {open && (
        <div
          aria-hidden
          onClick={closeMenu}
          className="fixed inset-0 z-40 bg-stone-950/50 lg:hidden"
        />
      )}

      {/* Sidebar: off-canvas drawer on mobile, normal grid column on lg+ */}
      <aside
        id="dashboard-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-65 max-w-[85vw] overflow-y-auto bg-stone-100 p-4 transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full invisible"}
          lg:visible lg:static lg:z-auto lg:w-auto lg:max-w-none lg:translate-x-0 lg:overflow-visible lg:bg-transparent lg:p-0 lg:transition-none`}
      >
        <button
          type="button"
          onClick={closeMenu}
          aria-label="Close menu"
          className="mb-2 ml-auto flex h-11 w-11 items-center justify-center rounded text-xl hover:bg-stone-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 lg:hidden"
        >
          <FiX aria-hidden />
        </button>
        <SideBar />
      </aside>

      {/* Main content: edge-to-edge on mobile, card on lg+ */}
      <div className="min-w-0 bg-white p-4 sm:p-6 lg:min-h-[calc(100dvh-2rem)] lg:rounded-lg lg:border lg:border-stone-200 lg:shadow-sm">
        {children}
      </div>
    </main>
  );
}