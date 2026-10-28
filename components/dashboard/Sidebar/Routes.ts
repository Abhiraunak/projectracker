import type { IconType } from "react-icons";
import { FiBox, FiUsers, FiFileText, FiGrid, FiPenTool, FiShield } from "react-icons/fi";
import type { Permission } from "@/lib/access/types";
import { activeHref } from "./Routematch";
 

export interface AppRoute {
  title: string;
  href: string;
  Icon: IconType;
  /** What a person needs for this item to show and its page to open. "admin" = admins only. */
  needs: Permission | "admin";
}

/**
 * The one list of menu items. The sidebar, the phone top bar and the page guard all read it, so they always agree.
 * There is no Team item: access is company-wide now, and who can do what is set on the Admin page.
 */
export const ROUTES: AppRoute[] = [
  { title: "Dashboard", href: "/dashboard", Icon: FiGrid, needs: "project.view" },
  { title: "BOQ", href: "/dashboard/boq", Icon: FiFileText, needs: "boq.use" },
  { title: "Drawing", href: "/dashboard/drawing", Icon: FiPenTool, needs: "drawings.use" },
  { title: "Labour", href: "/dashboard/labour", Icon: FiUsers, needs: "project.view" },
  { title: "Inventory", href: "/dashboard/inventory", Icon: FiBox, needs: "materials.view" },
  { title: "Admin", href: "/dashboard/admin", Icon: FiShield, needs: "admin" },
];

/** The menu item for the current page, if it is one of them */
export const currentRoute = (pathname: string): AppRoute | undefined => {
  const href = activeHref(pathname, ROUTES.map((r) => r.href));
  return ROUTES.find((r) => r.href === href);
};

/** May this person open this item? */
export const routeAllowed = (route: AppRoute, access: { isAdmin: boolean; can: (p: Permission) => boolean }) =>
  route.needs === "admin" ? access.isAdmin : access.can(route.needs);