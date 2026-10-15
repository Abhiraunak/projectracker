"use client";

import React, { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";

const SIZE = { md: "max-w-md", lg: "max-w-2xl", xl: "max-w-5xl" } as const;

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  /** Spoken by screen readers when the dialog opens */
  label: string;
  size?: keyof typeof SIZE;
  /** While true (e.g. saving) the dialog can't be closed by Escape or a click outside */
  locked?: boolean;
  children: React.ReactNode;
}

/**
 * The shell for any pop-up. Built on the native <dialog>, so the page behind is blocked,
 * focus stays inside, and Escape works. Children are only mounted while open, so their state resets each time.
 */
export function ModalDialog({ open, onClose, label, size = "md", locked = false, children }: ModalDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault(); // let React state decide
        if (!locked) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !locked) onClose(); // click on the dim backdrop
      }}
      className={`m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] ${SIZE[size]} overflow-y-auto rounded-lg border border-stone-300 bg-white p-0 text-stone-900 shadow-xl backdrop:bg-stone-900/60`}
    >
      {open && children}
    </dialog>
  );
}

export function DialogHeader({ title, subtitle, onClose, locked = false }: { title: string; subtitle?: string; onClose: () => void; locked?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold">{title}</h2>
        {subtitle && <p className="truncate text-sm text-stone-500">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={locked}
        aria-label="Close"
        className="-mr-2 shrink-0 rounded p-2.5 text-stone-400 transition-colors hover:text-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:opacity-40"
      >
        <FiX aria-hidden className="h-5 w-5" />
      </button>
    </div>
  );
}
