"use client";

import { useEffect } from "react";
import "@/lib/pwa/install"; // starts listening for the browser's install offer early, for Install app in the menu

/**
 * Registers the app's service worker (public/sw.js) as soon as the app opens, so it can be installed and works with a
 * bad connection. Only in the built app. During `npm run dev` it does the opposite: it removes any worker left from
 * an earlier built run on this computer, and its saved files, so the newest code always shows.
 * Push notifications use the same worker, so turning them on later just reuses it.
 */
export function RegisterServiceWorker() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;
        if (process.env.NODE_ENV !== "production") {
            void (async () => {
                const workers = await navigator.serviceWorker.getRegistrations();
                await Promise.all(workers.map((w) => w.unregister()));
                if ("caches" in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
                if (workers.length > 0) window.location.reload(); // once, to load the fresh code
            })().catch(() => { });
            return;
        }
        const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => { });
        // After the page has loaded, so it never slows down the first screen
        if (document.readyState === "complete") register();
        else window.addEventListener("load", register, { once: true });
    }, []);
    return null;
}