"use client";

import { useEffect } from "react";

/** Asks "Leave site?" before closing or reloading the tab while there are unsaved changes */
export function useUnsavedWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = ""; // older browsers need this to show the prompt
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}
