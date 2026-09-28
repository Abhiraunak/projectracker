import { Account } from "./account";
import { Search } from "./searchbar";


export const Sidebar = () => {
    return(
        <section className="overflow-y-scroll sticky top-4 h-[calc(100vh-32px-48px)]">
            <Account />
            <Search />
           
        </section>
    )
}