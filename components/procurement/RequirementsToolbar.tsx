"use client";

import React from "react";
import { FiSearch } from "react-icons/fi";
import type { RequirementFilters } from "@/lib/materials/procurement";
import type { WorkItemRef } from "@/lib/materials/types";
import { STATUS_OPTIONS } from "./ProcurementStatusPill";
import { inputBase } from "../drawing/styles";

interface RequirementsToolbarProps {
  filters: RequirementFilters;
  workItems: WorkItemRef[];
  isFiltered: boolean;
  onChange: (patch: Partial<RequirementFilters>) => void;
  onReset: () => void;
}

/** Search and filter controls for the requirements list */
export function RequirementsToolbar({ filters, workItems, isFiltered, onChange, onReset }: RequirementsToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_14rem_12rem]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            aria-label="Search by material, work item or vendor"
            placeholder="Search material, work item or vendor"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className={`${inputBase} pl-9`}
          />
        </div>
        <select aria-label="Filter by work item" value={filters.taskId} onChange={(e) => onChange({ taskId: e.target.value })} className={inputBase}>
          <option value="">All work items</option>
          {workItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select aria-label="Filter by status" value={filters.status} onChange={(e) => onChange({ status: e.target.value as RequirementFilters["status"] })} className={inputBase}>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-stone-700">
          <input type="checkbox" checked={filters.pendingOnly} onChange={(e) => onChange({ pendingOnly: e.target.checked })} className="h-4 w-4 accent-stone-900" />
          Pending orders only
        </label>
        {isFiltered && (
          <button type="button" onClick={onReset} className="text-sm font-medium text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline">
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
