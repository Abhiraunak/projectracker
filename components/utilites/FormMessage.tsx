"use client";

import type { ReactNode } from "react";
import { FiAlertCircle } from "react-icons/fi";

/** A green "saved" note or a red problem, read out by screen readers. Renders nothing without a message. */
export function FormMessage({ tone, children }: { tone: "error" | "success"; children?: ReactNode }) {
  if (!children) return null;
  return tone === "error" ? (
    <p role="alert" className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <FiAlertCircle aria-hidden className="mt-0.5 shrink-0" />
      {children}
    </p>
  ) : (
    <p role="status" className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
      {children}
    </p>
  );
}
