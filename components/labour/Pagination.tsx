"use client";

import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const btn =
  "rounded border border-stone-300 p-1.5 text-stone-600 transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:cursor-not-allowed disabled:opacity-40";

export function Pagination({ page, totalPages, total, pageSize, onPageChange }: PaginationProps) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-stone-200 px-4 py-3 print:hidden">
      <p className="text-sm text-stone-500" aria-live="polite">
        Showing {from} to {to} of {total}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm tabular-nums text-stone-500">
            Page {page} of {totalPages}
          </span>
          <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page" className={btn}>
            <FiChevronLeft aria-hidden />
          </button>
          <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page" className={btn}>
            <FiChevronRight aria-hidden />
          </button>
        </div>
      )}
    </nav>
  );
}