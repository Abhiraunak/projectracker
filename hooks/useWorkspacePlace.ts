"use client";

import { useSyncExternalStore } from "react";
import { parsePlace, placeSearch, samePlace, type Place, type SectionKey } from "@/lib/projects/place";

/*
 * The workspace's "router": the place lives in the address bar, and moving changes only the address, with
 * history.pushState. No page load, no server round trip, no Next.js navigation: the screen swaps at once.
 * The back and forward buttons fire "popstate", which every reader listens to.
 *
 * Readers subscribe to one value each (the project, the section, or the item inside it), so changing section
 * re-renders only the parts that show the section, and opening a material tile only the Materials section.
 */

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("popstate", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("popstate", fn);
  };
}

// Parse once per address, not once per reader per render
let lastSearch: string | null = null;
let lastPlace: Place = { projectId: null, section: "overview", item: null };
function current(): Place {
  const search = window.location.search;
  if (search !== lastSearch) {
    lastSearch = search;
    lastPlace = parsePlace(search);
  }
  return lastPlace;
}

const getProjectId = () => current().projectId;
const getSection = () => current().section;
const getItem = () => current().item ?? null;
const serverProjectId = () => null;
const serverSection = (): SectionKey => "overview";
const serverItem = () => null;

export const useWorkspaceProjectId = () => useSyncExternalStore(subscribe, getProjectId, serverProjectId);
export const useWorkspaceSection = () => useSyncExternalStore(subscribe, getSection, serverSection);
/** The place inside the current section (e.g. a material tile), or null */
export const useWorkspaceItem = () => useSyncExternalStore(subscribe, getItem, serverItem);

/** Go somewhere in the workspace. `replace` changes the current history entry instead of adding one. */
export function goTo(place: Place, { replace = false }: { replace?: boolean } = {}) {
  if (samePlace(place, current())) return;
  const url = `${window.location.pathname}${placeSearch(place, window.location.search)}${window.location.hash}`;
  // Next.js (14.1+) keeps its own state in step with these calls, so its hooks still see the right address
  window.history[replace ? "replaceState" : "pushState"](null, "", url);
  notify();
}

/** The address of a place, for real links: they work with middle-click, "open in new tab" and long-press */
export const hrefFor = (place: Place) => placeSearch(place) || "?";

/**
 * A link that moves inside the workspace without loading a page. A plain click is handled here; a click with
 * Ctrl, Cmd, Shift or the middle button is left to the browser, so opening in a new tab still works.
 */
export function onPlaceClick(place: Place) {
  return (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goTo(place);
  };
}
