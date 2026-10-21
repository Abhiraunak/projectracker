"use client";

import React, { useId, useState, type ChangeEvent } from "react";
import { FiImage } from "react-icons/fi";
import { fileToLogo, LOGO_ACCEPT } from "@/lib/boq/logo";
import { setLogo } from "@/lib/boq/operations";
import { useBoqEdit } from "./editContext";

/** The company logo: click to add or change it (it is resized and stored inside the BOQ), or remove it */
export function LogoField({ logo }: { logo: string | null }) {
  const { apply, readOnly } = useBoqEdit();
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allows choosing the same file again
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await fileToLogo(file);
      apply((doc) => setLogo(doc, dataUrl));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't use that image.");
    }
  };

  if (readOnly && !logo) return null;

  return (
    <div className="shrink-0">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="Company logo" className="h-20 w-20 rounded border border-stone-200 bg-white object-contain" />
      ) : (
        <label
          htmlFor={inputId}
          className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed border-stone-300 text-xs text-stone-500 transition-colors hover:border-stone-500 hover:bg-stone-50 focus-within:ring-2 focus-within:ring-amber-500"
        >
          <FiImage aria-hidden className="h-5 w-5" />
          Add logo
        </label>
      )}

      {!readOnly && logo && (
        <div className="mt-1 flex gap-3 text-xs">
          <label htmlFor={inputId} className="cursor-pointer font-medium text-stone-600 underline-offset-2 hover:underline">
            Change
          </label>
          <button type="button" onClick={() => apply((doc) => setLogo(doc, null))} className="font-medium text-red-700 underline-offset-2 hover:underline">
            Remove
          </button>
        </div>
      )}

      {!readOnly && <input id={inputId} type="file" accept={LOGO_ACCEPT} onChange={onFile} className="sr-only" />}
      {error && (
        <p role="alert" className="mt-1 max-w-40 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
