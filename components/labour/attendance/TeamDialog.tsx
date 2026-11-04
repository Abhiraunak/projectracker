"use client";

import { useState } from "react";
import { FiPlus } from "react-icons/fi";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { useSaveTeam } from "@/hooks/useAttendance";
import { describeError } from "@/lib/api";
import type { TeamMember } from "@/lib/attendanceApi";
import { newId, payFor, rupees, STANDARD_HOURS, toInput } from "@/lib/attendance/form";

interface Row {
  key: string;
  id?: string;
  name: string;
  dayRate: number | "";
  active: boolean;
}

const box = "h-10 w-full rounded border border-stone-300 bg-white px-2 text-sm focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20";

/**
 * A contractor's team for hourly attendance: each labourer's name and day rate (for 8 hours), and who has left.
 * Someone who left stays listed (their past days keep their name); tick them back if they return.
 */
export function TeamDialog({
  projectId,
  contractorName,
  members,
  onClose,
  onSaved,
}: {
  projectId: string;
  contractorName: string;
  members: TeamMember[];
  onClose: () => void;
  onSaved: (members: TeamMember[]) => void;
}) {
  const save = useSaveTeam();
  const [rows, setRows] = useState<Row[]>(() =>
    members.length ? members.map((m) => ({ key: m.id, id: m.id, name: m.name, dayRate: m.dayRate, active: m.active })) : [{ key: newId(), name: "", dayRate: "", active: true }]
  );
  const [problem, setProblem] = useState<string | null>(null);

  const change = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = () => {
    const key = newId();
    setRows((rs) => [...rs, { key, name: "", dayRate: "", active: true }]);
    setTimeout(() => document.getElementById(`team-${key}-name`)?.focus(), 30);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filled = rows.filter((r) => r.name.trim());
    const noRate = filled.find((r) => r.dayRate === "" || Number(r.dayRate) <= 0);
    if (noRate) {
      setProblem(`Enter the day rate for ${noRate.name.trim()}.`);
      document.getElementById(`team-${noRate.key}-rate`)?.focus();
      return;
    }
    const names = filled.map((r) => r.name.trim().toLowerCase());
    const twice = names.find((n, i) => names.indexOf(n) !== i);
    if (twice) {
      setProblem(`${filled.find((r) => r.name.trim().toLowerCase() === twice)!.name.trim()} is on the list twice.`);
      return;
    }
    setProblem(null);
    try {
      const team = await save.mutateAsync({
        projectId,
        contractorName,
        members: filled.map((r) => ({ id: r.id, name: r.name.trim(), dayRate: Number(r.dayRate), active: r.active })),
      });
      onSaved(team.members);
      onClose();
    } catch {
      /* shown below */
    }
  };

  const working = rows.filter((r) => r.active && r.name.trim()).length;

  return (
    <ModalDialog open onClose={onClose} label={`${contractorName}'s team`} size="lg" locked={save.isPending}>
      <DialogHeader title={`${contractorName}'s team`} subtitle={`${working} working · day rate is for ${STANDARD_HOURS} hours; OT is paid at the same hourly rate`} onClose={onClose} locked={save.isPending} />
      <form onSubmit={submit} className="space-y-3 p-4 sm:p-5">
        <div className="hidden grid-cols-[minmax(0,1fr)_8rem_6.5rem_5.5rem] gap-2 px-1 text-xs font-medium text-stone-500 sm:grid">
          <span>Name</span>
          <span className="text-right">Rate / day</span>
          <span className="text-right">Per hour</span>
          <span className="text-center">Working</span>
        </div>
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.key} className={`grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-2 rounded-lg border border-stone-200 p-2 sm:grid-cols-[minmax(0,1fr)_8rem_6.5rem_5.5rem] sm:border-0 sm:p-0 ${r.active ? "" : "opacity-60"}`}>
              <input
                id={`team-${r.key}-name`}
                value={r.name}
                onChange={(e) => change(r.key, { name: e.target.value })}
                maxLength={40}
                placeholder="Name"
                aria-label={`Labourer ${i + 1} name`}
                className={`${box} font-medium`}
              />
              <input
                id={`team-${r.key}-rate`}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={r.dayRate}
                onChange={(e) => change(r.key, { dayRate: toInput(e.target.value) })}
                placeholder="₹ / day"
                aria-label={`${r.name.trim() || `Labourer ${i + 1}`}: rate for ${STANDARD_HOURS} hours`}
                className={`${box} text-right tabular-nums`}
              />
              <span className="text-xs tabular-nums text-stone-500 sm:text-right sm:text-sm">
                {r.dayRate !== "" && Number(r.dayRate) > 0 ? `${rupees(payFor(1, 0, Number(r.dayRate)))} / h` : <span className="text-stone-300">–</span>}
              </span>
              <label className="flex cursor-pointer items-center justify-end gap-2 text-xs text-stone-600 sm:justify-center">
                <input type="checkbox" checked={r.active} onChange={(e) => change(r.key, { active: e.target.checked })} className="h-4 w-4 accent-stone-900" />
                <span>{r.active ? "Working" : "Left"}</span>
              </label>
            </li>
          ))}
        </ul>
        <button type="button" onClick={add} className="flex min-h-10 items-center gap-1 rounded px-1 text-sm font-medium text-stone-700 hover:text-stone-900">
          <FiPlus aria-hidden /> Add labourer
        </button>

        {(problem || save.isError) && (
          <p role="alert" className="text-sm text-red-700">
            {problem ?? describeError(save.error)}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-stone-200 pt-3">
          <button type="button" onClick={onClose} disabled={save.isPending} className="min-h-10 rounded px-4 text-sm font-medium text-stone-600 hover:bg-stone-100">
            Cancel
          </button>
          <button type="submit" disabled={save.isPending} className="min-h-10 rounded bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60">
            {save.isPending ? "Saving…" : "Save team"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}