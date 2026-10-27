"use client";

import React, { useState } from "react";
import { Heading } from "@/components/utilites/Label";
import { useAuth } from "@/hooks/useAuth";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { QueryError } from "@/components/materials/QueryError";
import { UserAccessCard } from "./UserAccessCard";

/** The admin page: everyone with an account, and what each may do. New sign-ups waiting for access come first. */
export function AdminPage() {
  const users = useAdminUsers();
  const { user: me } = useAuth();
  const [savedFor, setSavedFor] = useState<string | null>(null);

  const all = users.data ?? [];
  const adminCount = all.filter((u) => u.isAdmin).length;
  const waiting = all.filter((u) => !u.isAdmin && u.permissions.length === 0);
  const ordered = [...waiting, ...all.filter((u) => !waiting.includes(u))];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <Heading>Admin</Heading>
        <p className="mt-1 text-sm text-stone-500">
          Choose what each person can do. Permissions apply to every project. Admins can do everything.
        </p>
      </header>

      {waiting.length > 0 && (
        <p role="status" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {waiting.length === 1 ? "1 person is" : `${waiting.length} people are`} waiting for access. Until you give them some,
          they only see a welcome page.
        </p>
      )}
      {savedFor && (
        <p role="status" className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Saved access for {savedFor}. It applies straight away.
        </p>
      )}

      {users.isPending && <div aria-busy="true" className="h-64 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />}
      {users.isError && <QueryError error={users.error} onRetry={() => users.refetch()} />}

      <div className="space-y-4">
        {ordered.map((user) => (
          <UserAccessCard
            // A new key when the saved access changes, so the card starts from what the server now has
            key={`${user.id}:${user.isAdmin}:${user.permissions.join(",")}`}
            user={user}
            isYou={!!me?.email && me.email === user.email}
            isLastAdmin={adminCount <= 1}
            onSaved={setSavedFor}
          />
        ))}
      </div>
    </div>
  );
}
