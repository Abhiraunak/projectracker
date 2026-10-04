"use client"; 
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconType } from "react-icons";
import { motion } from "framer-motion"; 
import {
  FiHome,
  // FiUsers,
  // FiFileText,
  // FiImage,
  FiUserCheck,
  // FiBox,
} from "react-icons/fi";

export const RouteSelect = () => {
  const pathname = usePathname();

  // Define routes in an array for cleaner rendering and easy updating
 const routes = [
    { title: "Dashboard", href: "/dashboard", Icon: FiHome },
    // { title: "Team", href: "/dashboard/team", Icon: FiUsers },
    // { title: "BOQ", href: "/dashboard/boq", Icon: FiFileText },
    // { title: "Drawing", href: "/dashboard/drawing", Icon: FiImage },
    { title: "Project", href: "/dashboard/labour", Icon: FiUserCheck },
    // { title: "Inventory", href: "/dashboard/inventory", Icon: FiBox },
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
      className={`relative flex items-center justify-start gap-2 w-full rounded px-2 py-1.5 text-sm transition-colors ${
        selected
          ? "text-stone-950"
          : "hover:bg-stone-200 bg-transparent text-stone-500"
      }`}
    >
      {selected && (
        <motion.div
          layoutId="active-bg" 
          className="absolute inset-0 bg-white rounded shadow"
          initial={false}
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 30,
          }}
        />
      )}
      
      {/* Added relative and z-10 so the content sits above the animated background */}
      <Icon className={`relative z-10 transition-colors ${selected ? "text-violet-500" : ""}`} />
      <span className="relative z-10">{title}</span>
    </Link>
  );
};