"use client";

import React, { useState } from "react";
import { describeError } from "@/lib/api";
import { PRESETS, type AdminUser, type Permission } from "@/lib/access/types";
import { useUpdateUserAccess } from "@/hooks/useAdminUsers";
import { Pill } from "@/components/materials/Pill";
import { PermissionChecklist } from "./PermissionChecklist";
import { buttonPrimary, buttonSecondary } from "../utilites/Label";

interface Props {
  user: AdminUser;
  isYou: boolean;
  /** The only admin left can't be made a normal user */
  isLastAdmin: boolean;
  onSaved: (email: string) => void;
}

const sameSet = (a: Set<Permission>, b: Permission[]) => a.size === b.length && b.every((p) => a.has(p));
const joined = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** One person: make them an admin, or tick exactly what they may do. Nothing changes until Save. */
export function UserAccessCard({ user, isYou, isLastAdmin, onSaved }: Props) {
  const update = useUpdateUserAccess();
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [selected, setSelected] = useState<Set<Permission>>(() => new Set(user.permissions));

  const waiting = !user.isAdmin && user.permissions.length === 0;
  const adminLocked = isLastAdmin && user.isAdmin;
  const dirty = isAdmin !== user.isAdmin || !sameSet(selected, user.permissions);

  const toggle = (permission: Permission) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });

  const reset = () => {
    setIsAdmin(user.isAdmin);
    setSelected(new Set(user.permissions));
    update.reset();
  };

  const save = async () => {
    try {
      await update.mutateAsync({ userId: user.id, isAdmin, permissions: [...selected] });
      onSaved(user.email);
    } catch {
      /* shown below from update.error */
    }
  };

  return (
    <article className="rounded border border-stone-300">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-200 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.email}</p>
          <p className="text-xs text-stone-500">Joined {joined(user.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {isYou && <Pill tone="neutral">You</Pill>}
          {user.isAdmin && <Pill tone="dark">Admin</Pill>}
          {waiting && <Pill tone="warn">Waiting for access</Pill>}
        </div>
      </header>

      <div className="space-y-5 p-4">
        <label className={`flex items-start gap-3 rounded border border-stone-300 p-3 ${adminLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
          <input
            type="checkbox"
            checked={isAdmin}
            disabled={adminLocked}
            onChange={(event) => setIsAdmin(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-stone-900"
          />
          <span>
            <span className="block text-sm font-semibold">Admin</span>
            <span className="block text-xs text-stone-500">
              Can do everything on every project, including this page.
              {adminLocked && " There must always be at least one admin, so make someone else an admin first."}
            </span>
          </span>
        </label>

        {!isAdmin && (
          <>
            <div>
              <p className="mb-2 text-sm text-stone-500">Quick start (you can adjust the boxes after)</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSelected(new Set(preset.permissions))}
                    className="rounded border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <PermissionChecklist selected={selected} onToggle={toggle} />
            {selected.size === 0 && (
              <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">With nothing ticked, this person only sees the welcome page.</p>
            )}
          </>
        )}

        {update.isError && (
          <p role="alert" className="text-sm text-red-700">
            {describeError(update.error)}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={reset} disabled={!dirty || update.isPending} className={buttonSecondary}>
            Undo changes
          </button>
          <button type="button" onClick={save} disabled={!dirty || update.isPending} className={buttonPrimary}>
            {update.isPending ? "Saving…" : "Save access"}
          </button>
        </div>
      </div>
    </article>
  );
}
