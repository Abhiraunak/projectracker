"use client";

import React from "react";
import Link from "next/link";
import { useBoq } from "@/hooks/useBoqs";
import { QueryError } from "@/components/materials/QueryError";
import { BoqEditor } from "./BoqEditor";

/** Loads one BOQ, then hands it to the editor (which keeps its own copy from then on) */
export function BoqEditorPage({ id }: { id: string }) {
  const boq = useBoq(id);

  if (boq.isPending) return <div aria-busy="true" className="h-[70vh] animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />;

  if (boq.isError) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <QueryError error={boq.error} onRetry={() => boq.refetch()} />
        <Link href="/dashboard/boq" className="text-sm font-medium underline">
          Back to all BOQs
        </Link>
      </div>
    );
  }

  // key: a different BOQ is a fresh editor (history, autosave and all)
  return <BoqEditor key={boq.data.id} record={boq.data} />;
}
