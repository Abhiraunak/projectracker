"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { OpenSheet } from "@/lib/attendanceApi";
import type { FormEvent } from "react";
import { useEditorShortcuts } from "@/hooks/useEditorShortcuts";
import { useAttendanceTrades, useSaveAttendance, useSaveAttendanceDays, useSaveSheet } from "@/hooks/useAttendance";
import { describeError } from "@/lib/api";
import { checkForm, DEFAULT_TRADES, formTotal, savedManyNote, toManyPayload, toPayload } from "@/lib/attendance/form";
import { printWithTitle } from "@/lib/print";
import { AttendanceHeader } from "./attendance/AttendanceHeader";
import { EntryForm } from "./attendance/EntryForm";
import { PrintSlip } from "./attendance/PrintSlip";
import { RegistersPanel } from "./attendance/RegistersPanel";
import { useAttendanceForm } from "./attendance/useAttendanceForm";
import { useTeamPrefill } from "./attendance/useTeamPrefill";
import { MonthSheet } from "./attendance/MonthSheet";
import { WorkItemPicker, workLabel, type PickedWorkItem } from "./attendance/WorkItemPicker";

/**
 * Labour attendance for one project: first the work item (Flooring, Plastering… or General), then the entry form and
 * saved records as before. No trades: attendance is by contractor; the work item rides along with every save.
 * This file only puts the parts together; each part lives in ./attendance and the rules in lib/attendance/form.ts.
 */
export function AttendanceManager({
  projectId,
  showMonth = true,
  showRecords = true,
  openerRef,
}: {
  projectId: string;
  /** false: the month sheet has its own tab */
  showMonth?: boolean;
  /** false: saved records have their own tab, which opens sheets here through `openerRef` */
  showRecords?: boolean;
  openerRef?: MutableRefObject<((sheet: OpenSheet) => void) | null>;
}) {
  const api = useAttendanceForm();
  const { form, severalDays, editingId, editingBatchId } = api;

  const trades = useAttendanceTrades(projectId);
  const team = useTeamPrefill(api, projectId); // paid hourly: the contractor's team fills the rows
  const save = useSaveAttendance();
  const saveDays = useSaveAttendanceDays();
  const saveSheet = useSaveSheet();
  const saving = save.isPending || saveDays.isPending || saveSheet.isPending;

  const [printTitle, setPrintTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0); // tells the records list to show page 1 again
  const submitRef = useRef<HTMLButtonElement>(null);
  // The work item being marked; null = not picked yet, so the picker shows
  const [workItem, setWorkItem] = useState<PickedWorkItem | null>(null);

  // Open a contractor's sheet in the form (from the records below, or from the Saved attendance tab)
  const openSheet = (open: OpenSheet) => {
    api.startSheet(open);
    setWorkItem({ taskId: open.taskId ?? null, work: workLabel(open) }); // the sheet's own work item
    setSavedNote(null);
    setError(null);
    setTimeout(() => document.getElementById("labour-details")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  useEffect(() => {
    if (openerRef) openerRef.current = openSheet;
  });

  useEditorShortcuts({ undo: api.undo, redo: api.redo, save: () => submitRef.current?.click(), enabled: true });

  const total = formTotal(form, severalDays);
  // A title typed by the user wins; otherwise "Payment details: <contractor name>"
  const contractor = form.contractorName.trim();
  const forWork = workItem ? ` · ${workItem.work}` : "";
  const defaultTitle = contractor ? `Payment details: ${contractor}${forWork}` : `Payment details${forWork}`;
  const slipTitle = printTitle.trim() || defaultTitle;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = checkForm(form, severalDays);
    if (problem) {
      setError(problem.message);
      if (problem.focus) document.getElementById(problem.focus)?.focus();
      return;
    }
    setError(null);
    setSavedNote(null);
    try {
      if (api.sheet) {
        // A contractor's open sheet: its open days are replaced by the days as edited
        const result = await saveSheet.mutateAsync({ ...toManyPayload(form, projectId), taskId: workItem?.taskId ?? null, replaceIds: api.sheet.ids });
        setSavedNote(`Saved ${form.contractorName.trim()}'s sheet: ${result.count} open ${result.count === 1 ? "day" : "days"}.`);
      } else if (severalDays) {
        const result = await saveDays.mutateAsync({ batchId: editingBatchId ?? undefined, data: { ...toManyPayload(form, projectId), taskId: workItem?.taskId ?? null } });
        setSavedNote(savedManyNote(result.count, form, editingBatchId !== null));
      } else {
        await save.mutateAsync({ id: editingId ?? undefined, data: { ...toPayload(form, projectId), taskId: workItem?.taskId ?? null } });
      }
    } catch (err) {
      setError(describeError(err));
      return;
    }
    api.afterSave();
    setPrintTitle("");
    setSavedCount((n) => n + 1);
    document.getElementById("contractorNameInput")?.focus();
  };

  const cancelEdit = () => {
    api.cancelEdit();
    setError(null);
    setPrintTitle("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {workItem === null ? (
        <WorkItemPicker projectId={projectId} onPick={setWorkItem} />
      ) : (
        <>
          {/* The work item on top; Change goes back to the list (what is typed in the sheet stays) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-stone-500">Work item</span>
            <span className="rounded-full bg-stone-900 px-3 py-1 text-sm font-semibold text-white">{workItem.work}</span>
            <button type="button" onClick={() => setWorkItem(null)} disabled={saving} className="rounded-lg border border-stone-300 px-3 py-1 text-sm font-medium text-stone-800 hover:border-stone-900 disabled:opacity-50">
              Change
            </button>
          </div>
          <PrintSlip title={slipTitle} form={form} total={total} days={severalDays ? form.days : null} />
          <AttendanceHeader printTitle={printTitle} onPrintTitle={setPrintTitle} defaultTitle={defaultTitle} onPrint={() => printWithTitle(slipTitle)} />

          <EntryForm
            api={api}
            projectId={projectId}
            team={team}
            choices={trades.data?.choices ?? DEFAULT_TRADES}
            usual={trades.data?.usual}
            total={total}
            saving={saving}
            error={error}
            savedNote={savedNote}
            submitRef={submitRef}
            tradeStorageKey={`attendance-trades:${projectId}`}
            onSubmit={handleSubmit}
            onCancelEdit={cancelEdit}
          />
        </>
      )}

      {showRecords && <RegistersPanel key={savedCount} projectId={projectId} onOpen={openSheet} />}

      {showMonth && <MonthSheet projectId={projectId} />}
    </div>
  );
}