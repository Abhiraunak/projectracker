"use client";

import { useEffect } from "react";

/**
 * Browsers change a number box's value when you scroll over it while it has the cursor (mouse wheel or a two-finger
 * swipe on a trackpad). That silently changes amounts and rates. This takes the cursor out of the box as soon as a
 * scroll starts over it, so the page scrolls instead and the number stays as typed.
 *
 * Mounted once in the root layout; it covers every number box in the app, old and new. It renders nothing.
 */
export function NoWheelOnNumberInputs() {
  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      const box = document.activeElement;
      if (!(box instanceof HTMLInputElement) || box.type !== "number") return;
      // Only when the scroll happens over the box itself (judged by the pointer, which every browser reports the same)
      const r = box.getBoundingClientRect();
      if (event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom) box.blur();
    };
    // Capture: runs before anything else sees the scroll; passive: never slows scrolling down
    document.addEventListener("wheel", onWheel, { capture: true, passive: true });
    return () => document.removeEventListener("wheel", onWheel, { capture: true });
  }, []);
  return null;
}