"use client";

import { useState } from "react";
import { FiPlus, FiUsers } from "react-icons/fi";
import type { TeamMember } from "@/lib/attendanceApi";
import { byHours, mergeTeam } from "@/lib/attendance/form";
import type { AttendanceFormApi } from "./useAttendanceForm";
import { DayAmountsGrid } from "./DayAmountsGrid";
import { DayGrid } from "./DayGrid";
import { HourlyGrid } from "./HourlyGrid";
import { TeamDialog } from "./TeamDialog";
import { WorkerRows } from "./WorkerRows";

/**
 * The labourers. Paid monthly: one amount each for one day, or a grid of amounts when entering several days.
 * Paid hourly: the contractor's team with their day rates, and hours + OT for each day.
 */
export function LabourDetails({ api, projectId, team }: { api: AttendanceFormApi; projectId: string; team?: TeamMember[] }) {
  const { form, severalDays } = api;
  const hourly = byHours(form.payMode); // paid hourly or by day: the team, rates and hours
  const daily = form.payMode === "daily";
  const contractor = form.contractorName.trim();
  const [teamOpen, setTeamOpen] = useState(false);
  const working = team?.filter((m) => m.active).length ?? 0;

  return (
    <fieldset id="labour-details" className="min-w-0 scroll-mt-20 rounded border border-stone-300 p-4">
      <legend className="sr-only">Labour details</legend>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <FiUsers aria-hidden className="text-stone-500" /> Labour details
          {hourly && <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-700">{daily ? "Days present × day rate" : "Hours × rate per hour"}</span>}
        </h3>
        <div className="flex items-center gap-3">
          {hourly && (
            <button
              type="button"
              onClick={() => setTeamOpen(true)}
              disabled={!contractor}
              title={contractor ? undefined : "Enter the contractor first"}
              className="flex items-center gap-1 rounded px-1 text-sm font-medium text-stone-700 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:text-stone-400"
            >
              <FiUsers aria-hidden /> Team{working ? ` (${working})` : ""}
            </button>
          )}
          <button
            type="button"
            onClick={() => api.addWorker({ index: form.workers.length, field: "label" })}
            className="flex items-center gap-1 rounded px-1 text-sm font-medium text-stone-700 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <FiPlus aria-hidden /> Add labourer
          </button>
        </div>
      </div>

      {daily ? (
        <>
          <DayGrid
            days={severalDays ? form.days : null}
            date={form.date}
            workers={form.workers}
            extras={form.extras}
            onLabel={(id, label) => api.changeWorker(id, { label })}
            onRate={(id, dayRate) => api.changeWorker(id, { dayRate })}
            onHours={api.changeHours}
            onSameEveryDay={api.copyToEveryDay}
            onRemove={api.removeWorker}
            onChangeWorker={api.changeWorker}
            onNavigate={api.navigate}
          />
          <p className="mt-3 text-xs text-stone-500">Tap a day to mark present; leave it on A when absent. Paid extra or a different rate one day? Use the sliders button beside the labourer. New names and changed rates are saved to {contractor ? `${contractor}'s` : "the contractor's"} team.</p>
        </>
      ) : hourly ? (
        <>
          <HourlyGrid
            days={severalDays ? form.days : null}
            date={form.date}
            workers={form.workers}
            extras={form.extras}
            onLabel={(id, label) => api.changeWorker(id, { label })}
            onRate={(id, dayRate) => api.changeWorker(id, { dayRate })}
            onHours={api.changeHours}
            onSameEveryDay={api.copyToEveryDay}
            onRemove={api.removeWorker}
            onChangeWorker={api.changeWorker}
            onNavigate={api.navigate}
          />
          <p className="mt-3 text-xs text-stone-500">
            Leave a day blank when someone was absent. Paid extra or a different rate one day? Use the sliders button beside the labourer. New names and changed rates are saved to {contractor ? `${contractor}'s` : "the contractor's"} team.
          </p>
        </>
      ) : severalDays ? (
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

      {teamOpen && contractor && (
        <TeamDialog
          projectId={projectId}
          contractorName={contractor}
          members={team ?? []}
          onClose={() => setTeamOpen(false)}
          onSaved={(members) => api.fillWorkers(mergeTeam(form.workers, members))}
        />
      )}
    </fieldset>
  );
}