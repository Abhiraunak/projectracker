"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiChevronDown, FiLogOut } from "react-icons/fi";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useProjectAccess";
import { useSignOut } from "@/hooks/useSignOut";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { MENU_ROUTES, currentRoute, routeAllowed } from "./Sidebar/Routes";

const focusRing = "focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]";

/** "Anita Sharma" -> "AS", "rahul" -> "R" */
const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("") || "?";

/**
 * The one bar across the top of the app, in place of the sidebar: projecTracker on the left (back to the
 * dashboard), then the notification bell and the person's tile. The tile opens a menu with the other pages this
 * person may open (BOQ, Clients, Admin…) and Log out.
 * Exactly 56px tall (h-14): sticky parts of pages sit right under it with top-14.
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[#E8E8E6] bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <Link href="/dashboard" className={`-ml-1 flex items-center gap-2 rounded-lg px-1 py-1 ${focusRing}`}>
        <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#111111]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20V10l8-6 8 6v10" />
            <path d="M9 20v-6h6v6" />
          </svg>
        </span>
        <span className="text-[17px] font-semibold tracking-[-0.01em] text-[#111111]">projecTracker</span>
      </Link>
      <span className="flex-1" />
      <NotificationBell align="right" />
      <UserMenu />
    </header>
  );
}

/** The person's tile: initials and name; tap it for the pages menu and Log out */
function UserMenu() {
  const { user } = useAuth();
  const access = useAccess();
  const pathname = usePathname();
  const { signOut, isSigningOut, error } = useSignOut();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const name = user?.name ?? user?.email?.split("@")[0] ?? "Account";
  const email = user?.email ?? "";
  // The pages that used to be in the sidebar (only those this person may open). Dashboard is the logo.
  const pages = MENU_ROUTES.filter((r) => r.href !== "/dashboard" && r.href !== "/dashboard/projects" && routeAllowed(r, access));
  const active = currentRoute(pathname)?.href;

  // Close on a click outside, or Escape (focus goes back to the tile)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const row = `flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-sm transition-colors duration-[180ms] motion-reduce:transition-none ${focusRing}`;

  return (
    <div ref={wrap} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${name}`}
        className={`flex h-11 items-center gap-2.5 rounded-xl border border-[#E8E8E6] bg-white pl-1.5 pr-2.5 text-sm transition-colors duration-180 hover:bg-[#F1F1EF] motion-reduce:transition-none ${focusRing}`}
      >
        <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDEDEB] text-xs font-semibold text-[#333333]">
          {initialsOf(name)}
        </span>
        <span className="hidden max-w-40 truncate font-medium text-[#111111] sm:block">{name}</span>
        <FiChevronDown aria-hidden className={`text-[#666666] transition-transform duration-180 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div id={menuId} className="absolute right-0 top-13 z-50 w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E8E8E6] bg-white p-2 shadow-[0_2px_4px_rgba(17,17,17,0.04),0_12px_32px_-12px_rgba(17,17,17,0.18)]">
          <div className="mb-1.5 border-b border-[#EFEFED] px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-[#111111]">{name}</p>
            {email && <p className="truncate text-[13px] text-[#666666]">{email}</p>}
          </div>
          {pages.length > 0 && (
            <nav aria-label="Pages" className="border-b border-[#EFEFED] pb-1.5">
              {pages.map(({ href, title, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={href === active ? "page" : undefined}
                  className={`${row} ${href === active ? "bg-[#F1F1EF] font-medium text-[#111111]" : "text-[#111111] hover:bg-[#F7F7F5]"}`}
                >
                  <Icon aria-hidden className="shrink-0 text-[#666666]" /> {title}
                </Link>
              ))}
            </nav>
          )}
          <div className="pt-1.5">
            <button type="button" onClick={() => void signOut()} disabled={isSigningOut} className={`${row} text-[#B3261E] hover:bg-[#FCEDEC] disabled:opacity-50`}>
              <FiLogOut aria-hidden className="shrink-0" /> {isSigningOut ? "Logging out…" : "Log out"}
            </button>
            {error && (
              <p role="alert" className="px-3 pb-1.5 text-xs font-medium text-red-700">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}