import type { IconType } from "react-icons";
import { FiBox, FiBriefcase, FiFileText, FiGrid, FiLayers, FiPenTool, FiShield, FiUserCheck } from "react-icons/fi";
import type { Permission } from "@/lib/access/types";
import { isFeatureOn, type Feature } from "@/lib/features";
import { activeHref } from "./Routematch"; // must match the file's name exactly, capitals included

// FiClock, FiTruck,  FiUsers
export interface AppRoute {
  title: string;
  href: string;
  Icon: IconType;
  /** What a person needs for this item to show and its page to open: one permission, any of several, or "admin" */
  needs: Permission | Permission[] | "admin";
  /** Shown only while this feature is switched on (NEXT_PUBLIC_FEATURES) */
  feature?: Feature;
  /**
   * false: not in the menu, but still known to the page guard, so its page keeps its permission check and old
   * links to it still work. Used for pages whose work now happens inside each project.
   */
  inMenu?: boolean;
}

/**
 * The one list of pages. The sidebar, the phone top bar and the page guard all read it, so they always agree.
 * There is no Team item: access is company-wide now, and who can do what is set on the Admin page.
 *
 * For now the menu is Dashboard, Projects, BOQ, Clients and Admin: drawings, labour and materials are worked on
 * inside each project (its Drawings, Labour and Materials tabs). Set inMenu back to true to show one again.
 */
const ALL_ROUTES: AppRoute[] = [
  { title: "Dashboard", href: "/dashboard", Icon: FiGrid, needs: "project.view" },
  { title: "Projects", href: "/dashboard/projects", Icon: FiLayers, needs: "project.view", feature: "projectHub" },
  { title: "BOQ", href: "/dashboard/boq", Icon: FiFileText, needs: "boq.use" },
  { title: "Drawing", href: "/dashboard/drawing", Icon: FiPenTool, needs: "drawings.use", inMenu: false }, // in each project: Drawings
  { title: "Labour", href: "/dashboard/labour", Icon: FiBriefcase, needs: "project.view", inMenu: false }, // in each project: Labour
  { title: "Inventory", href: "/dashboard/inventory", Icon: FiBox, needs: "materials.view", inMenu: false }, // in each project: Materials
  // { title: "Deliveries", href: "/dashboard/deliveries", Icon: FiTruck, needs: ["stock.receive", "deliveries.approve"] },
  // { title: "Attendance", href: "/dashboard/attendance", Icon: FiClock, needs: "attendance.punch" },
  // { title: "Team attendance", href: "/dashboard/attendance/team", Icon: FiUsers, needs: "attendance.team" },
  { title: "Clients", href: "/dashboard/clients", Icon: FiUserCheck, needs: "admin" },
  { title: "Admin", href: "/dashboard/admin", Icon: FiShield, needs: "admin" },
];

/** Worked out once when the app loads: switched-off features never reach the menu or the page guard */
export const ROUTES: AppRoute[] = ALL_ROUTES.filter((r) => !r.feature || isFeatureOn(r.feature));

/** The items the menus show (the sidebar and the phone top bar); the page guard uses ROUTES */
export const MENU_ROUTES: AppRoute[] = ROUTES.filter((r) => r.inMenu !== false);

/** The menu item for the current page, if it is one of them */
export const currentRoute = (pathname: string): AppRoute | undefined => {
  const href = activeHref(pathname, ROUTES.map((r) => r.href));
  return ROUTES.find((r) => r.href === href);
};

/** May this person open this item? */
export const routeAllowed = (route: AppRoute, access: { isAdmin: boolean; can: (p: Permission) => boolean }) =>
  route.needs === "admin" ? access.isAdmin : Array.isArray(route.needs) ? route.needs.some((p) => access.can(p)) : access.can(route.needs);