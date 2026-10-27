"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FiMenu, FiX } from "react-icons/fi";
import { SideBar } from "@/components/dashboard/Sidebar/SideBar";

/**
 * Hides the scrollbar itself. Scrolling still works the normal ways: mouse wheel, trackpad, touch, and the
 * keyboard (arrow keys, Page Down, Space) once you have clicked or tabbed into the content.
 * To show a thin bar instead, swap this for "[scrollbar-width:thin] [scrollbar-color:theme(colors.stone.300)_transparent]".
 */
const HIDE_SCROLLBAR = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/** "/inventory" -> "Inventory", "/labour-cost/abc" -> "Labour cost". Shown in the phone top bar. */
function sectionTitle(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0];
  return first ? first.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()) : "Dashboard";
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // The drawer remembers which page it was opened on, so going to another page closes it with no extra effect
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  const openMenu = () => setOpenedOn(pathname);
  const closeMenu = useCallback(() => {
    setOpenedOn(null);
    menuButtonRef.current?.focus(); // keyboard users land back where they were
  }, []);

  // While the phone drawer is open: focus is inside it, Escape closes it, and the page behind can't scroll
  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, closeMenu]);

  return (
    <div className="min-h-dvh bg-[#f4f1ec] text-stone-950 lg:relative lg:grid lg:h-dvh lg:grid-cols-[220px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-4 lg:overflow-hidden lg:p-4">
      {/* Phone and tablet top bar (hidden on large screens) */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-2 lg:hidden">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={openMenu}
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="dashboard-sidebar"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded text-xl hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
        >
          <FiMenu aria-hidden />
        </button>
        <span className="truncate text-sm font-semibold">{sectionTitle(pathname)}</span>
      </header>

      {/* Dimmed backdrop behind the phone drawer; tapping it closes the drawer */}
      {open && <div aria-hidden onClick={closeMenu} className="fixed inset-0 z-40 bg-stone-950/50 lg:hidden" />}

      {/* Sidebar: a slide-in drawer on phones, a fixed column on large screens. It scrolls by itself if the menu is long. */}
      <aside
        id="dashboard-sidebar"
        aria-label="Main menu"
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] overflow-y-auto bg-stone-100 p-4 transition-[transform,visibility] duration-200 motion-reduce:transition-none ${HIDE_SCROLLBAR}
          ${open ? "visible translate-x-0" : "invisible -translate-x-full"}
          lg:visible lg:static lg:z-auto lg:h-full lg:min-h-0 lg:w-auto lg:max-w-none lg:translate-x-0 lg:bg-transparent lg:p-0 lg:transition-none`}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={closeMenu}
          aria-label="Close menu"
          className="mb-2 ml-auto flex h-11 w-11 items-center justify-center rounded text-xl hover:bg-stone-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 lg:hidden"
        >
          <FiX aria-hidden />
        </button>
        <SideBar />
      </aside>

      {/*
        The page. On phones the whole page scrolls; on large screens only this card scrolls, so the sidebar and
        the frame stay put. This is the one and only <main>: pages inside must not add their own.
        `relative` keeps absolutely placed pieces of a page (chart tooltips, Gantt bars) inside this card. Without
        it they are placed against the whole page, make it taller than the screen, and the whole app scrolls.
        `overscroll-contain` stops a scroll that reaches the end of the card from carrying on into the page.
      */}
      <main
        id="main-content"
        tabIndex={-1}
        className={`relative min-w-0 bg-white px-4 py-5 focus:outline-none sm:px-6 sm:py-6 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:rounded-lg lg:border lg:border-stone-200 lg:px-8 ${HIDE_SCROLLBAR}`}
      >
        {children}
      </main>
    </div>
  );
}