"use client";

import { useCallback, useReducer } from "react";
import { historyReducer, initialHistory } from "@/lib/editHistory";

/** A value with undo and redo. `apply(update, key)` with the same key in quick succession is one undo step. */
export function useEditHistory<T>(initial: T) {
  const [state, dispatch] = useReducer(historyReducer<T>, initial, initialHistory);

  const apply = useCallback((update: (current: T) => T, key?: string) => dispatch({ type: "apply", update, key, now: Date.now() }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const reset = useCallback((value: T) => dispatch({ type: "reset", value }), []);

  return { present: state.present, apply, undo, redo, reset, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}
