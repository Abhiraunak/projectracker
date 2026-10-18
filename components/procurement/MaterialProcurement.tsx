"use client";

import React, { useMemo } from "react";
import { FiPlus } from "react-icons/fi";
import { Heading } from "@/components/utilites/Label";
import { ConfirmDeleteDialog } from "@/components/utilites/Confirmdeletedialog"; // match your actual file name
import { describeError } from "@/lib/api";
import { todayLocal } from "@/lib/materials/format";
import { filterRequirements } from "@/lib/materials/procurement";
import type { WorkItemRef } from "@/lib/materials/types";
import { useDeleteRequirement, useRequirements } from "@/hooks/useRequirements";
import { useRequirementFilters } from "@/hooks/useRequirementFilters";
import { useDialogState } from "@/hooks/useDialogState";
import { QueryError } from "@/components/materials/QueryError";

import { OrderDialog } from "./OrderDialog";
import { ProcurementSummary } from "./ProcurementSummary";
import { RequirementDialog } from "./RequirementDialog";
import { RequirementList } from "./RequirementList";
import { RequirementsToolbar } from "./RequirementsToolbar";
import { buttonPrimary } from "../drawing/styles";

interface Props {
  projectId: string;
  workItems: WorkItemRef[];
}

/** Materials needed per work item, with their order status, vendor, expected delivery and pending orders */
export function MaterialProcurement({ projectId, workItems }: Props) {
  const requirements = useRequirements(projectId);
  const { filters, change, reset, isFiltered } = useRequirementFilters();
  const remove = useDeleteRequirement();
  const adding = useDialogState<true>();
  const editing = useDialogState<string>();
  const deleting = useDialogState<string>();
  const today = useMemo(todayLocal, []);

  const all = requirements.data ?? [];
  const visible = useMemo(() => filterRequirements(all, filters), [all, filters]);
  const editTarget = all.find((r) => r.id === editing.value) ?? null;
  const deleteTarget = all.find((r) => r.id === deleting.value) ?? null;

  const askToDelete = (id: string) => {
    remove.reset();
    deleting.open(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      deleting.close();
    } catch {
      /* shown in the dialog from remove.error */
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Heading>Material procurement</Heading>
          <p className="mt-1 text-sm text-stone-500">What each work item needs, what is ordered, and what is still on its way.</p>
        </div>
        <button type="button" onClick={() => adding.open(true)} className={buttonPrimary}>
          <FiPlus aria-hidden /> Add requirement
        </button>
      </header>

      {requirements.isPending && <div aria-busy="true" className="h-64 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />}
      {requirements.isError && <QueryError error={requirements.error} onRetry={() => requirements.refetch()} />}

      {requirements.data && (
        <>
          <ProcurementSummary requirements={all} today={today} />
          <RequirementsToolbar filters={filters} workItems={workItems} isFiltered={isFiltered} onChange={change} onReset={reset} />

          {all.length === 0 ? (
            <div className="rounded border border-dashed border-stone-300 px-6 py-12 text-center">
              <p className="font-semibold">No material requirements yet</p>
              <p className="mt-1 text-sm text-stone-500">Add what each work item needs. You can then track ordering and delivery.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded border border-dashed border-stone-300 px-6 py-12 text-center">
              <p className="font-semibold">Nothing matches these filters</p>
              <button type="button" onClick={reset} className="mt-2 text-sm font-medium underline">Clear filters</button>
            </div>
          ) : (
            <RequirementList items={visible} today={today} onEdit={editing.open} onDelete={askToDelete} />
          )}
        </>
      )}

      <RequirementDialog open={adding.isOpen} onClose={adding.close} projectId={projectId} workItems={workItems} />
      <OrderDialog requirement={editTarget} onClose={editing.close} />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onClose={deleting.close}
        onConfirm={confirmDelete}
        title="Delete requirement?"
        itemName={deleteTarget ? `${deleteTarget.material.name}, ${deleteTarget.task.name}` : undefined}
        confirmLabel="Delete requirement"
        pending={remove.isPending}
        error={remove.isError ? describeError(remove.error) : null}
      />
    </div>
  );
}
