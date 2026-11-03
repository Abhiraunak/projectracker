"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Form state with undo and redo. A snapshot is taken once typing pauses for `pauseMs`, so one undo steps back one
 * edit, not one letter. `reset` replaces the state and forgets the history (after saving, or loading a record).
 */
export function useFormHistory<T>(init: () => T, pauseMs = 300) {
  const [initial] = useState(init);
  const [value, setValue] = useState<T>(initial);
  const pastRef = useRef<T[]>([initial]);
  const futureRef = useRef<T[]>([]);
  const fromUndoRedo = useRef(false);
  const latest = useRef<T>(initial);

  useEffect(() => {
    latest.current = value;
    if (fromUndoRedo.current) {
      fromUndoRedo.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const past = pastRef.current;
      if (JSON.stringify(value) !== JSON.stringify(past[past.length - 1])) {
        past.push(value);
        futureRef.current = [];
      }
    }, pauseMs);
    return () => clearTimeout(timer);
  }, [value, pauseMs]);

  const undo = useCallback(() => {
    const past = pastRef.current;
    // Capture typing that hasn't been snapshotted yet, so undo steps back one edit at a time
    if (JSON.stringify(latest.current) !== JSON.stringify(past[past.length - 1])) {
      past.push(latest.current);
      futureRef.current = [];
    }
    if (past.length > 1) {
      fromUndoRedo.current = true;
      futureRef.current.push(past.pop()!);
      setValue(past[past.length - 1]!);
    }
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (next) {
      fromUndoRedo.current = true;
      pastRef.current.push(next);
      setValue(next);
    }
  }, []);

  const reset = useCallback((state: T) => {
    setValue(state);
    pastRef.current = [state];
    futureRef.current = [];
  }, []);

  return { value, setValue, undo, redo, reset };
}
