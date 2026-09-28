"use client";

import React, { useState, useEffect } from "react";
import { FiSun, FiMoon, FiLogOut } from "react-icons/fi";
import { useRouter } from "next/navigation";
// If using NextAuth, uncomment the import below:
// import { signOut } from "next-auth/react";

export const SidebarFooter = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  // Initialize theme from document or system preferences
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  // Toggle Theme Switcher Logic
  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Functional Sign-Out Action
  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);

      router.push("/login");
    } catch (error) {
      console.error("Failed to sign out:", error);
      setIsSigningOut(false);
    }
  };

  return (
    <div className="mt-auto flex items-center justify-between border-t border-stone-300 dark:border-stone-800 p-2 text-xs transition-colors">
      {/* Theme Toggle Button */}
      <button
        type="button"
        onClick={toggleTheme}
        className="flex items-center gap-2 px-2 py-1.5 rounded text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors font-medium outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
      >
        {theme === "light" ? (
          <>
            <FiSun className="size-4 text-amber-500" />
            <span>Light</span>
          </>
        ) : (
          <>
            <FiMoon className="size-4 text-indigo-400" />
            <span>Dark</span>
          </>
        )}
      </button>

      <button
        type="button"
        disabled={isSigningOut}
        onClick={handleSignOut}
        className="flex items-center gap-1.5 px-2.5 py-1.5 font-medium text-stone-700 dark:text-stone-200 bg-stone-200 dark:bg-stone-800 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 transition-colors rounded disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <FiLogOut className="size-3.5" />
        <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
      </button>
    </div>
  );
};