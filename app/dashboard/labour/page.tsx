import { Search } from "@/components/dashboard/Sidebar/Search";
import { Heading } from "@/components/utilites/Label";

export default function TeamPage() {
    return (
        <div>
            <div className="border-b mb-2 mt-2 pb-4 border-stone-300 flex justify-between">
                <Heading>Labour  Managament</Heading>
                <Search/>
            </div>


        </div>
    );
}