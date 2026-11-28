/* Service worker for the projecTracker app. It lives at the site root (/sw.js) so it covers every page.
   - Push notifications: shows them, and opens the right page when one is tapped.
   - Installable app: keeps the app's own code and icons on the device so it opens fast, and shows an
     "offline" page instead of the browser's error when there is no connection.
   It never stores pages or API answers (your projects, money, attendance): those always come fresh from the server. */

// Change the version when this file's caching changes: old copies are then cleared automatically
const CACHE = "projectracker-v4"; // v4: the new logo icons (nothing stored on localhost)
const PRECACHE = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/badge-72.png"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE);
            await cache.addAll(PRECACHE);
            await self.skipWaiting();
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const names = await caches.keys();
            await Promise.all(names.filter((name) => (name.startsWith("projectracker-") || name.startsWith("street-house-")) && name !== CACHE).map((name) => caches.delete(name)));
            await self.clients.claim();
        })()
    );
});

/** The app's own files that never change once built (their names carry a fingerprint), plus icons and fonts */
// On this computer (localhost) nothing is stored, so testing never shows old code
const LOCAL = ["localhost", "127.0.0.1"].includes(self.location.hostname);

function isStaticAsset(url) {
    if (LOCAL) return false;
    return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(?:woff2?|ttf|otf)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return; // saving, uploading, deleting: straight to the server
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return; // the API (on its own address) and anything else: untouched
    if (url.pathname.startsWith("/api/")) return; // live data and the live-updates stream: untouched

    // Pages: always from the network; only when there is no connection, the offline page
    if (request.mode === "navigate") {
        event.respondWith(
            (async () => {
                try {
                    return await fetch(request);
                } catch {
                    return (await caches.match("/offline.html")) || new Response("You're offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
                }
            })()
        );
        return;
    }

    // The app's code, icons and fonts: from the device when stored, otherwise fetched once and stored
    if (isStaticAsset(url)) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(CACHE);
                const hit = await cache.match(request);
                if (hit) return hit;
                const response = await fetch(request);
                if (response.ok) cache.put(request, response.clone());
                return response;
            })()
        );
    }
    // Everything else (page data requests and the like) goes to the network as normal
});

/** Only ever open a page of this app, whatever the message says */
function safeUrl(url) {
    try {
        const target = new URL(url || "/dashboard", self.location.origin);
        return target.origin === self.location.origin ? target.href : `${self.location.origin}/dashboard`;
    } catch {
        return `${self.location.origin}/dashboard`;
    }
}

self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { body: event.data ? event.data.text() : "" };
    }

    event.waitUntil(
        (async () => {
            await self.registration.showNotification(data.title || "New notification", {
                body: data.body || "",
                icon: "/icons/icon-192.png",
                badge: "/icons/badge-72.png",
                tag: data.tag,
                renotify: Boolean(data.tag),
                data: { url: safeUrl(data.url) },
            });
            // Pages that are open refresh their lists, so the new drawing appears without reloading
            const pages = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
            pages.forEach((page) => page.postMessage({ type: "push", tag: data.tag || null }));
        })()
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const target = safeUrl("/dashboard"); // tapping a notification just opens the app (its home page)

    event.waitUntil(
        (async () => {
            const pages = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
            const open = pages.find((page) => new URL(page.url).origin === self.location.origin);
            if (open) {
                try {
                    await open.focus();
                    if ("navigate" in open) await open.navigate(target);
                    return;
                } catch {
                    /* fall through and open a new window */
                }
            }
            await self.clients.openWindow(target);
        })()
    );
});