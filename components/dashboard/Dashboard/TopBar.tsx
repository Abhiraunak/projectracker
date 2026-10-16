"use client";
import React, { useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/useAuth";

interface TopBarProps {
  onCalendarClick?: () => void;
}

const subscribe = () => () => {};

// false on the server and during hydration, true afterwards on the client
const useIsClient = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

const getGreeting = (date: Date) => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

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

export const TopBar: React.FC<TopBarProps> = () => {
  const isClient = useIsClient();
  const { user } = useAuth();

  if (!isClient) {
    return <div className="border-b px-4 mb-4 mt-2 pb-4 border-stone-200 h-16.25" />;
  }

  const userName = user?.name ?? user?.email?.split("@")[0] ?? "Guest";

  const currentDate = new Date();
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
          <span className="text-xs block text-stone-500">{formattedDate}</span>
        </div>
      </div>
    </div>
  );
};