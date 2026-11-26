"use client";

import { useEffect } from "react";
import "@/lib/pwa/install"; // starts listening for the browser's install offer early, for Install app in the menu

/**
 * Registers the app's service worker (public/sw.js) as soon as the app opens, so it can be installed and works with a
 * bad connection. Only in the built app: during `npm run dev` it would keep old code around and get in the way.
 * Push notifications use the same worker, so turning them on later just reuses it.
 */
export function RegisterServiceWorker() {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
        const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => { });
        // After the page has loaded, so it never slows down the first screen
        if (document.readyState === "complete") register();
        else window.addEventListener("load", register, { once: true });
    }, []);
    return null;
}