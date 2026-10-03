"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { FiAlertTriangle, FiTrash2, FiX } from "react-icons/fi";

export interface ConfirmDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  description?: React.ReactNode;
  /** Orange warning box, e.g. what else will be deleted. Hidden when omitted. */
  warning?: React.ReactNode;
  /** If set, the delete button stays disabled until this exact text (any case) is typed */
  confirmPhrase?: string;
  confirmLabel?: string;
  /** True while the request is running: locks the dialog and shows "Deleting…" */
  pending?: boolean;
  error?: string | null;
}

export function ConfirmDeleteDialog(props: ConfirmDeleteDialogProps) {
  const { open, onClose, pending = false } = props;
  const uid = useId();
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
      aria-labelledby={`${uid}-title`}
      aria-describedby={`${uid}-desc`}
      // Escape key: let React state decide, and never close while a request is running
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onClose();
      }}
      // Click on the dimmed backdrop (the dialog element itself, not its content)
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-stone-300 bg-white p-0 text-stone-900 shadow-xl backdrop:bg-stone-900/50"
    >
      {/* Mounted only while open, so the typed text always starts empty */}
      {open && <DialogBody {...props} uid={uid} />}
    </dialog>
  );
}

function DialogBody({
  uid,
  onClose,
  onConfirm,
  title = "Delete?",
  itemName,
  description,
  warning,
  confirmPhrase,
  confirmLabel = "Delete",
  pending = false,
  error,
}: ConfirmDeleteDialogProps & { uid: string }) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // With a phrase to type, focus the box; otherwise focus Cancel (the safe choice)
  useEffect(() => {
    (inputRef.current ?? cancelRef.current)?.focus();
  }, []);

  const phraseOk = !confirmPhrase || typed.trim().toLowerCase() === confirmPhrase.toLowerCase();
  const canDelete = phraseOk && !pending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canDelete) onConfirm();
      }}
      className="relative px-6 pb-6 pt-8 text-center"
    >
      <button
        type="button"
        onClick={onClose}
        disabled={pending}
        aria-label="Close"
        className="absolute right-3 top-3 rounded p-2 text-stone-400 transition-colors hover:text-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:opacity-40"
      >
        <FiX aria-hidden className="h-5 w-5" />
      </button>

      <h2 id={`${uid}-title`} className="text-xl font-semibold">
        {title}
      </h2>

      <p id={`${uid}-desc`} className="mt-3 text-sm text-stone-600">
        {description ?? (
          <>
            Are you sure you want to delete
            {itemName && <strong className="font-semibold text-stone-900"> &ldquo;{itemName}&rdquo;</strong>}?
            <br />
            You can&rsquo;t undo this action.
          </>
        )}
      </p>

      {warning && (
        <div role="note" className="mt-5 flex gap-3 border-l-4 border-orange-500 bg-orange-50 p-4 text-left">
          <FiAlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">Warning</p>
            <p className="mt-1 text-sm text-red-700">{warning}</p>
          </div>
        </div>
      )}

      {confirmPhrase && (
        <div className="mt-5 text-left">
          <label htmlFor={`${uid}-confirm`} className="mb-1.5 block text-sm text-stone-600">
            Type <strong className="select-all font-semibold text-stone-900">{confirmPhrase}</strong> to confirm
          </label>
          <input
            ref={inputRef}
            id={`${uid}-confirm`}
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={pending}
            autoComplete="off"
            spellCheck={false}
            placeholder={confirmPhrase}
            className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20 disabled:opacity-60"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
        <button
          ref={cancelRef}
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded border border-stone-300 bg-stone-100 px-6 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-36"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canDelete}
          className="flex items-center justify-center gap-2 rounded bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-36"
        >
          {pending ? (
            "Deleting…"
          ) : (
            <>
              {confirmLabel} <FiTrash2 aria-hidden />
            </>
          )}
        </button>
      </div>
    </form>
  );
}