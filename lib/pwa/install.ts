"use client";

import { useSyncExternalStore } from "react";

/**
 * "Install app": the browser offers to install the app (Chrome, Edge, Android) with a `beforeinstallprompt` event.
 * It is caught here as soon as this file loads (RegisterServiceWorker imports it on every page), kept, and used when
 * Install app is pressed in the account menu.
 *   ready       the browser can install it now (Install app opens its install box)
 *   installed   already running as the installed app: Install app is hidden
 *   unavailable not offered yet (or this browser can't): the menu shows how to install from the browser's menu
 */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
export type InstallState = "ready" | "installed" | "unavailable";

let offer: InstallEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
    installed = window.matchMedia("(display-mode: standalone)").matches;
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault(); // keep the offer for our own Install app button
        offer = e as InstallEvent;
        changed();
    });
    window.addEventListener("appinstalled", () => {
        offer = null;
        installed = true;
        changed();
    });
}

const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
};
const current = (): InstallState => (installed ? "installed" : offer ? "ready" : "unavailable");

/** Where install stands, and `install()` to open the browser's install box (true when the person said yes) */
export function useInstallApp() {
    const state = useSyncExternalStore(subscribe, current, () => "unavailable" as InstallState);
    const install = async () => {
        if (!offer) return false;
        const o = offer;
        offer = null; // the browser lets each offer be used once
        await o.prompt();
        const { outcome } = await o.userChoice;
        changed();
        return outcome === "accepted";
    };
    return { state, install };
}