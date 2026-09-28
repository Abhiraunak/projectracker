"use client"; // Required for usePathname

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconType } from "react-icons";
import {
  FiDollarSign,
  FiHome,
  FiLink,
  FiPaperclip,
  FiUsers,
} from "react-icons/fi";

export const RouteSelect = () => {
  const pathname = usePathname();

  // Define routes in an array for cleaner rendering and easy updating
  const routes = [
    { title: "Dashboard", href: "/dashboard", Icon: FiHome },
    { title: "Team", href: "/dashboard/team", Icon: FiUsers },
    { title: "Invoices", href: "/dashboard/invoices", Icon: FiPaperclip },
    { title: "Integrations", href: "/dashboard/integrations", Icon: FiLink },
    { title: "Finance", href: "/dashboard/finance", Icon: FiDollarSign },
  ];

  return (
    <div className="space-y-1">
      {routes.map((route) => (
        <Route
          key={route.href}
          Icon={route.Icon}
          title={route.title}
          href={route.href}
          // The route is selected if the current URL matches the href
          selected={pathname === route.href} 
        />
      ))}
    </div>
  );
};

const Route = ({
  selected,
  Icon,
  title,
  href,
}: {
  selected: boolean;
  Icon: IconType;
  title: string;
  href: string;
}) => {
  return (
    <Link
      href={href}
      className={`flex items-center justify-start gap-2 w-full rounded px-2 py-1.5 text-sm transition-[box-shadow,background-color,color] ${
        selected
          ? "bg-white text-stone-950 shadow"
          : "hover:bg-stone-200 bg-transparent text-stone-500 shadow-none"
      }`}
    >
      <Icon className={selected ? "text-violet-500" : ""} />
      <span>{title}</span>
    </Link>
  );
};