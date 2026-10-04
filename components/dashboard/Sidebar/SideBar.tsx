import { Account } from "./Account";
import { SidebarFooter } from "./Plan";

import { RouteSelect } from "./RouteSelect";
// import { Search } from "./Search";

export const SideBar = () => {
    return (
        <section >
            <div className="overflow-y-scroll sticky top-4 h-[calc(100vh-32px-48px)]">
                <Account />
                {/* <Search /> */}
                <RouteSelect />
            </div>

            <div>
                <SidebarFooter/>

            </div>
        </section>
    )
}