"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/**
 * Lets a sideways-scrolling box be dragged with the mouse, as a finger already does on a phone.
 *
 * A press that barely moves is still a normal click, so typing in a cell works as before. Once the mouse moves a few
 * pixels it becomes a drag: the box scrolls, no text gets selected, and the click at the end is ignored.
 * Also reports whether there is more to see on either side, for the arrow buttons.
 *
 * The component makes the ref (useRef) and passes it in, so it can put it on the element as a plain `ref={…}`.
 */
export function useDragScroll<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const start = el.scrollLeft > 1;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges((e) => (e.start === start && e.end === end ? e : { start, end }));
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    if (el.firstElementChild) resize.observe(el.firstElementChild);

    let startX = 0;
    let startLeft = 0;
    let pressed = false;
    let dragging = false;

    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return; // touch and pens scroll natively
      if ((e.target as HTMLElement).closest("button, a, select")) return;
      if (el.scrollWidth <= el.clientWidth) return; // nothing to scroll
      pressed = true;
      dragging = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
    };
    const move = (e: PointerEvent) => {
      if (!pressed) return;
      const dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < 6) return; // still a click
        dragging = true;
        el.setPointerCapture(e.pointerId);
        el.dataset.dragging = "true";
        if (document.activeElement instanceof HTMLElement && el.contains(document.activeElement)) document.activeElement.blur();
        window.getSelection()?.removeAllRanges();
      }
      e.preventDefault();
      el.scrollLeft = startLeft - dx;
    };
    const up = (e: PointerEvent) => {
      if (!pressed) return;
      pressed = false;
      if (!dragging) return;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      delete el.dataset.dragging;
      // The click that ends a drag must not focus a cell or press anything
      const swallow = (c: MouseEvent) => {
        c.stopPropagation();
        c.preventDefault();
      };
      el.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => el.removeEventListener("click", swallow, { capture: true }), 0);
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("scroll", measure);
      resize.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [measure, ref]);

  /** Scroll by most of a screenful: -1 back, 1 forward */
  const page = useCallback((direction: -1 | 1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }, [ref]);

  /**
   * Scroll so a column is in view. `pick` finds it once the layout is ready and returns its left edge inside the box;
   * `stickyWidth` is the width of anything pinned on the left (the column must land just after it).
   */
  const reveal = useCallback((pick: (el: T) => { left: number; stickyWidth: number } | null, smooth: boolean) => {
    const el = ref.current;
    if (!el) return;
    const go = (behavior: ScrollBehavior) => {
      const at = pick(el);
      const max = el.scrollWidth - el.clientWidth;
      const left = at ? Math.min(max, Math.max(0, at.left - at.stickyWidth)) : max;
      el.scrollTo({ left, behavior });
    };
    if (smooth) go("smooth");
    else {
      go("auto");
      requestAnimationFrame(() => go("auto")); // again once the new columns are laid out
    }
  }, [ref]);

  return { edges, page, reveal, measure };
}