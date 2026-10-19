"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveState = "idle" | "pending" | "saving" | "error";

interface Options<T> {
  value: T;
  save: (value: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

/**
 * Saves `value` a moment after it stops changing. Only one save runs at a time; anything typed during a save is
 * saved straight after. After an error it waits for the next change, or for retry().
 */
export function useAutosave<T>({ value, save, delay = 1200, enabled = true }: Options<T>) {
  const [state, setState] = useState<AutosaveState>("idle");
  const [error, setError] = useState<unknown>(null);

  const savedRef = useRef(value); // the last value the server has
  const latestRef = useRef(value);
  const saveRef = useRef(save);
  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  latestRef.current = value;
  saveRef.current = save;

  const run = useCallback(async (): Promise<void> => {
    if (runningRef.current) return; // the running save checks again when it finishes
    const target = latestRef.current;
    if (target === savedRef.current) {
      setState("idle");
      return;
    }
    runningRef.current = true;
    setState("saving");
    setError(null);
    try {
      await saveRef.current(target);
      savedRef.current = target;
    } catch (err) {
      runningRef.current = false;
      setError(err);
      setState("error");
      return;
    }
    runningRef.current = false;
    if (latestRef.current !== savedRef.current) return run(); // more was typed while saving
    setState("idle");
  }, []);

  useEffect(() => {
    if (!enabled || value === savedRef.current) return;
    setState((s) => (s === "saving" ? s : "pending"));
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void run(), delay);
    return () => clearTimeout(timerRef.current);
  }, [value, enabled, delay, run]);

  /** Save now, without waiting (Ctrl+S, leaving the page, marking final) */
  const flush = useCallback(() => {
    clearTimeout(timerRef.current);
    return run();
  }, [run]);

  /** After loading a fresh copy from the server: that copy counts as saved */
  const markSaved = useCallback((saved: T) => {
    savedRef.current = saved;
    setState("idle");
    setError(null);
  }, []);

  return { state, error, flush, retry: flush, markSaved };
}
