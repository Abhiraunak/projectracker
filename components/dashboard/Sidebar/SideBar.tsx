
import { HIDE_SCROLLBAR } from "@/components/utilites/Label";
import { Account } from "./Account";
import { SidebarFooter } from "./Plan";
import { RouteSelect } from "./RouteSelect";

/**
 * Fills the height it is given by the layout: the account and menu scroll if they are too long,
 * and Sign out stays pinned to the bottom. No fixed heights, so it fits the desktop column and the phone drawer alike.
 */
export const SideBar = () => {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className={`min-h-0 flex-1 overflow-y-auto pb-3 ${HIDE_SCROLLBAR}`}>
        <Account />
        <RouteSelect />
      </div>
      <SidebarFooter />
    </div>
  );
};