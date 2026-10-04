import { StatCards } from "./StatCards";

export const Grid = () => {
    return (
        <div className="grid grid-cols-12 gap-3 sm:gap-4 sm:px-4">
            <StatCards />
        </div>
    );
};