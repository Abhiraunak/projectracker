import { request } from "@/lib/api";

/**
 * Web push in the browser: register the service worker (public/sw.js), ask permission, subscribe, and tell the
 * server. Works in Chrome, Edge, Firefox and Samsung Internet on phones and computers, and in Safari on a Mac.
 * On iPhone and iPad it works only once the app is added to the Home Screen (iOS 16.4 or later).
 */

export type PushSupport = "supported" | "unsupported" | "needs-install";

export interface PushConfig {
  enabled: boolean; // false until the server has its VAPID keys
  publicKey: string | null;
}

export const pushApi = {
  config: () => request<PushConfig>("/push/config"),
  save: (subscription: PushSubscriptionJSON) => request<void>("/push/subscription", { method: "PUT", body: JSON.stringify(subscription) }),
  remove: (endpoint: string) => request<void>("/push/subscription", { method: "DELETE", body: JSON.stringify({ endpoint }) }),
  test: () => request<{ sent: number }>("/push/test", { method: "POST" }),
};

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isInstalled = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function pushSupport(): PushSupport {
  if (typeof window === "undefined" || !window.isSecureContext) return "unsupported";
  const capable = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (isIos() && !isInstalled()) return "needs-install"; // Safari on iPhone only allows it for installed apps
  return capable ? "supported" : "unsupported";
}

/** The public key arrives as base64url text; the browser wants the raw bytes */
export function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const sameKey = (a: ArrayBuffer | null | undefined, b: Uint8Array) => {
  if (!a || a.byteLength !== b.byteLength) return false;
  const view = new Uint8Array(a);
  return view.every((byte, i) => byte === b[i]);
};

export async function registerWorker(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/** Subscribes this device (or reuses its subscription) and tells the server. Must run from a tap or click. */
export async function subscribeThisDevice(publicKey: string): Promise<void> {
  const registration = await registerWorker();
  const key = keyToBytes(publicKey);
  let subscription = await registration.pushManager.getSubscription();

  // The server's keys changed since this device subscribed: start again with the new ones
  if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await pushApi.save(subscription.toJSON());
}

/**
 * Stops notifications on this device and tells the server to forget it. Used when turning them off, and when
 * signing out, so the next person to sign in on this device doesn't receive the previous person's notifications.
 * Never throws and never waits more than a few seconds.
 */
export async function forgetThisDevice(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const work = (async () => {
    const subscription = await currentSubscription();
    if (!subscription) return;
    await pushApi.remove(subscription.endpoint).catch(() => {});
    await subscription.unsubscribe().catch(() => {});
  })();
  await Promise.race([work.catch(() => {}), new Promise((resolve) => setTimeout(resolve, 3000))]);
}
