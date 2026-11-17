"use client";

import React, { useDeferredValue, useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { Heading } from "@/components/utilites/Label";
import { useAuth } from "@/hooks/useAuth";
import { useAdminUsers, useUpdateUserAccess } from "@/hooks/useAdminUsers";
import { QueryError } from "@/components/materials/QueryError";
import { describeError } from "@/lib/api";
import type { AdminUser, Permission, SectionAccess } from "@/lib/access/types";
import { SHORT_LABEL, displayName, personKind, sectionState, toggleSection, type PersonKind } from "@/lib/access/sections";
import { UserAccessCard } from "./UserAccessCard";
import { AccessGrid } from "./AccessGrid";
import { RecentAccessChanges } from "./RecentAccessChanges";

type Filter = "all" | "waiting" | "admin" | "engineer";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Everyone" },
  { key: "waiting", label: "Waiting" },
  { key: "admin", label: "Admins" },
  { key: "engineer", label: "Site engineers" },
];
const KIND_ORDER: Record<PersonKind, number> = { waiting: 0, admin: 1, engineer: 2, diaryOnly: 3, staff: 4 };
const isEngineer = (u: AdminUser) => !u.isAdmin && u.permissions.includes("diary.write");
const norm = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

interface Notice {
  text: string;
  error?: boolean;
  /** Put back what the person had before a grid tick */
  undo?: { user: AdminUser; permissions: Permission[] };
}

/**
 * The admin page: counts at the top, everyone in one grid of section ticks, and the picked person's full card.
 * Access is company-wide: a tick opens that section in every project. Changes apply straight away.
 */
export function AdminPage() {
  const users = useAdminUsers();
  const update = useUpdateUserAccess();
  const { user: me } = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const deferredQuery = useDeferredValue(query);

  const all = users.data ?? [];
  const adminCount = all.filter((u) => u.isAdmin).length;
  const waitingCount = all.filter((u) => personKind(u) === "waiting").length;
  const engineerCount = all.filter(isEngineer).length;

  const q = norm(deferredQuery);
  const shown = all
    .filter((u) => filter === "all" || (filter === "waiting" ? personKind(u) === "waiting" : filter === "admin" ? u.isAdmin : isEngineer(u)))
    .filter((u) => !q || norm(`${u.name ?? ""} ${u.email}`).includes(q))
    .sort((a, b) => KIND_ORDER[personKind(a)] - KIND_ORDER[personKind(b)] || displayName(a).localeCompare(displayName(b)));

  // The picked person, or else the first one waiting for access
  const picked = all.find((u) => u.id === pickedId) ?? all.find((u) => personKind(u) === "waiting") ?? null;

  const pick = (u: AdminUser) => {
    setPickedId(u.id);
    // On a phone the card is below the grid: bring it into view
    queueMicrotask(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const save = async (u: AdminUser, permissions: Permission[], text: string, undo?: Notice["undo"]) => {
    setSavingId(u.id);
    setNotice(null);
    try {
      await update.mutateAsync({ userId: u.id, isAdmin: u.isAdmin, permissions });
      setNotice({ text, undo });
    } catch (error) {
      setNotice({ text: `Couldn't save: ${describeError(error)}`, error: true });
    } finally {
      setSavingId(null);
    }
  };

  const toggle = (u: AdminUser, section: SectionAccess) => {
    const before = new Set(u.permissions);
    const turningOn = sectionState(before, section) !== "on";
    const next = [...toggleSection(before, section)];
    const label = SHORT_LABEL[section.key];
    void save(u, next, turningOn ? `Gave ${label} to ${displayName(u)}.` : `Took away ${label} from ${displayName(u)}.`, {
      user: { ...u, permissions: next },
      permissions: u.permissions,
    });
  };

  const undo = (n: Notice) => {
    if (!n.undo) return;
    void save(n.undo.user, n.undo.permissions, `Put back ${displayName(n.undo.user)}'s access.`);
  };

  const stats: { label: string; value: number; warn?: boolean; filter?: Filter }[] = [
    { label: "People", value: all.length, filter: "all" },
    { label: "Admins", value: adminCount, filter: "admin" },
    { label: "Waiting for access", value: waitingCount, warn: waitingCount > 0, filter: "waiting" },
    { label: "Site engineers", value: engineerCount, filter: "engineer" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <Heading>Admin</Heading>
        <p className="mt-1 text-sm text-stone-500">
          Tick the sections each person can use. A tick applies to every project and is saved straight away. Admins can do
          everything.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => s.filter && setFilter(s.filter)}
            aria-pressed={filter === s.filter}
            className={`rounded border p-3 text-left transition-colors hover:border-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${s.warn ? "border-amber-200 bg-amber-50" : "border-stone-200 bg-stone-50"
              }`}
          >
            <span className={`block text-xs ${s.warn ? "text-amber-800" : "text-stone-500"}`}>{s.label}</span>
            <span className={`block text-2xl font-semibold tabular-nums ${s.warn ? "text-amber-900" : ""}`}>{users.data ? s.value : "–"}</span>
          </button>
        ))}
      </div>

      {notice && (
        <p
          role="status"
          className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded border p-3 text-sm ${notice.error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"
            }`}
        >
          <span>{notice.text}</span>
          {notice.undo && (
            <button type="button" onClick={() => undo(notice)} disabled={!!savingId} className="font-semibold underline underline-offset-2 disabled:opacity-50">
              Undo
            </button>
          )}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search people</span>
          <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("");
            }}
            placeholder="Search name or email"
            className="h-10 w-full rounded border border-stone-300 pl-9 pr-3 text-sm focus:border-stone-900 focus:outline-none"
          />
        </label>
        <div role="group" aria-label="Show" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${filter === f.key ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 text-stone-700 hover:bg-stone-50"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {users.isPending && <div aria-busy="true" className="h-64 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />}
      {users.isError && <QueryError error={users.error} onRetry={() => users.refetch()} />}
      {users.data && (
        <div className="space-y-2">
          <AccessGrid users={shown} selectedId={picked?.id ?? null} savingId={savingId} meEmail={me?.email} onSelect={pick} onToggle={toggle} />
          <p className="text-xs text-stone-500">
            Green = on. Amber = partly (an older, finer setting; tap to give the whole section). Tap a name to make them an admin or use a
            quick start.
          </p>
        </div>
      )}

      <div ref={panelRef} className="scroll-mt-20">
        {picked ? (
          <UserAccessCard
            // A new key when the saved access changes, so the card starts from what the server now has
            key={`${picked.id}:${picked.isAdmin}:${picked.permissions.join(",")}`}
            user={picked}
            isYou={!!me?.email && me.email === picked.email}
            isLastAdmin={adminCount <= 1}
            onSaved={(email) => setNotice({ text: `Saved access for ${email}. It applies straight away.` })}
          />
        ) : (
          users.data && (
            <p className="rounded border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">Tap a name in the grid to see their full access.</p>
          )
        )}
      </div>

      {users.data && <RecentAccessChanges users={all} />}
    </div>
  );
}