"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { FiCalendar, FiCheck, FiCopy, FiEdit2, FiPlus, FiUserPlus, FiX } from "react-icons/fi";
import { useAddWork, useDay, useLabourRefresh, usePeople, useRecords, useRenameWork, useWorks } from "@/hooks/useLabourSimple";
import { describeError } from "@/lib/api";
import { labourSimpleApi, type Day, type Worker } from "@/lib/labour/simple";
import { SectionError, SectionSkeleton } from "../../ui";
import { CopyDays } from "./CopyDays";
import { PickList } from "./PickList";
import { field, label, longDay, mondayOf, money, mono, num, r2, shortDay, todayYmd, txt } from "./shared";

/**
 * Attendance on one line: the date, the contractor and the work (or + Add a new one), then each worker's hours,
 * OT hours, ₹ per hour and ₹ per OT hour. Saved as you type; any date, past or future, can be opened and changed. Below: every
 * day saved for the work between two dates.
 */
export function AttendanceTab({ projectId }: { projectId: string }) {
  const works = useWorks(projectId);
  const people = usePeople(projectId);
  const memory = `labour:${projectId}`; // the last work and contractor used, so the tab opens where you left it
  const [pickedTask, setTaskId] = useState<string | null>(() => readMemory(memory).taskId ?? null);
  const [pickedContractor, setContractor] = useState<string>(() => readMemory(memory).contractor ?? "");
  const [date, setDate] = useState(todayYmd());
  // Worked out, not stored: a work that was removed means General; no contractor yet means the first on the list
  const taskId = pickedTask && works.data?.items.some((w) => w.id === pickedTask) ? pickedTask : null;
  const contractor = pickedContractor || people.data?.contractors[0] || "";

  useEffect(() => writeMemory(memory, { taskId, contractor }), [memory, taskId, contractor]); // remembered in the browser

  if (works.isPending || people.isPending) return <SectionSkeleton />;
  if (works.isError) return <SectionError error={works.error} onRetry={() => void works.refetch()} />;
  if (people.isError) return <SectionError error={people.error} onRetry={() => void people.refetch()} />;
  const workTitle = taskId ? (works.data.items.find((w) => w.id === taskId)?.title ?? "") : "General";

  return (
    <div className="space-y-4">
      <Toolbar
        projectId={projectId}
        date={date}
        onDate={setDate}
        contractor={contractor}
        onContractor={setContractor}
        contractors={people.data.contractors}
        works={works.data.items}
        taskId={taskId}
        onWork={setTaskId}
      />
      {contractor ? (
        <CrewStep key={`${date}|${contractor.toLowerCase()}|${taskId ?? ""}`} projectId={projectId} taskId={taskId} workTitle={workTitle} date={date} contractor={contractor} />
      ) : (
        <p className={`${mono.card} px-5 py-8 text-center text-sm text-[#666666]`}>Use New next to Contractor to add the first contractor, then mark attendance.</p>
      )}
      <Records projectId={projectId} taskId={taskId} workTitle={workTitle} onOpen={(d, c) => (setDate(d), setContractor(c))} />
    </div>
  );
}

function readMemory(key: string): { taskId?: string | null; contractor?: string } {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}");
  } catch {
    return {};
  }
}
function writeMemory(key: string, v: { taskId: string | null; contractor: string }) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode: nothing to remember */
  }
}

/* ------------------------------------------------ date, contractor, work ------------------------------------------------ */

const chip = (on: boolean) =>
  `inline-flex min-h-9 items-center gap-1 rounded-full border px-3.5 text-sm ${mono.motion} ${mono.ring} ${on ? "border-[#111111] bg-[#111111] font-semibold text-white" : "border-[#DADAD7] bg-white text-[#111111] hover:border-[#8C8C8C]"
  }`;

function Toolbar({
  projectId,
  date,
  onDate,
  contractor,
  onContractor,
  contractors,
  works,
  taskId,
  onWork,
}: {
  projectId: string;
  date: string;
  onDate: (d: string) => void;
  contractor: string;
  onContractor: (c: string) => void;
  contractors: string[];
  works: { id: string; title: string; cost: number }[];
  taskId: string | null;
  onWork: (id: string | null) => void;
}) {
  const add = useAddWork(projectId);
  const rename = useRenameWork(projectId);
  const [newContractor, setNewContractor] = useState<string | null>(null); // typing a new contractor's name
  const [newWork, setNewWork] = useState<string | null>(null); // typing a new work
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const list = contractor && !contractors.some((c) => c.toLowerCase() === contractor.toLowerCase()) ? [contractor, ...contractors] : contractors;

  const pickNewContractor = () => {
    if (!newContractor?.trim()) return;
    onContractor(newContractor.trim());
    setNewContractor(null);
  };
  const addWork = () => {
    if (!newWork?.trim()) return;
    add.mutate(newWork.trim(), { onSuccess: (r) => (onWork(r.item.id), setNewWork(null)) });
  };
  const saveRename = () => renaming?.title.trim() && rename.mutate({ id: renaming.id, title: renaming.title.trim() }, { onSuccess: () => setRenaming(null) });

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <label className={label}>
        Date
        <input type="date" value={date} onChange={(e) => e.target.value && onDate(e.target.value)} className={`${field} h-11 w-44 text-base`} />
      </label>

      <div className={label}>
        <span>Contractor</span>
        {newContractor !== null ? (
          <span className="flex items-center gap-1.5">
            <input value={newContractor} onChange={(e) => setNewContractor(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pickNewContractor()} autoFocus maxLength={120} placeholder="Contractor's name" aria-label="New contractor" className={`${field} h-11 w-52 text-base`} />
            <button type="button" onClick={pickNewContractor} className={`${mono.primary} min-h-11 px-3 text-sm`}>
              Use
            </button>
            <button type="button" onClick={() => setNewContractor(null)} className={mono.icon} aria-label="Cancel">
              <FiX aria-hidden />
            </button>
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <PickList value={contractor} options={list} onChange={onContractor} label="Contractor" placeholder="No contractor yet" className="w-52" />
            <button type="button" onClick={() => setNewContractor("")} className={`${mono.secondary} min-h-11 px-3 text-sm`} title="Add a new contractor">
              <FiUserPlus aria-hidden /> New
            </button>
          </span>
        )}
      </div>

      <div className={`${label} min-w-0 flex-1`}>
        <span>Work</span>
        <span className="flex flex-wrap items-center gap-1.5">
          {works.map((w) =>
            renaming?.id === w.id ? (
              <span key={w.id} className="flex items-center gap-1">
                <input value={renaming.title} onChange={(e) => setRenaming({ id: w.id, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && saveRename()} autoFocus maxLength={120} aria-label="New name" className={`${field} h-9 w-36`} />
                <button type="button" onClick={saveRename} className={mono.icon} aria-label="Save the name">
                  <FiCheck aria-hidden />
                </button>
                <button type="button" onClick={() => setRenaming(null)} className={mono.icon} aria-label="Cancel">
                  <FiX aria-hidden />
                </button>
              </span>
            ) : (
              <button
                key={w.id}
                type="button"
                onClick={() => (taskId === w.id ? setRenaming({ id: w.id, title: w.title }) : onWork(w.id))}
                aria-pressed={taskId === w.id}
                title={taskId === w.id ? "Tap again to rename" : w.cost ? `${money(w.cost)} so far` : undefined}
                className={chip(taskId === w.id)}
              >
                {w.title}
                {taskId === w.id && <FiEdit2 aria-hidden className="text-[11px] opacity-70" />}
              </button>
            ),
          )}
          <button type="button" onClick={() => onWork(null)} aria-pressed={taskId === null} className={chip(taskId === null)}>
            General
          </button>
          {newWork !== null ? (
            <span className="flex items-center gap-1">
              <input value={newWork} onChange={(e) => setNewWork(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addWork()} autoFocus maxLength={120} placeholder="e.g. Waterproofing" aria-label="New work" className={`${field} h-9 w-40`} />
              <button type="button" onClick={addWork} disabled={add.isPending} className={`${mono.primary} min-h-9 px-3 text-sm`}>
                {add.isPending ? "Adding…" : "Add"}
              </button>
              <button type="button" onClick={() => setNewWork(null)} className={mono.icon} aria-label="Cancel">
                <FiX aria-hidden />
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setNewWork("")} className={`${chip(false)} border-dashed text-[#185FA5]`}>
              <FiPlus aria-hidden /> Add
            </button>
          )}
        </span>
      </div>
      {(add.isError || rename.isError) && <p role="alert" className="w-full text-sm text-[#B3261E]">{describeError(add.error ?? rename.error)}</p>}
    </div>
  );
}

/* ------------------------------------------------ 3 · the crew ------------------------------------------------ */

type Row = { key: string; name: string; hours: string; otHours: string; rate: string; otRate: string; fixed: number | null };
let seq = 0;
const nextKey = () => `w${++seq}`;
const toRow = (w: Worker): Row => ({ key: nextKey(), name: w.name, hours: txt(w.hours), otHours: txt(w.otHours), rate: txt(w.rate), otRate: txt(w.otRate), fixed: w.fixed });
const payOf = (r: Row) => {
  const h = num(r.hours),
    o = num(r.otHours),
    rt = num(r.rate),
    ort = num(r.otRate);
  if (r.fixed !== null && h === 0 && o === 0 && rt === 0) return r.fixed;
  return r2(h * rt + o * ort);
};

function CrewStep({ projectId, taskId, workTitle, date, contractor }: { projectId: string; taskId: string | null; workTitle: string; date: string; contractor: string }) {
  const day = useDay(projectId, date, contractor, taskId);
  if (day.isPending) return <SectionSkeleton />;
  if (day.isError) return <SectionError error={day.error} onRetry={() => void day.refetch()} />;
  return <Crew projectId={projectId} taskId={taskId} workTitle={workTitle} date={date} contractor={contractor} day={day.data} />;
}

function Crew({ projectId, taskId, workTitle, date, contractor, day }: { projectId: string; taskId: string | null; workTitle: string; date: string; contractor: string; day: Day }) {
  const refresh = useLabourRefresh(projectId);
  const chain = useRef<Promise<void>>(Promise.resolve()); // one save at a time, in order
  const [rows, setRows] = useState<Row[]>(() => day.workers.map(toRow));
  const [forward, setForward] = useState(false); // "from this day on"
  const [ratesTouched, setRatesTouched] = useState(false);
  const [copying, setCopying] = useState(false); // "Copy to other days" open
  const [state, setState] = useState<"saved" | "saving" | "error">("saved");
  const [error, setError] = useState<string | null>(null);

  // saving as you type: a short pause after the last change, then the whole day
  const latest = useRef({ rows, forward });
  // kept up to date after each render (never during it), for the save that runs a moment later
  useEffect(() => {
    latest.current = { rows, forward };
  }, [rows, forward]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const { rows: rs, forward: fw } = latest.current;
    const workers = rs
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), hours: num(r.hours), otHours: num(r.otHours), rate: num(r.rate), otRate: num(r.otRate), fixed: r.fixed }));
    setState("saving");
    const body = { date, contractorName: contractor, taskId, workers, forward: fw };
    chain.current = chain.current.then(() =>
      labourSimpleApi.saveDay(projectId, body).then(
        () => {
          refresh();
          if (!timer.current) setState("saved");
          setError(null);
        },
        (e) => {
          setState("error");
          setError(describeError(e));
        },
      ),
    );
  };
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // "Saving…" is shown by the change itself (change() below); here only the save is scheduled
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, forward]);
  useEffect(
    () => () => {
      if (timer.current) flush(); // leaving this day: save what is still waiting
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // every change to the crew goes through here, so "Saving…" shows at once
  const change = (fn: (rs: Row[]) => Row[]) => {
    setRows(fn);
    setState("saving");
  };
  const edit = (i: number, patch: Partial<Row>) => {
    if ("rate" in patch || "otRate" in patch) setRatesTouched(true);
    change((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch, ...("hours" in patch || "rate" in patch ? { fixed: null } : {}) } : r)));
  };
  const addWorker = () => {
    const prev = rows[rows.length - 1];
    change((rs) => [...rs, { key: nextKey(), name: "", hours: "8", otHours: "", rate: prev?.rate ?? "", otRate: prev?.otRate ?? prev?.rate ?? "", fixed: null }]);
    requestAnimationFrame(() => {
      const names = document.querySelectorAll<HTMLInputElement>("[data-worker-name]");
      names[names.length - 1]?.focus();
    });
  };
  /** Enter in the last row: a new worker row, with the cursor in its name */
  const enterAdds = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (i === rows.length - 1) addWorker();
    else {
      // any other row: down to the same box in the next row
      const next = document.querySelectorAll<HTMLInputElement>(`[data-col="${e.currentTarget.dataset.col}"]`)[i + 1];
      next?.focus();
    }
  };
  const sameAsLast = () => day.last && change(() => day.last!.workers.map(toRow));
  const extras = day.extras ?? 0; // an older day's extra amount: kept and counted
  const total = rows.reduce((s, r) => s + payOf(r), 0) + extras;
  const people = rows.filter((r) => r.name.trim()).length;
  const named = rows.filter((r) => r.name.trim());
  const summary = `${people} ${people === 1 ? "worker" : "workers"}, ${r2(named.reduce((s, r) => s + num(r.hours), 0))} h${named.some((r) => num(r.otHours)) ? ` + ${r2(named.reduce((s, r) => s + num(r.otHours), 0))} OT` : ""
    }, ${money(total)} a day`;
  // copy what is saved: finish any save still waiting, then open the panel
  const openCopy = async () => {
    if (timer.current) flush();
    await chain.current;
    setCopying(true);
  };

  return (
    <section aria-label={`Hours · ${workTitle} · ${longDay(date)} · ${contractor}`} className={`${mono.card} overflow-hidden pb-4`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-184 text-sm">
          <thead>
            <tr className="border-b border-[#EFEFED] bg-[#F7F7F5] text-xs text-[#666666]">
              <th scope="col" className="px-5 py-2.5 text-left font-medium">Worker</th>
              <th scope="col" className="w-20 px-1.5 py-2 text-right font-medium">Hours</th>
              <th scope="col" className="w-20 px-1.5 py-2 text-right font-medium">OT hours</th>
              <th scope="col" className="w-24 px-1.5 py-2 text-right font-medium">₹ / hour</th>
              <th scope="col" className="w-24 px-1.5 py-2 text-right font-medium">OT ₹ / hour</th>
              <th scope="col" className="w-28 px-2 py-2 text-right font-medium">Amount</th>
              <th scope="col" className="w-12"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFEFED]">
            {rows.map((r, i) => (
              <tr key={r.key}>
                <td className="px-5 py-1.5">
                  <input data-worker-name data-col="name" value={r.name} onChange={(e) => edit(i, { name: e.target.value })} onKeyDown={enterAdds(i)} maxLength={80} placeholder="Name" aria-label={`Worker ${i + 1}`} className={field} />
                  {r.fixed !== null && <span className="mt-0.5 block text-[11px] text-[#8C8C8C]">Saved earlier as {money(r.fixed)}. Type hours to change it.</span>}
                </td>
                {(["hours", "otHours", "rate", "otRate"] as const).map((f) => (
                  <td key={f} className="px-1.5 py-1.5">
                    <input
                      value={r[f]}
                      onChange={(e) => edit(i, { [f]: e.target.value } as Partial<Row>)}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={enterAdds(i)}
                      data-col={f}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      placeholder="0"
                      aria-label={`${{ hours: "Hours", otHours: "OT hours", rate: "Rate per hour", otRate: "OT rate per hour" }[f]} for ${r.name || `worker ${i + 1}`}`}
                      className={
                        f === "rate" || f === "otRate"
                          ? `${field} border-transparent bg-transparent text-right tabular-nums text-[#666666] hover:border-[#DADAD7] focus:bg-white focus:text-[#111111]`
                          : `${field} h-11 text-center text-base tabular-nums`
                      }
                    />
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-[#111111]">{money(payOf(r))}</td>
                <td className="px-1 py-1.5 text-center">
                  <button type="button" onClick={() => change((rs) => rs.filter((_, j) => j !== i))} className={mono.icon} aria-label={`Remove ${r.name || `worker ${i + 1}`}`} title="Remove">
                    <FiX aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-sm text-[#666666]">
                  Nobody marked yet. Use Add worker{day.last ? ", or Same as last day" : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mx-5 mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={addWorker} className={`${mono.secondary} min-h-10 text-sm`}>
          <FiUserPlus aria-hidden /> Add worker
        </button>
        {day.last && (
          <button type="button" onClick={sameAsLast} className={`${mono.secondary} min-h-10 text-sm`} title={`Copy the crew of ${longDay(day.last.date)}`}>
            <FiCopy aria-hidden /> Same as last day ({shortDay(day.last.date)})
          </button>
        )}
        {people > 0 && !copying && (
          <button type="button" onClick={() => void openCopy()} className={`${mono.secondary} min-h-10 border-[#378ADD] text-sm text-[#185FA5]`}>
            <FiCalendar aria-hidden /> Copy to other days
          </button>
        )}
        <span className="ml-auto flex items-center gap-2">
          <span aria-live="polite" className={`text-xs ${state === "error" ? "text-[#B3261E]" : state === "saving" ? "text-[#854F0B]" : "text-[#3B6D11]"}`}>
            {state === "saving" ? "Unsaved changes" : state === "error" ? "Not saved" : "All changes saved"}
          </span>
          <button
            type="button"
            onClick={flush}
            disabled={state === "saved"}
            className={state === "saved" ? `${mono.secondary} min-h-10 text-sm text-[#3B6D11] disabled:opacity-100` : `${mono.primary} min-h-10 text-sm`}
          >
            {state === "saved" ? (
              <>
                <FiCheck aria-hidden /> Saved
              </>
            ) : (
              "Save"
            )}
          </button>
        </span>
      </div>

      {copying && <CopyDays projectId={projectId} date={date} contractor={contractor} taskId={taskId} workTitle={workTitle} summary={summary} onClose={() => setCopying(false)} />}

      {extras > 0 && <p className="mx-5 mt-2 text-xs text-[#666666]">Includes {money(extras)} extra saved earlier on this day (kept).</p>}

      {ratesTouched && (
        <div className="mx-5 mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#F7F7F5] px-4 py-2.5 text-sm text-[#333333]">
          Rates changed. Use them for:
          <span className="inline-flex rounded-lg border border-[#DADAD7] bg-white p-0.5">
            {[false, true].map((fw) => (
              <button key={String(fw)} type="button" aria-pressed={forward === fw} onClick={() => (setForward(fw), setState("saving"))} className={`min-h-9 rounded-md px-3 text-sm ${forward === fw ? "bg-[#111111] text-white" : "text-[#333333]"}`}>
                {fw ? "From this day on" : "This day only"}
              </button>
            ))}
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="mx-5 mt-2 text-sm text-[#B3261E]">
          {error}{" "}
          <button type="button" onClick={flush} className="font-medium underline">
            Try again
          </button>
        </p>
      )}

      <div className="mx-5 mt-4 flex items-center justify-between rounded-[18px] border border-[#B5D4F4] bg-[#E6F1FB] px-5 py-3.5">
        <span className="text-sm text-[#185FA5]">
          {workTitle} · {shortDay(date)} · {people} {people === 1 ? "worker" : "workers"}
        </span>
        <span className="text-xl font-semibold tabular-nums text-[#0C447C]">{money(total)}</span>
      </div>
    </section>
  );
}

/* ------------------------------------------------ records ------------------------------------------------ */

function Records({ projectId, taskId, workTitle, onOpen }: { projectId: string; taskId: string | null; workTitle: string; onOpen: (date: string, contractor: string) => void }) {
  const today = todayYmd();
  const [from, setFrom] = useState(mondayOf(today));
  const [to, setTo] = useState(today);
  const list = useRecords(projectId, from, to, taskId);

  return (
    <section className={`${mono.card} overflow-hidden`}>
      <div className="flex flex-wrap items-end gap-3 px-5 py-4">
        <h3 className="flex-1 text-[15px] font-semibold text-[#111111]">{workTitle} attendance</h3>
        <label className={label}>
          From
          <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className={`${field} w-40`} />
        </label>
        <label className={label}>
          To
          <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} className={`${field} w-40`} />
        </label>
      </div>
      {list.isError ? (
        <p role="alert" className="px-5 pb-4 text-sm text-[#B3261E]">{describeError(list.error)}</p>
      ) : !list.data ? (
        <p className="px-5 pb-4 text-sm text-[#8C8C8C]">Loading…</p>
      ) : list.data.items.length === 0 ? (
        <p className="border-t border-[#EFEFED] px-5 py-6 text-center text-sm text-[#666666]">Nothing marked for {workTitle} in these dates.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-xl text-sm">
            <thead>
              <tr className="border-y border-[#EFEFED] bg-[#F7F7F5] text-xs text-[#666666]">
                <th scope="col" className="px-5 py-2 text-left font-medium">Date</th>
                <th scope="col" className="px-2 py-2 text-left font-medium">Contractor</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Workers</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Hours</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">OT</th>
                <th scope="col" className="px-5 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEFED]">
              {list.data.items.map((r, i) => (
                <tr key={`${r.date}|${r.contractorName}|${i}`} onClick={() => onOpen(r.date, r.contractorName)} className="cursor-pointer hover:bg-[#FAFAF9]" title="Open this day to change it">
                  <td className="whitespace-nowrap px-5 py-2.5">{longDay(r.date)}</td>
                  <td className="px-2 py-2.5">{r.contractorName}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{r.workers}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{r.hours || "–"}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{r.otHours || "–"}</td>
                  <td className="px-5 py-2.5 text-right font-semibold tabular-nums">{money(r.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#EFEFED] bg-[#F7F7F5]">
                <td colSpan={5} className="px-5 py-2.5 font-semibold">
                  Total · {shortDay(from)} – {shortDay(to)}
                </td>
                <td className="px-5 py-2.5 text-right font-semibold tabular-nums">{money(list.data.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="px-5 pb-3 pt-2 text-xs text-[#8C8C8C]">Tap a row to open that day above and change it.</p>
    </section>
  );
}