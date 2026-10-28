"use client";

import { chooseProject } from "@/lib/chooseProject";
import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "active-project";
const CHANGED = "active-project-changed"; // tells other parts of this page that the choice changed

/** The saved choice, or null if there is none or storage is blocked */
function readSaved(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked: the first project is used
  }
}

/** Calls `onChange` when the choice changes: in this tab (select) or in another tab (the browser's storage event) */
function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGED, onChange);
  };
}

/** While rendering on the server there is no localStorage: start with no saved choice */
const serverSnapshot = () => null;

/**
 * The project a standalone page works on. It remembers the last choice in this browser,
 * so the person never has to pick (or type) a project again.
 */
export function useActiveProject(availableIds: string[]) {
  // Read straight from localStorage instead of copying it into state in an effect
  const savedId = useSyncExternalStore(subscribe, readSaved, serverSnapshot);

  // A string stands in for the array, which is a new object on every render (ids are cuids: no commas)
  const idsKey = availableIds.join(",");
  const activeId = useMemo(() => chooseProject(idsKey ? idsKey.split(",") : [], savedId), [idsKey, savedId]);

  const select = useCallback((id: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* storage blocked: the choice can't be remembered */
    }
    window.dispatchEvent(new Event(CHANGED)); // re-read the choice now
  }, []);

  return { activeId, select };
}