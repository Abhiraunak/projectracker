"use client";

import React from "react";
import { FiCheck, FiMinus } from "react-icons/fi";
import { SECTION_ACCESS, type AdminUser, type SectionAccess } from "@/lib/access/types";
import { KIND_LABEL, SHORT_LABEL, displayName, personKind, sectionState, type PersonKind } from "@/lib/access/sections";
import { Pill, type Tone } from "@/components/materials/Pill";

interface Props {
    users: AdminUser[];
    selectedId: string | null;
    /** The person whose tick is being saved: their row waits until it's done */
    savingId: string | null;
    meEmail?: string;
    onSelect: (user: AdminUser) => void;
    onToggle: (user: AdminUser, section: SectionAccess) => void;
}

const KIND_TONE: Record<PersonKind, Tone> = { admin: "dark", waiting: "warn", diaryOnly: "neutral", engineer: "neutral", staff: "neutral" };

/**
 * Everyone at a glance: one row per person, one column per workspace section.
 * A tick switches that whole section on or off for that person, saved at once. Admin rows are always full.
 */
export function AccessGrid({ users, selectedId, savingId, meEmail, onSelect, onToggle }: Props) {
    if (users.length === 0) return <p className="rounded border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">Nobody matches.</p>;

    return (
        // relative: keeps the hidden screen-reader labels inside the scroll box, so the page doesn't widen on phones
        <div className="relative overflow-x-auto rounded border border-stone-300">
            <table className="w-full min-w-216 border-collapse text-sm">
                <caption className="sr-only">Which workspace sections each person can use</caption>
                <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-xs text-stone-500">
                        <th scope="col" className="sticky left-0 z-10 bg-stone-50 px-3 py-2 text-left font-medium">Person</th>
                        <th scope="col" className="px-2 py-2 text-left font-medium">Role</th>
                        {SECTION_ACCESS.map((s) => (
                            <th key={s.key} scope="col" title={s.help} className="px-1 py-2 text-center font-medium">
                                {SHORT_LABEL[s.key]}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => {
                        const kind = personKind(u);
                        const selected = u.id === selectedId;
                        const have = new Set(u.permissions);
                        const isYou = !!meEmail && meEmail === u.email;
                        return (
                            <tr key={u.id} className={`border-b border-stone-100 last:border-0 ${selected ? "bg-amber-50/60" : "hover:bg-stone-50"}`}>
                                <th scope="row" className={`sticky left-0 z-10 max-w-52 px-3 py-2 text-left font-normal ${selected ? "bg-amber-50" : "bg-white"}`}>
                                    <button
                                        type="button"
                                        onClick={() => onSelect(u)}
                                        aria-current={selected || undefined}
                                        className="block w-full min-w-0 rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                                    >
                                        <span className={`block truncate ${selected ? "font-semibold" : "font-medium"}`}>
                                            {displayName(u)}
                                            {isYou && <span className="ml-1 text-xs font-normal text-stone-400">you</span>}
                                        </span>
                                        {u.name?.trim() && <span className="block truncate text-xs text-stone-500">{u.email}</span>}
                                    </button>
                                </th>
                                <td className="px-2 py-2">
                                    <Pill tone={KIND_TONE[kind]}>{KIND_LABEL[kind]}</Pill>
                                </td>
                                {SECTION_ACCESS.map((s) => {
                                    if (u.isAdmin)
                                        return (
                                            <td key={s.key} className="px-1 py-2 text-center text-stone-300">
                                                <span aria-label="Admin: always on">–</span>
                                            </td>
                                        );
                                    const st = sectionState(have, s);
                                    const busy = savingId === u.id;
                                    return (
                                        <td key={s.key} className="px-1 py-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => onToggle(u, s)}
                                                disabled={busy}
                                                aria-pressed={st === "on" ? true : st === "part" ? "mixed" : false}
                                                aria-label={`${s.label} for ${displayName(u)}`}
                                                title={st === "part" ? "Partly: an older, finer setting. Tap to give the whole section." : s.help}
                                                className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:cursor-wait disabled:opacity-50 sm:h-7 sm:w-7 ${st === "on"
                                                        ? "border-green-300 bg-green-100 text-green-700 hover:bg-green-200"
                                                        : st === "part"
                                                            ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                                            : "border-stone-300 text-transparent hover:border-stone-500 hover:text-stone-300"
                                                    }`}
                                            >
                                                {st === "part" ? <FiMinus aria-hidden /> : <FiCheck aria-hidden />}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}