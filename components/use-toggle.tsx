"use client"

import React from 'react'
import { FaSun, FaMoon } from "react-icons/fa";
import { useTheme } from "next-themes"

export const ModeTogle = () => {
    const { theme, setTheme } = useTheme()
    return(
        <>
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="absolute flex items-center justify-center top-4 right-4 cursor-pointer text-2xl"
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? <FaSun /> : <FaMoon />}
        </button>
        </>
    )
}