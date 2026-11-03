"use client";

import { useCallback, useState } from "react";
import type { KeyboardEvent } from "react";
import { useFormHistory } from "@/hooks/useFormHistory";
import type { AttendanceRecord } from "@/lib/attendanceApi";
import { emptyForm, fromRecord, newWorker, readyForNext, sameEveryDay, toOneDay, toSeveralDays, type AttendanceForm, type WorkerRow } from "@/lib/attendance/form";

/** Focus and select a field by id after React has drawn it */
const focusLater = (id: string) =>
  setTimeout(() => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    el?.focus();
    el?.select();
  }, 50);

/**
 * Everything the entry form does, without any of its looks: the values (with undo / redo), adding and removing
 * labourers, one day or several, editing a saved record, and moving through the rows with the keyboard.
 * The components only draw what this hands them.
 */
export function useAttendanceForm() {
  const { value: form, setValue, undo, redo, reset } = useFormHistory(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [multiDay, setMultiDay] = useState(false);
  const severalDays = multiDay && !editingId; // an existing entry is always one day

  const update = useCallback((patch: Partial<AttendanceForm>) => setValue((prev) => ({ ...prev, ...patch })), [setValue]);

  const addWorker = useCallback(
    (focus?: { index: number; field: string }) => {
      setValue((prev) => ({ ...prev, workers: [...prev.workers, newWorker(prev.workers.length + 1)] }));
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
      setMultiDay(false);
    },
    [reset]
  );
  const cancelEdit = () => {
    setEditingId(null);
    reset(emptyForm());
  };
  /** After saving: same contractor and rows, amounts cleared, undo history forgotten */
  const afterSave = () => {
    reset(readyForNext(form));
    setEditingId(null);
  };

  return {
    form,
    update,
    undo,
    redo,
    editingId,
    multiDay,
    severalDays,
    toggleMultiDay,
    addWorker,
    removeWorker,
    changeWorker,
    changeDayAmount,
    copyToEveryDay,
    navigate,
    startEdit,
    cancelEdit,
    afterSave,
  };
}

export type AttendanceFormApi = ReturnType<typeof useAttendanceForm>;
