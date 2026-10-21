"use client";

import React from "react";
import { FiBell, FiBellOff } from "react-icons/fi";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const ROW =
  "flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50 lg:py-1.5";

/** In the sidebar footer: turn notifications on or off for this device, and send a test */
export function NotificationToggle() {
  const push = usePushNotifications();
  const { status } = push;

  if (status === "loading" || status === "unsupported" || status === "unavailable") return null;

  if (status === "needs-install") {
    return <p className="px-2.5 py-1.5 text-xs text-stone-500">To get notifications on iPhone, add this app to your Home Screen first.</p>;
  }

  if (status === "blocked") {
    return (
      <p className="flex items-start gap-2.5 px-2.5 py-1.5 text-xs text-stone-500">
        <FiBellOff aria-hidden className="mt-0.5 shrink-0" />
        Notifications are blocked. Allow them in your browser&rsquo;s site settings.
      </p>
    );
  }

  const on = status === "on";
  return (
    <div className="space-y-0.5">
      <button type="button" role="switch" aria-checked={on} onClick={on ? push.disable : push.enable} disabled={push.busy} className={ROW}>
        {on ? <FiBell aria-hidden className="shrink-0 text-amber-600" /> : <FiBellOff aria-hidden className="shrink-0" />}
        <span className="flex-1 text-left">Notifications</span>
        <span className="text-xs font-medium">{push.busy ? "…" : on ? "On" : "Off"}</span>
      </button>
      {on && (
        <button type="button" onClick={push.sendTest} disabled={push.busy} className="px-2.5 text-xs text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline">
          Send a test
        </button>
      )}
      {(push.notice || push.error) && (
        <p role={push.error ? "alert" : "status"} className={`px-2.5 text-xs ${push.error ? "text-red-700" : "text-stone-600"}`}>
          {push.error ?? push.notice}
        </p>
      )}
    </div>
  );
}
