"use client";

import Link from "next/link";
import { FiChevronRight, FiFileText } from "react-icons/fi";
import { useProjectHub } from "@/hooks/useProjectHub";
import { plural, rupeesShort, shortDate } from "@/lib/projects/hub";
import { EmptyState, SectionError, SectionSkeleton } from "../ui";

/** The project's BOQs. The list comes with the hub's data, so this opens with no extra request. */
export default function BoqSection({ projectId }: { projectId: string }) {
  const hub = useProjectHub(projectId);
  if (hub.isPending) return <SectionSkeleton />;
  if (hub.isError) return <SectionError error={hub.error} onRetry={() => void hub.refetch()} />;
  const boqs = hub.data.boqs ?? [];

  if (boqs.length === 0)
    return (
      <EmptyState
        title="No BOQ linked to this project yet"
        hint="Open a BOQ and choose this project in its header to link it."
        action={{ href: "/dashboard/boq", label: "Go to BOQs" }}
      />
    );

  return (
    <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200">
      {boqs.map((b) => (
        <li key={b.id}>
          <Link
            href={`/dashboard/boq/${b.id}`}
            className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none"
          >
            <FiFileText aria-hidden className="shrink-0 text-lg text-stone-400" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-stone-900">{b.title || "Untitled BOQ"}</span>
              <span className="block truncate text-xs text-stone-500">
                {[b.boqNumber, plural(b.itemCount, "item"), `updated ${shortDate(b.updatedAt.slice(0, 10))}`].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-semibold tabular-nums">{rupeesShort(b.grandTotal)}</span>
              <span className={`text-xs ${b.status === "FINAL" ? "text-emerald-700" : "text-stone-500"}`}>{b.status === "FINAL" ? "Final" : "Draft"}</span>
            </span>
            <FiChevronRight aria-hidden className="shrink-0 text-stone-400" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
