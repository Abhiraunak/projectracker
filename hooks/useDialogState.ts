"use client";

import { useCallback, useState } from "react";

/**
 * Remembers which record a dialog is about. `value` is null while the dialog is closed.
 * Use `useDialogState<true>()` for a dialog that doesn't need a record (open = true).
 */
export function useDialogState<T>() {
  const [value, setValue] = useState<T | null>(null);
  const close = useCallback(() => setValue(null), []);
  return { value, open: setValue, close, isOpen: value !== null };
}
