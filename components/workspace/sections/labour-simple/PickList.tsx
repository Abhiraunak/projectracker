"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import { mono } from "./shared";

/**
 * A dropdown in the app's own look (the browser's native list can't be styled): a button showing the choice, and a
 * rounded list under it. Works with the mouse and the keyboard (↑ ↓ to move, Enter to pick, Esc to close).
 */
export function PickList({
    value,
    options,
    onChange,
    label,
    placeholder = "Choose…",
    className = "",
}: {
    value: string;
    options: string[];
    onChange: (v: string) => void;
    label: string;
    placeholder?: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const box = useRef<HTMLDivElement>(null);
    const listId = useId();

    // close when clicking anywhere else
    useEffect(() => {
        if (!open) return;
        const away = (e: MouseEvent) => {
            if (!box.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", away);
        return () => document.removeEventListener("mousedown", away);
    }, [open]);

    const show = () => {
        setActive(Math.max(0, options.findIndex((o) => o.toLowerCase() === value.toLowerCase())));
        setOpen(true);
    };
    const pick = (v: string) => {
        onChange(v);
        setOpen(false);
    };
    const onKey = (e: React.KeyboardEvent) => {
        if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            show();
            return;
        }
        if (!open) return;
        if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(options.length - 1, a + 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
        } else if (e.key === "Enter" && options[active]) {
            e.preventDefault();
            pick(options[active]!);
        }
    };

    return (
        <div ref={box} className={`relative ${className}`}>
            <button
                type="button"
                aria-label={label}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => {
                    if (open) setOpen(false);
                    else show();
                }}
                onKeyDown={onKey}
                className={`flex h-11 w-full items-center gap-2 rounded-lg border bg-white px-3 text-left text-base text-[#111111] ${mono.motion} ${mono.ring} ${open ? "border-[#111111]" : "border-[#DADAD7] hover:border-[#8C8C8C]"
                    }`}
            >
                <span className={`min-w-0 flex-1 truncate ${value ? "" : "text-[#8C8C8C]"}`}>{value || placeholder}</span>
                <FiChevronDown aria-hidden className={`shrink-0 text-[#666666] transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <ul
                    id={listId}
                    role="listbox"
                    aria-label={label}
                    className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-[#E8E8E6] bg-white p-1 shadow-[0_8px_24px_rgba(17,17,17,0.12)]"
                >
                    {options.length === 0 && <li className="px-3 py-2.5 text-sm text-[#8C8C8C]">Nothing yet</li>}
                    {options.map((o, i) => {
                        const chosen = o.toLowerCase() === value.toLowerCase();
                        return (
                            <li
                                key={o}
                                role="option"
                                aria-selected={chosen}
                                onMouseEnter={() => setActive(i)}
                                onMouseDown={(e) => e.preventDefault()} // keep focus on the button
                                onClick={() => pick(o)}
                                className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-[15px] ${i === active ? "bg-[#F1F1EF]" : ""} ${chosen ? "font-semibold text-[#111111]" : "text-[#333333]"}`}
                            >
                                <span className="min-w-0 flex-1 truncate">{o}</span>
                                {chosen && <FiCheck aria-hidden className="shrink-0 text-[#111111]" />}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}