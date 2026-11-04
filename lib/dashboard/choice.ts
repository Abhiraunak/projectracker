"use client";

import { useSyncExternalStore } from "react";

/*
 * Which dashboard opens at /dashboard: the simple one (create a project or BOQ, your projects, recent activity)
 * or the full one (the admin overview, or each person's own day).
 *
 * DEFAULT_DASHBOARD is the one place to change the default in code. On top of it, each person can switch with the
 * link at the top of either dashboard; that choice is remembered on their device.
 */
export type DashboardKind = "simple" | "full";
export const DEFAULT_DASHBOARD: DashboardKind = "simple";

const KEY = "dashboard-kind";
const listeners = new Set<() => void>();

function read(): DashboardKind {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "simple" || v === "full" ? v : DEFAULT_DASHBOARD;
  } catch {
    return DEFAULT_DASHBOARD; // storage blocked: the default
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("storage", fn); // another tab switched
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

/** The dashboard to show, and a way to switch (remembered on this device) */
export function useDashboardKind(): [DashboardKind, (kind: DashboardKind) => void] {
  const kind = useSyncExternalStore(subscribe, read, () => DEFAULT_DASHBOARD);
  const set = (next: DashboardKind) => {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked: it still switches for now */
    }
    listeners.forEach((fn) => fn());
  };
  return [kind, set];
}