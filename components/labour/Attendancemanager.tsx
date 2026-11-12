"use client";

import { useCallback, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useEditorShortcuts } from "@/hooks/useEditorShortcuts";
import { useAttendanceTrades, useSaveAttendance, useSaveAttendanceDays } from "@/hooks/useAttendance";
import { describeError } from "@/lib/api";
import type { AttendanceListItem } from "@/lib/attendanceApi";
import { checkForm, DEFAULT_TRADES, formTotal, savedManyNote, toManyPayload, toPayload } from "@/lib/attendance/form";
import { printWithTitle } from "@/lib/print";
import { AttendanceHeader } from "./attendance/AttendanceHeader";
import { EntryForm } from "./attendance/EntryForm";
import { PrintSlip } from "./attendance/PrintSlip";
import { RecordsPanel } from "./attendance/RecordsPanel";
import { useAttendanceForm } from "./attendance/useAttendanceForm";
import { useTeamPrefill } from "./attendance/useTeamPrefill";
import { MonthSheet } from "./attendance/MonthSheet";

/**
 * Labour attendance for one project: the entry form and saved records. No trades: attendance is by contractor.
 * This file only puts the parts together; each part lives in ./attendance and the rules in lib/attendance/form.ts.
 */
export function AttendanceManager({ projectId, showMonth = true }: { projectId: string; /** false: the month sheet has its own tab */ showMonth?: boolean }) {
  const api = useAttendanceForm();
  const { form, severalDays, editingId, editingBatchId } = api;

  const trades = useAttendanceTrades(projectId);
  const team = useTeamPrefill(api, projectId); // paid hourly: the contractor's team fills the rows
  const save = useSaveAttendance();
  const saveDays = useSaveAttendanceDays();
  const saving = save.isPending || saveDays.isPending;

  const [printTitle, setPrintTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0); // tells the records list to show page 1 again
  const submitRef = useRef<HTMLButtonElement>(null);

  useEditorShortcuts({ undo: api.undo, redo: api.redo, save: () => submitRef.current?.click(), enabled: true });

  const total = formTotal(form, severalDays);
  // A title typed by the user wins; otherwise "Payment details: <contractor name>"
  const contractor = form.contractorName.trim();
  const defaultTitle = contractor ? `Payment details: ${contractor}` : "Payment details";
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
      if (severalDays) {
        const result = await saveDays.mutateAsync({ batchId: editingBatchId ?? undefined, data: toManyPayload(form, projectId) });
        setSavedNote(savedManyNote(result.count, form, editingBatchId !== null));
      } else {
        await save.mutateAsync({ id: editingId ?? undefined, data: toPayload(form, projectId) });
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

  // Days saved together open together, in the day grid; a single day opens on its own
  const startEdit = useCallback(
    (r: AttendanceListItem) => {
      if (r.batch && r.batch.days.length > 0) api.startEditBatch(r.batch);
      else api.startEdit(r);
      setSavedNote(null);
      setError(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api.startEdit, api.startEditBatch]
  );

  // "Next day" on a saved row: the same register, the next day added, ready to mark
  const nextDay = useCallback(
    (r: AttendanceListItem) => {
      api.continueNextDay(r);
      setSavedNote(null);
      setError(null);
      setTimeout(() => document.getElementById("labour-details")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api.continueNextDay]
  );

  const cancelEdit = () => {
    api.cancelEdit();
    setError(null);
    setPrintTitle("");
  };

  const onDeleted = (id: string) => {
    if (editingId === id || editingBatchId === id) cancelEdit();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
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

      <RecordsPanel projectId={projectId} onClearTrade={() => { }} onEdit={startEdit} onNextDay={nextDay} onDeleted={onDeleted} resetKey={savedCount} />

      {showMonth && <MonthSheet projectId={projectId} />}
    </div>
  );
}