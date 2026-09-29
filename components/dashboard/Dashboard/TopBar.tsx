"use client"
import React, { useEffect, useState } from "react";
import { FiCalendar } from "react-icons/fi";

interface TopBarProps {
  userName?: string;
  onCalendarClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  userName = "Guest",
  onCalendarClick,
}) => {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  if (!currentDate) {
    // Return placeholder/skeleton during hydration to prevent server/client mismatches in Next.js
    return <div className="border-b px-4 mb-4 mt-2 pb-4 border-stone-200 h-16.25" />;
  }

  // Dynamic greeting based on current hour
  const getGreeting = (date: Date) => {
    const hour = date.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Helper function to append ordinal suffixes (1st, 2nd, 3rd, 4th...)
  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  // Format date parts
  const weekday = currentDate.toLocaleDateString("en-US", { weekday: "long" });
  const month = currentDate.toLocaleDateString("en-US", { month: "short" });
  const dayNum = currentDate.getDate();
  const year = currentDate.getFullYear();
  const formattedDate = `${weekday}, ${month} ${dayNum}${getOrdinalSuffix(dayNum)} ${year}`;

  return (
    <div className="border-b mb-4 mt-2 pb-4 border-stone-300">
      <div className="flex items-center justify-between p-0.5">
        <div>
          <span className="text-sm font-bold block">
            {getGreeting(currentDate)}, {userName}!
          </span>
          <span className="text-xs block text-stone-500">
            {formattedDate}
          </span>
        </div>

        <button
          onClick={onCalendarClick}
          className="flex text-sm items-center gap-2 bg-stone-100 transition-colors hover:bg-violet-100 hover:text-violet-700 px-3 py-1.5 rounded"
        >
          <FiCalendar />
          <span>Prev 6 Months</span>
        </button>
      </div>
    </div>
  );
};