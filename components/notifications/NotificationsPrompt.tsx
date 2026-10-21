"use client";

import React, { useEffect, useState } from "react";
import { FiBell, FiX } from "react-icons/fi";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const DISMISS_KEY = "push-prompt-dismissed";

const readDismissed = () => {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

/** On the Drawings page: invites people to turn on notifications for shared drawings, until they do or say "Not now" */
export function NotificationsPrompt() {
  const push = usePushNotifications();
  const [dismissed, setDismissed] = useState(true); // hidden until the browser is checked, so it never flashes
  useEffect(() => setDismissed(readDismissed()), []);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private window: it just shows again next time */
    }
  };

  if (push.status === "on" && push.notice) {
    return (
      <p role="status" className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
        {push.notice} You&rsquo;ll be told when someone shares a drawing with you.
      </p>
    );
  }
  if (dismissed || (push.status !== "off" && push.status !== "needs-install")) return null;

  return (
    <section aria-label="Notifications" className="flex flex-col gap-3 rounded border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
      <FiBell aria-hidden className="hidden h-5 w-5 shrink-0 text-amber-700 sm:block" />
      <div className="flex-1 text-sm text-amber-900">
        <p className="font-semibold">Get notified when someone shares a drawing with you</p>
        {push.status === "needs-install" ? (
          <p className="mt-0.5">
            On iPhone or iPad: tap Share, then <span className="font-medium">Add to Home Screen</span>, open the app from there and turn
            notifications on in the menu.
          </p>
        ) : (
          <p className="mt-0.5">Works even when this tab is closed. You can turn it off any time in the menu.</p>
        )}
        {push.error && (
          <p role="alert" className="mt-1 text-red-700">
            {push.error}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        {push.status === "off" && (
          <button
            type="button"
            onClick={push.enable}
            disabled={push.busy}
            className="rounded bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50"
          >
            {push.busy ? "Turning on…" : "Turn on"}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Not now"
          className="flex items-center gap-1 rounded border border-amber-300 px-3 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <FiX aria-hidden className="sm:hidden" /> <span className="hidden sm:inline">Not now</span>
        </button>
      </div>
    </section>
  );
}
