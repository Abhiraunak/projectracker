"use client";

import type { ReactNode } from "react";
import { FiCommand, FiPrinter } from "react-icons/fi";
import { Heading } from "@/components/utilites/Label";
import { fieldLabel, inputBase } from "@/components/utilites/fieldStyles";

/** Title, keyboard hints, and the print title and button */
export function AttendanceHeader({
  printTitle,
  onPrintTitle,
  defaultTitle,
  onPrint,
}: {
  printTitle: string;
  onPrintTitle: (v: string) => void;
  defaultTitle: string;
  onPrint: () => void;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <Heading>Labour attendance</Heading>
        <p className="mt-1 text-sm text-stone-500">Track and update daily contractor payments</p>
        <p className="mt-2 hidden items-center gap-2 text-xs text-stone-500 md:flex">
          <FiCommand aria-hidden />
          <span>
            <Key>↓</Key> or <Key>Enter</Key> to move, <Key>Ctrl</Key>+<Key>S</Key> to save
          </span>
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-auto">
        <div className="sm:w-72">
          <label htmlFor="printTitle" className={fieldLabel}>
            Print title (optional)
          </label>
          <input id="printTitle" type="text" maxLength={80} value={printTitle} onChange={(e) => onPrintTitle(e.target.value)} placeholder={defaultTitle} className={inputBase} />
        </div>
        <button
          type="button"
          onClick={onPrint}
          className="flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <FiPrinter aria-hidden /> Print slip
        </button>
      </div>
    </div>
  );
}

const Key = ({ children }: { children: ReactNode }) => <kbd className="rounded border border-stone-300 px-1">{children}</kbd>;
