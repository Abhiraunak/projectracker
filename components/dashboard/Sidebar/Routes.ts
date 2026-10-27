import type { IconType } from "react-icons";
import { FiBox, FiBriefcase, FiFileText, FiGrid, FiPenTool, FiUsers } from "react-icons/fi";
import { activeHref } from "./Routematch";


export interface AppRoute {
  title: string;
  href: string;
  Icon: IconType;
}

/** The one list of menu items. The sidebar and the phone top bar both read it, so they always agree. */
export const ROUTES: AppRoute[] = [
  { title: "Dashboard", href: "/dashboard", Icon: FiGrid },
  { title: "Team", href: "/dashboard/team", Icon: FiUsers },
  { title: "BOQ", href: "/dashboard/boq", Icon: FiFileText },
  { title: "Drawing", href: "/dashboard/drawing", Icon: FiPenTool },
  { title: "Labour", href: "/dashboard/labour", Icon: FiBriefcase },
  { title: "Inventory", href: "/dashboard/inventory", Icon: FiBox },
];

/** The menu item for the current page, if it is one of them */
export const currentRoute = (pathname: string): AppRoute | undefined => {
  const href = activeHref(pathname, ROUTES.map((r) => r.href));
  return ROUTES.find((r) => r.href === href);
};