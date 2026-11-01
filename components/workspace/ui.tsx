"use client";

import { Component, memo, type ReactNode } from "react";
import Link from "next/link";
import { describeError } from "@/lib/api";

/** Same height as a typical section, so nothing jumps when the content arrives */
export const SectionSkeleton = () => (
  <div aria-busy="true" aria-label="Loading" className="space-y-3">
    <div className="h-24 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />
    <div className="h-64 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />
  </div>
);

export function SectionError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p>{describeError(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 min-h-11 font-medium underline sm:min-h-0">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 px-6 py-12 text-center">
      <p className="font-medium text-stone-900">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">{hint}</p>}
      {action && (
        <Link href={action.href} className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-stone-300 px-4 text-sm font-medium hover:bg-stone-50">
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** "Saving…" / "Saved" next to live edits, in a fixed-height line so the page doesn't move */
export const SaveState = memo(function SaveState({ state }: { state: "idle" | "saving" | "error" }) {
  return (
    <p aria-live="polite" className={`mb-2 h-5 text-right text-xs ${state === "error" ? "text-red-700" : "text-stone-500"}`}>
      {state === "saving" ? "Saving…" : state === "error" ? "Couldn't save. Your last change was undone." : ""}
    </p>
  );
});

/** A ring for "how far along": drawn with two circles, no chart library */
export const ProgressRing = memo(function ProgressRing({ percent, size = 56 }: { percent: number; size?: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, percent));
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" role="img" aria-label={`${p}% done`} className="shrink-0">
      <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-stone-200" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${(p / 100) * c} ${c}`}
        transform="rotate(-90 28 28)"
        className="text-orange-500"
      />
      <text x="28" y="32.5" textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor" className="text-stone-900">
        {p}%
      </text>
    </svg>
  );
});

/**
 * If a section fails to load (a lost connection while its code downloads, or a bug in it), only that section
 * shows an error with a retry; the rest of the workspace keeps working.
 */
export class SectionBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error)
      return (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>This section couldn&apos;t open. Check your connection and try again.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-2 min-h-11 font-medium underline sm:min-h-0">
            Reload
          </button>
        </div>
      );
    return this.props.children;
  }
}
