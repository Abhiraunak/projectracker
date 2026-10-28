"use client";

import React from "react";
import { FiClock } from "react-icons/fi";
import { Heading } from "@/components/utilites/Label";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useProjectAccess";

/** What a new account sees until an admin gives it access */
export function WelcomePage() {
  const { user } = useAuth();
  const access = useAccess();
  const name = user?.name ?? user?.email?.split("@")[0] ?? "there";

  return (
    <div className="mx-auto max-w-xl px-2 py-12 text-center sm:py-20">
      <span aria-hidden className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-800">
        <FiClock className="h-6 w-6" />
      </span>
      <Heading>Welcome, {name}</Heading>
      <p className="mt-3 text-sm text-stone-600">
        Your account is ready. An admin now needs to give you access. As soon as they do, your tools will appear in the menu.
      </p>
      <p className="mt-2 text-sm text-stone-500">Let your admin know you have signed up.</p>
      <button
        type="button"
        onClick={access.refetch}
        className="mt-6 rounded border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        Check again
      </button>
    </div>
  );
}
