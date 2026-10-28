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
    <div className="min-w-0 text-stone-900">
      {/*
        Stays at the top while the page scrolls, the same as the Labour, Drawings and BOQ headers. On phones and
        tablets it sits just under the layout's 56px top bar (top-14). On large screens the white card scrolls, and a
        sticky element sticks inside the card's 24px padding, so lg:-top-6 lifts it flush to the card's edge; the
        negative margins with matching padding stretch its white background over the card's padding.
      */}
      <header className="sticky top-14 z-20 -mx-4 -mt-5 border-b border-stone-200 bg-white px-4 pt-3 sm:-mx-6 sm:-mt-6 sm:px-6 lg:-top-6 lg:-mx-8 lg:px-8 lg:pt-4">
        <div className="mx-auto mb-3 flex max-w-4xl flex-col gap-1 sm:mb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-0.5">
            <Heading>Admin</Heading>
            <p className="text-sm text-stone-500">Choose what each person can do. Permissions apply to every project. Admins can do everything.</p>
          </div>
          {users.data && (
            <p className="shrink-0 text-sm text-stone-500 tabular-nums">
              {all.length} {all.length === 1 ? "person" : "people"} · {adminCount} {adminCount === 1 ? "admin" : "admins"}
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-5 py-5 sm:space-y-6 sm:py-8">
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

        <div className="space-y-3 sm:space-y-4">
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
    </div>
  );
}