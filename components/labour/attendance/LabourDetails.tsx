"use client";

import { FiPlus, FiUsers } from "react-icons/fi";
import type { AttendanceFormApi } from "./useAttendanceForm";
import { DayAmountsGrid } from "./DayAmountsGrid";
import { WorkerRows } from "./WorkerRows";

/** The labourers: one amount each for one day, or a grid of amounts when entering several days */
export function LabourDetails({ api }: { api: AttendanceFormApi }) {
  const { form, severalDays } = api;
  return (
    <fieldset className="rounded border border-stone-300 p-4">
      <legend className="sr-only">Labour details</legend>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <FiUsers aria-hidden className="text-stone-500" /> Labour details
        </h3>
        <button
          type="button"
          onClick={() => api.addWorker({ index: form.workers.length, field: "label" })}
          className="flex items-center gap-1 rounded px-1 text-sm font-medium text-stone-700 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
        >
          <FiPlus aria-hidden /> Add labourer
        </button>
      </div>

      {severalDays ? (
        <DayAmountsGrid
          days={form.days}
          workers={form.workers}
          extras={form.extras}
          onLabel={(id, label) => api.changeWorker(id, { label })}
          onAmount={api.changeDayAmount}
          onSameEveryDay={api.copyToEveryDay}
          onRemove={api.removeWorker}
          onNavigate={api.navigate}
        />
      ) : (
        <WorkerRows
          workers={form.workers}
          onLabel={(id, label) => api.changeWorker(id, { label })}
          onAmount={(id, amount) => api.changeWorker(id, { amount })}
          onRemove={api.removeWorker}
          onNavigate={api.navigate}
        />
      )}
    </fieldset>
  );
}
