"use client";

import React, { useId, useMemo, useState } from "react";
import { FiX } from "react-icons/fi";
import { useAppUsers } from "@/hooks/useAppUsers";
import { useDebounced } from "@/hooks/useDebounced";
import type { AppUser } from "@/lib/drawings/types";
import { Avatar } from "./Avatar";
import { focusRing, inputBase } from "./styles";

interface UserPickerProps {
  selected: AppUser[];
  onChange: (users: AppUser[]) => void;
  disabled?: boolean;
}

/** Pick people from the app's users: chips for who's chosen, a search box, and a checkbox list */
export function UserPicker({ selected, onChange, disabled = false }: UserPickerProps) {
  const id = useId();
  const [search, setSearch] = useState("");
  const users = useAppUsers(useDebounced(search.trim(), 250));
  const selectedIds = useMemo(() => new Set(selected.map((user) => user.id)), [selected]);

  const toggle = (user: AppUser) =>
    onChange(selectedIds.has(user.id) ? selected.filter((item) => item.id !== user.id) : [...selected, user]);

  return (
    <div>
      <label htmlFor={`${id}-search`} className="mb-1.5 block text-sm text-stone-500">
        Share with
      </label>

      {selected.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {selected.map((user) => (
            <li key={user.id} className="flex items-center gap-1.5 rounded bg-stone-100 py-1 pl-1.5 pr-1 text-xs text-stone-700">
              <Avatar user={user} size="sm" />
              <span className="max-w-40 truncate">{user.email}</span>
              <button type="button" onClick={() => toggle(user)} disabled={disabled} aria-label={`Remove ${user.email}`} className={`rounded p-1 hover:bg-stone-200 ${focusRing}`}>
                <FiX aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        id={`${id}-search`}
        type="search"
        value={search}
        disabled={disabled}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search people by email"
        className={inputBase}
      />

      <div className="mt-2 max-h-48 overflow-y-auto rounded border border-stone-300">
        {users.isPending && <p className="p-3 text-sm text-stone-500">Searching…</p>}
        {users.isError && <p role="alert" className="p-3 text-sm text-red-700">Couldn&rsquo;t load people. Try again.</p>}
        {users.data && users.data.length === 0 && <p className="p-3 text-sm text-stone-500">No one found.</p>}
        {users.data && users.data.length > 0 && (
          <ul className="divide-y divide-stone-200">
            {users.data.map((user) => (
              <li key={user.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-stone-50">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(user.id)}
                    disabled={disabled}
                    onChange={() => toggle(user)}
                    className="h-4 w-4 shrink-0 accent-stone-900"
                  />
                  <Avatar user={user} />
                  <span className="truncate text-sm">{user.email}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
