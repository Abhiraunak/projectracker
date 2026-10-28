"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useAccess } from "@/hooks/useProjectAccess";
import { useInventoryBadge } from "@/hooks/useInventory";
import { AppRoute, ROUTES, currentRoute, routeAllowed } from "./Routes";

/** The main menu: only the pages this person may open */
export const RouteSelect = () => {
  const pathname = usePathname();
  const access = useAccess();
  const visible = ROUTES.filter((route) => routeAllowed(route, access));
  // Open stock alerts, plus requests waiting for my approval: shown on the Inventory item
  const inventoryCount = useInventoryBadge(access.can("materials.view"), access.can("requests.approve"));
  const active = currentRoute(pathname)?.href;

  return (
    <nav aria-label="Main">
      <ul className="space-y-0.5">
        {visible.map((route) => (
          <li key={route.href}>
            <RouteLink route={route} selected={route.href === active} badge={route.href === "/dashboard/inventory" ? inventoryCount : 0} />
          </li>
        ))}
      </ul>
    </nav>
  );
};

function RouteLink({ route: { title, href, Icon }, selected, badge = 0 }: { route: AppRoute; selected: boolean; badge?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`relative flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 lg:py-1.5 ${
        selected ? "font-medium text-stone-950" : "text-stone-500 hover:bg-stone-200 hover:text-stone-900"
      }`}
    >
      {selected && (
        // The white card slides from item to item (instantly, if the person prefers less motion)
        <motion.span
          layoutId="sidebar-active"
          aria-hidden
          className="absolute inset-0 rounded border border-stone-300 bg-white"
          initial={false}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      <Icon aria-hidden className={`relative z-10 shrink-0 ${selected ? "text-amber-600" : ""}`} />
      <span className="relative z-10 flex-1 truncate">{title}</span>
      {badge > 0 && (
        <span className="relative z-10 rounded-full bg-red-600 px-1.5 text-[11px] font-semibold leading-5 text-white tabular-nums" aria-label={`${badge} to look at`}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
