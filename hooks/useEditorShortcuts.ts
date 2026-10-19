"use client";

import { useEffect, useRef } from "react";

interface Shortcuts {
  undo: () => void;
  redo: () => void;
  save: () => void;
  enabled: boolean;
}

/** Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo, Ctrl/Cmd+S save now. They replace the browser's own versions. */
export function useEditorShortcuts(shortcuts: Shortcuts) {
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      const { undo, redo, save, enabled } = ref.current;
      if (key === "s") {
        event.preventDefault();
        save();
      } else if (enabled && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (enabled && key === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
