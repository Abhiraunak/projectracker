"use client";

import React from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { describeError } from "@/lib/api";
import type { DrawingPage, DrawingScope } from "@/lib/drawings/types";
import { Pagination } from "@/components/labour/Pagination";
import { DrawingCard } from "./DrawingCard";

interface DrawingGalleryProps {
  list: UseQueryResult<DrawingPage, Error>;
  scope: DrawingScope;
  isSearching: boolean;
  onOpen: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  onPageChange: (page: number) => void;
}

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

function emptyMessage(scope: DrawingScope, isSearching: boolean) {
  if (isSearching) return { title: "No drawings match your search", hint: "Try a different word." };
  if (scope === "mine") return { title: "You haven't uploaded any drawings", hint: "Use the upload box above to add your first one." };
  if (scope === "shared") return { title: "Nothing has been shared with you yet", hint: "Drawings other people share with you will appear here." };
  return { title: "No drawings yet", hint: "Upload an image above to get started." };
}

/** The results area: loading skeletons, an error, an empty message, or the grid with its pagination */
export function DrawingGallery({ list, scope, isSearching, onOpen, onShare, onDelete, onPageChange }: DrawingGalleryProps) {
  if (list.isPending) {
    return (
      <div className={GRID} aria-busy="true">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="aspect-[4/3] animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  if (list.isError) {
    return (
      <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{describeError(list.error)}</p>
        <button type="button" onClick={() => list.refetch()} className="mt-2 font-medium underline">
          Try again
        </button>
      </div>
    );
  }

  const { items, page, pageSize, total, totalPages } = list.data;

  if (total === 0) {
    const { title, hint } = emptyMessage(scope, isSearching);
    return (
      <div className="rounded border border-dashed border-stone-300 px-6 py-12 text-center">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-stone-500">{hint}</p>
      </div>
    );
  }

  return (
    <div className="rounded border border-stone-300">
      <ul className={`${GRID} p-4 transition-opacity ${list.isPlaceholderData ? "opacity-60" : ""}`}>
        {items.map((drawing) => (
          <li key={drawing.id}>
            <DrawingCard drawing={drawing} onOpen={onOpen} onShare={onShare} onDelete={onDelete} />
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={onPageChange} />
    </div>
  );
}
