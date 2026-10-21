"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { describeError } from "@/lib/api";
import { currentSubscription, forgetThisDevice, pushApi, pushSupport, subscribeThisDevice } from "@/lib/push";

/**
 *  loading        still checking
 *  unsupported    this browser can't receive web notifications
 *  needs-install  iPhone / iPad: add the app to the Home Screen first
 *  unavailable    the server has no notification keys set up yet
 *  blocked        the person said "Block": only the browser's site settings can undo that
 *  off            can be turned on
 *  on             this device receives notifications
 */
export type PushStatus = "loading" | "unsupported" | "needs-install" | "unavailable" | "blocked" | "off" | "on";

export function usePushNotifications() {
  const [support] = useState(() => (typeof window === "undefined" ? "unsupported" : pushSupport()));
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const config = useQuery({
    queryKey: ["push", "config"],
    queryFn: () => pushApi.config(),
    enabled: support === "supported",
    staleTime: Infinity,
  });

  // What this device already has. If it's subscribed, remind the server (it may have forgotten, or another
  // person may have used this device before): the server ties it to whoever is signed in now.
  useEffect(() => {
    if (support !== "supported") return;
    let cancelled = false;
    setPermission(Notification.permission);
    currentSubscription()
      .then(async (subscription) => {
        if (cancelled) return;
        const active = !!subscription && Notification.permission === "granted";
        setSubscribed(active);
        if (active) await pushApi.save(subscription.toJSON()).catch(() => {});
      })
      .catch(() => !cancelled && setSubscribed(false));
    return () => {
      cancelled = true;
    };
  }, [support]);

  const status: PushStatus =
    support !== "supported"
      ? support
      : config.isPending || subscribed === null
        ? "loading"
        : !config.data?.enabled || !config.data.publicKey
          ? "unavailable"
          : permission === "denied"
            ? "blocked"
            : subscribed
              ? "on"
              : "off";

  /** Turn on: asks the browser's permission (so it must run from a tap or click), then subscribes */
  const enable = useCallback(async () => {
    const key = config.data?.publicKey;
    if (!key) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const answer = await Notification.requestPermission();
      setPermission(answer);
      if (answer !== "granted") return;
      await subscribeThisDevice(key);
      setSubscribed(true);
      setNotice("Notifications are on for this device.");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }, [config.data?.publicKey]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    await forgetThisDevice();
    setSubscribed(false);
    setBusy(false);
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { sent } = await pushApi.test();
      setNotice(sent > 0 ? "Test sent. It should appear in a moment." : "Nothing was sent: turn notifications on again on this device.");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, error, notice, enable, disable, sendTest };
}
