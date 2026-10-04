"use client";

import React, { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { FiAlertCircle, FiArrowRight, FiPlus, FiTrash2, FiTrendingDown, FiTrendingUp } from "react-icons/fi";
import { Heading } from "@/components/utilites/Label";

/* -------------------------------------------------------------------------- */
/*  Public types (unchanged, so the page keeps working)                       */
/* -------------------------------------------------------------------------- */

export interface TaskInput {
  id: string;
  work: string;
  area: number | "";
  contractorRate: number | "";
  inHouseRate: number | "";
  progress: number | "";
  stipulated: number | "";
  paid: number | "";
  /** "YYYY-MM-DD". Optional so projects saved before dates existed still load. */
  startDate?: string;
  endDate?: string;
}

export interface ProjectData {
  title: string;
  tasks: TaskInput[];
}

interface LabourManagementFormProps {
  onSubmit: (data: ProjectData) => void;
  initialData?: ProjectData | null;
  submitting?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

// crypto.randomUUID only exists in secure contexts (https / localhost)
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const emptyTask = (): TaskInput => ({
  id: newId(),
  work: "",
  area: "",
  contractorRate: "",
  inHouseRate: "",
  progress: "",
  stipulated: "",
  paid: "",
  startDate: "",
  endDate: "",
});

const n = (v: number | "") => (v === "" ? 0 : v);
const rupees = (v: number) => `₹${Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

// Mobile: 44px tall and 16px text (stops iOS Safari zooming in on focus).
// sm+: the original compact size.
const inputBase =
  "min-h-11 w-full min-w-0 rounded border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 placeholder:text-stone-400 " +
  "focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20 " +
  "sm:min-h-0 sm:text-sm";

/**
 * Field widths inside the work-item grid.
 * Mobile grid has 2 columns: FULL spans both, HALF shares a line with its neighbour.
 * From sm up every field is a single cell (2 columns, then 3 at lg), as before.
 */
const FULL = "col-span-2 sm:col-span-1";
const HALF = "col-span-1";

/* -------------------------------------------------------------------------- */
/*  Small building blocks (same visual language as StatCards)                 */
/* -------------------------------------------------------------------------- */

const Pill = ({ trend, children }: { trend: "up" | "down"; children: React.ReactNode }) => (
  <span
    className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${trend === "up" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
  >
    {trend === "up" ? <FiTrendingUp aria-hidden /> : <FiTrendingDown aria-hidden />}
    {children}
  </span>
);

const SummaryCard = ({
  title,
  value,
  note,
  pill,
}: {
  title: string;
  value: string;
  note: string;
  pill?: React.ReactNode;
}) => (
  <div className="min-w-0 rounded border border-stone-300 bg-white p-3 sm:p-4">
    <div className="mb-3 flex items-start justify-between gap-2 sm:mb-6">
      <div className="min-w-0">
        <h3 className="mb-1 text-sm text-stone-500 sm:mb-2">{title}</h3>
        <p className="wrap-break-word text-2xl font-semibold tabular-nums lg:text-3xl">{value}</p>
      </div>
      {pill && <div className="shrink-0">{pill}</div>}
    </div>
    <p className="text-xs text-stone-500">{note}</p>
  </div>
);

type NumberFieldProps = {
  id: string;
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  prefix?: string;
  suffix?: string;
  max?: number;
  /** Grid placement (FULL / HALF) */
  className?: string;
};

const NumberField = ({ id, label, value, onChange, prefix, suffix, max, className = "" }: NumberFieldProps) => (
  <div className={`min-w-0 ${className}`}>
    <label htmlFor={id} className="mb-1.5 block text-sm text-stone-500">
      {label}
    </label>
    <div className="relative">
      {prefix && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-stone-400">
          {prefix}
        </span>
      )}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step="any"
        required
        value={value}
        // Keep "" when the field is cleared: Number("") would silently become 0
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className={`${inputBase} tabular-nums ${prefix ? "pl-7" : ""} ${suffix ? "pr-12" : ""}`}
      />
      {suffix && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-stone-400">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  One work item: memoised so typing in one row doesn't re-render the rest   */
/* -------------------------------------------------------------------------- */

type TaskRowProps = {
  task: TaskInput;
  index: number;
  canRemove: boolean;
  autoFocus: boolean;
  onChange: (id: string, patch: Partial<TaskInput>) => void;
  onRemove: (id: string) => void;
};

const TaskRow = memo(function TaskRow({ task, index, canRemove, autoFocus, onChange, onRemove }: TaskRowProps) {
  const uid = useId();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
    // only on mount: a freshly added row takes focus
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set =
    (field: "area" | "contractorRate" | "inHouseRate" | "progress" | "stipulated" | "paid") =>
      (value: number | "") =>
        onChange(task.id, { [field]: value });

  const hasRates = task.area !== "" && task.contractorRate !== "" && task.inHouseRate !== "";
  const saving = n(task.area) * (n(task.contractorRate) - n(task.inHouseRate));
  const hasBudget = task.stipulated !== "";
  const balance = n(task.stipulated) - n(task.paid);

  return (
    // min-w-0: a <fieldset> otherwise refuses to shrink below its content and can push the page sideways
    <fieldset className="min-w-0 rounded border border-stone-300 p-3 sm:p-4">
      <legend className="sr-only">Work item {index + 1}</legend>

      <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
        <div className="min-w-0">
          <p className="text-sm text-stone-500">Work item {index + 1}</p>
          <p className="truncate text-base font-semibold">{task.work.trim() || "Untitled"}</p>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(task.id)}
            aria-label={`Remove work item ${index + 1}`}
            // 44px tap target on phones (pulled into the corner so the row doesn't grow), compact from sm up
            className="-mr-1.5 -mt-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 active:bg-red-50 sm:m-0 sm:h-8 sm:w-8"
          >
            <FiTrash2 aria-hidden />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <div className="col-span-2 lg:col-span-1">
          <label htmlFor={`${uid}-work`} className="mb-1.5 block text-sm text-stone-500">
            Name of work
          </label>
          <input
            ref={nameRef}
            id={`${uid}-work`}
            type="text"
            required
            maxLength={120}
            value={task.work}
            onChange={(e) => onChange(task.id, { work: e.target.value })}
            placeholder="e.g. Reinforced concrete works"
            className={inputBase}
          />
        </div>

        <div className={`min-w-0 ${HALF}`}>
          <label htmlFor={`${uid}-start`} className="mb-1.5 block text-sm text-stone-500">
            Start date
          </label>
          <input
            id={`${uid}-start`}
            type="date"
            required
            value={task.startDate ?? ""}
            onChange={(e) => onChange(task.id, { startDate: e.target.value })}
            className={inputBase}
          />
        </div>
        <div className={`min-w-0 ${HALF}`}>
          <label htmlFor={`${uid}-end`} className="mb-1.5 block text-sm text-stone-500">
            End date
          </label>
          <input
            id={`${uid}-end`}
            type="date"
            required
            min={task.startDate || undefined}
            value={task.endDate ?? ""}
            onChange={(e) => onChange(task.id, { endDate: e.target.value })}
            className={inputBase}
          />
        </div>

        <NumberField className={FULL} id={`${uid}-area`} label="Total area" suffix="sqft" value={task.area} onChange={set("area")} />
        <NumberField className={FULL} id={`${uid}-cr`} label="Contractor rate" prefix="₹" suffix="/sqft" value={task.contractorRate} onChange={set("contractorRate")} />
        <NumberField className={FULL} id={`${uid}-ir`} label="In-house rate" prefix="₹" suffix="/sqft" value={task.inHouseRate} onChange={set("inHouseRate")} />
        <NumberField className={HALF} id={`${uid}-st`} label="Stipulated budget" prefix="₹" value={task.stipulated} onChange={set("stipulated")} />
        <NumberField className={HALF} id={`${uid}-pd`} label="Amount paid" prefix="₹" value={task.paid} onChange={set("paid")} />
        <NumberField className={FULL} id={`${uid}-pr`} label="Progress" suffix="%" max={100} value={task.progress} onChange={set("progress")} />
      </div>

      {(hasRates || hasBudget) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-200 pt-3 sm:mt-4 sm:pt-4">
          {hasRates && (
            <Pill trend={saving >= 0 ? "up" : "down"}>
              {saving >= 0 ? `In-house saves ${rupees(saving)}` : `In-house costs ${rupees(saving)} more`}
            </Pill>
          )}
          {hasBudget && (
            <Pill trend={balance >= 0 ? "up" : "down"}>
              {balance >= 0 ? `${rupees(balance)} left to pay` : `Overpaid by ${rupees(balance)}`}
            </Pill>
          )}
        </div>
      )}
    </fieldset>
  );
});

/* -------------------------------------------------------------------------- */
/*  Form                                                                      */
/* -------------------------------------------------------------------------- */

export function LabourManagementForm({ onSubmit, initialData, submitting = false }: LabourManagementFormProps) {
  const titleId = useId();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [tasks, setTasks] = useState<TaskInput[]>(() =>
    initialData?.tasks.length ? initialData.tasks : [emptyTask()]
  );
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stable callbacks (functional updates) so memoised rows really skip re-renders
  const handleChange = useCallback((id: string, patch: Partial<TaskInput>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const addTask = useCallback(() => {
    const task = emptyTask();
    setTasks((prev) => [...prev, task]);
    setLastAddedId(task.id);
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => (prev.length > 1 ? prev.filter((t) => t.id !== id) : prev));
  }, []);

  const totals = useMemo(() => {
    const stipulated = tasks.reduce((s, t) => s + n(t.stipulated), 0);
    const paid = tasks.reduce((s, t) => s + n(t.paid), 0);
    return { stipulated, paid, remaining: stipulated - paid, paidPct: stipulated ? Math.round((paid / stipulated) * 100) : 0 };
  }, [tasks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // `required` lets whitespace through, so check properly
    if (!title.trim() || tasks.some((t) => !t.work.trim())) {
      setError("Give the project and every work item a name before generating the dashboard.");
      return;
    }
    setError(null);
    onSubmit({
      title: title.trim(),
      tasks: tasks.map((t) => ({ ...t, work: t.work.trim() })),
    });
  };

  return (
    <div className="min-w-0 rounded border border-stone-300 bg-white p-3 sm:p-6">
      <div className="mb-4 border-b border-stone-200 pb-3 sm:mb-6 sm:pb-4">
        <Heading>{initialData ? "Edit labour dashboard" : "Generate labour dashboard"}</Heading>
        <p className="mt-1 text-sm text-stone-500">
          Add each work item with its rates, budget and progress. The comparison grid, Gantt chart and payment
          schedule are built from this.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        <div>
          <label htmlFor={titleId} className="mb-1.5 block text-sm text-stone-500">
            Project title
          </label>
          <input
            id={titleId}
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Phase 1 commercial complex"
            className={`${inputBase} text-base font-medium`}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4" aria-live="polite">
          <SummaryCard
            title="Stipulated budget"
            value={rupees(totals.stipulated)}
            note={`Across ${tasks.length} work ${tasks.length === 1 ? "item" : "items"}`}
          />
          <SummaryCard
            title="Paid"
            value={rupees(totals.paid)}
            note="Total released so far"
            pill={totals.stipulated > 0 ? <Pill trend="up">{totals.paidPct}% of budget</Pill> : undefined}
          />
          <SummaryCard
            title={totals.remaining < 0 ? "Over budget" : "Remaining"}
            value={rupees(totals.remaining)}
            note={totals.remaining < 0 ? "Paid exceeds the stipulated budget" : "Still to be paid"}
            pill={totals.remaining < 0 ? <Pill trend="down">Overpaid</Pill> : undefined}
          />
        </div>

        <section aria-label="Work items" className="space-y-3 sm:space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Work items</h3>

          {tasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              index={index}
              canRemove={tasks.length > 1}
              autoFocus={task.id === lastAddedId}
              onChange={handleChange}
              onRemove={removeTask}
            />
          ))}

          <button
            type="button"
            onClick={addTask}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded border border-dashed border-stone-300 py-3 text-sm font-medium text-stone-600 transition-colors hover:border-stone-500 hover:bg-stone-50 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 active:bg-stone-100"
          >
            <FiPlus aria-hidden /> Add work item
          </button>
        </section>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <FiAlertCircle aria-hidden className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        {/* Mobile: full-width submit button. sm+: right-aligned, as before */}
        <div className="flex border-t border-stone-200 pt-4 sm:justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 sm:w-auto"
          >
            {submitting ? "Saving..." : initialData ? "Save changes" : "Generate dashboard"}
            {!submitting && <FiArrowRight aria-hidden />}
          </button>
        </div>
      </form>
    </div>
  );
}