"use client";

import { useCallback, useState } from "react";
import type { KeyboardEvent } from "react";
import { useFormHistory } from "@/hooks/useFormHistory";
import type { AttendanceBatch, AttendanceRecord } from "@/lib/attendanceApi";
import { emptyForm, fromBatch, fromRecord, newWorker, readyForNext, sameEveryDay, toOneDay, toSeveralDays, withPayMode, type AttendanceForm, type PayMode, type WorkerRow } from "@/lib/attendance/form";

/** Focus and select a field by id after React has drawn it */
const focusLater = (id: string) =>
  setTimeout(() => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    el?.focus();
    el?.select();
  }, 50);

/**
 * Everything the entry form does, without any of its looks: the values (with undo / redo), adding and removing
 * labourers, one day or several, editing a saved record (one day, or days saved together), and moving through the
 * rows with the keyboard.
 * The components only draw what this hands them.
 */
/** A new form starts on "Paid hourly", the sheet used most */
const startForm = () => withPayMode(emptyForm(), "hourly");

export function useAttendanceForm() {
  const { value: form, setValue, undo, redo, reset } = useFormHistory(startForm); // the hourly sheet first
  const [editingId, setEditingId] = useState<string | null>(null); // one saved day
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null); // days saved together
  const [multiDay, setMultiDay] = useState(false);
  const severalDays = multiDay && !editingId; // a single saved day stays one day; days saved together open as several
  const editing = editingId !== null || editingBatchId !== null;

  const update = useCallback((patch: Partial<AttendanceForm>) => setValue((prev) => ({ ...prev, ...patch })), [setValue]);

  const addWorker = useCallback(
    (focus?: { index: number; field: string }) => {
      setValue((prev) => ({ ...prev, workers: [...prev.workers, newWorker(prev.workers.length + 1, prev.payMode)] }));
      if (focus) focusLater(`worker-${focus.index}-${focus.field}`);
    },
    [setValue]
  );
  const removeWorker = useCallback((id: string) => setValue((prev) => ({ ...prev, workers: prev.workers.filter((w) => w.id !== id) })), [setValue]);
  const changeWorker = useCallback(
    (id: string, patch: Partial<WorkerRow>) => setValue((prev) => ({ ...prev, workers: prev.workers.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
    [setValue]
  );
  /** Several days: one labourer's amount on one day */
  const changeDayAmount = useCallback(
    (id: string, day: string, value: number | "") =>
      setValue((prev) => ({ ...prev, workers: prev.workers.map((w) => (w.id === id ? { ...w, amounts: { ...w.amounts, [day]: value } } : w)) })),
    [setValue]
  );
  const copyToEveryDay = useCallback((id: string) => setValue((prev) => sameEveryDay(prev, id)), [setValue]);
  /** Paid hourly: hours or overtime for one labourer, on one day (`day` null: a single-day entry) */
  const changeHours = useCallback(
    (id: string, day: string | null, field: "hours" | "ot", value: number | "") =>
      setValue((prev) => ({
        ...prev,
        workers: prev.workers.map((w) => {
          if (w.id !== id) return w;
          if (!day) return { ...w, [field]: value };
          return field === "hours" ? { ...w, hoursByDay: { ...w.hoursByDay, [day]: value } } : { ...w, otByDay: { ...w.otByDay, [day]: value } };
        }),
      })),
    [setValue]
  );
  /** "Paid monthly" (typed amounts) or "Paid hourly" (hours × rate) */
  const setPayMode = useCallback((mode: PayMode) => setValue((prev) => withPayMode(prev, mode)), [setValue]);
  /** Replace the labourer rows (filled from the team list) */
  const fillWorkers = useCallback((workers: WorkerRow[]) => setValue((prev) => ({ ...prev, workers })), [setValue]);

  const toggleMultiDay = () => {
    setValue(multiDay ? toOneDay : toSeveralDays);
    setMultiDay(!multiDay);
  };

  /**
   * Arrow keys / Enter move through the rows; Enter on the last row adds a new one.
   * `field` is "label", "amount", or "day-<n>" for a day's column when entering several days.
   */
  const navigate = (e: KeyboardEvent, index: number, field: string) => {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      const next = document.getElementById(`worker-${index + 1}-${field}`) as HTMLInputElement | null;
      if (next) {
        next.focus();
        next.select();
      } else if (e.key === "Enter" && index === form.workers.length - 1) {
        addWorker({ index: index + 1, field });
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = document.getElementById(`worker-${index - 1}-${field}`) as HTMLInputElement | null;
      prev?.focus();
      prev?.select();
    }
  };

  const startEdit = useCallback(
    (r: AttendanceRecord) => {
      reset(fromRecord(r));
      setEditingId(r.id);
      setEditingBatchId(null);
      setMultiDay(false);
    },
    [reset]
  );
  /** Days saved together: all of them open in the day grid, to change in one go */
  const startEditBatch = useCallback(
    (batch: AttendanceBatch) => {
      reset(fromBatch(batch));
      setEditingId(null);
      setEditingBatchId(batch.id);
      setMultiDay(true);
    },
    [reset]
  );
  const cancelEdit = () => {
    if (editingBatchId) setMultiDay(false);
    setEditingId(null);
    setEditingBatchId(null);
    reset(withPayMode(emptyForm(), form.payMode)); // stays on the pay mode in use
  };
  /** After saving: same contractor and rows, amounts cleared, undo history forgotten */
  const afterSave = () => {
    reset(readyForNext(form));
    if (editingBatchId) setMultiDay(false); // back to a normal new entry
    setEditingId(null);
    setEditingBatchId(null);
  };

  return {
    form,
    update,
    undo,
    redo,
    editingId,
    editingBatchId,
    editing,
    multiDay,
    severalDays,
    toggleMultiDay,
    addWorker,
    removeWorker,
    changeWorker,
    changeDayAmount,
    copyToEveryDay,
    changeHours,
    setPayMode,
    fillWorkers,
    navigate,
    startEdit,
    startEditBatch,
    cancelEdit,
    afterSave,
  };
}

export type AttendanceFormApi = ReturnType<typeof useAttendanceForm>;