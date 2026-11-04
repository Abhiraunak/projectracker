"use client";

import { useEffect, useRef } from "react";
import { useDebounced } from "@/hooks/useDebounced";
import { useTeam } from "@/hooks/useAttendance";
import { fromTeam, untouched } from "@/lib/attendance/form";
import type { AttendanceFormApi } from "./useAttendanceForm";

/**
 * Paid hourly: once the contractor is known, their team fills the labourer rows (names and day rates), as long as
 * no hours were typed yet. Happens once per contractor, so clearing the hours later doesn't refill the rows.
 * Returns the team, for the Team button.
 */
export function useTeamPrefill(api: AttendanceFormApi, projectId: string) {
  const { form, editing, fillWorkers } = api;
  const hourly = form.payMode === "hourly";
  const contractor = useDebounced(form.contractorName.trim(), 400);
  const team = useTeam(projectId, hourly ? contractor : "");
  const filledFor = useRef(""); // only read and written in effects

  useEffect(() => {
    if (!hourly) filledFor.current = "";
  }, [hourly]);

  useEffect(() => {
    if (!hourly || editing || !team.data) return;
    const key = contractor.toLowerCase();
    if (!key || filledFor.current === key) return;
    filledFor.current = key;
    const rows = fromTeam(team.data.members);
    if (rows.length > 0 && untouched(form.workers)) fillWorkers(rows);
    // form.workers: read for the check only; filledFor stops a refill on every keystroke
  }, [hourly, editing, team.data, contractor, fillWorkers, form.workers]);

  return team.data?.members;
}
