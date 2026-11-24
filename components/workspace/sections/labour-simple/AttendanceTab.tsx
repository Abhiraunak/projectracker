"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MutableRefObject } from "react";
import { FiCalendar, FiCheck, FiChevronLeft, FiChevronRight, FiCopy, FiEdit2, FiPlus, FiUserPlus, FiX } from "react-icons/fi";
import { useAddWork, useDay, usePeople, useRecords, useRenameWork, useSaveDay, useTeam, useWorks } from "@/hooks/useLabourSimple";
import { describeError } from "@/lib/api";
import type { Day, Worker } from "@/lib/labour/simple";
import { SectionError, SectionSkeleton } from "../../ui";
import { ArchivedList } from "./ArchivedList";
import { CopyDays } from "./CopyDays";
import { DatePick } from "./DatePick";
import { PickList } from "./PickList";
import { addDays, field, label, longDay, money, mono, num, r2, shortDay, todayYmd, txt, weekday } from "./shared";
import { TeamList } from "./TeamList";

/**
 * The Attendance tab, top to bottom:
 *   Team heads and individuals: one row each (Attendance amount, Paid, To pay); each opens its days and its payments
 *   Mark attendance, as on paper, for A team (Labour | Hours | OT | Rate / hour | OT rate / hour | Total) or One person
 *   Recent attendance (tap one to open its full sheet), and Archived
 * Nothing is saved until Save is pressed. Anyone left without hours is simply not counted for that day.
 */
export function AttendanceTab({ projectId }: { projectId: string }) {
  const works = useWorks(projectId);
  const people = usePeople(projectId);
  const team = useTeam(projectId);
  const memory = `labour:${projectId}`; // the last work and team head used, so the tab opens where you left it
  const [pickedTask, setTaskId] = useState<string | null>(() => readMemory(memory).taskId ?? null);
  const [pickedContractor, setContractor] = useState<string>(() => readMemory(memory).contractor ?? "");
  const [date, setDate] = useState(todayYmd());
  const [solo, setSolo] = useState<boolean>(() => readMemory(memory).solo ?? false); // One person instead of a team
  // unsaved changes on the open sheet: written by the sheet, read only when moving to another sheet
  const dirtyRef = useRef(false);
  const [waiting, setWaiting] = useState<Sheet | null>(null); // a sheet to open once the unsaved one is dealt with
  const [marking, setMarking] = useState(false); // the sheet shows only after "Mark attendance" (or a day) is pressed
  const [closing, setClosing] = useState(false); // Close pressed with changes not saved
  const top = useRef<HTMLDivElement>(null);

  // Worked out, not stored: a work that was removed means General; nobody picked yet means the first on the list
  const taskId = pickedTask && works.data?.items.some((w) => w.id === pickedTask) ? pickedTask : null;
  const rowsOf = team.data?.items ?? [];
  const teamNames = rowsOf.filter((r) => r.kind === "team").map((r) => r.name);
  const soloNames = rowsOf.filter((r) => r.kind !== "team").map((r) => r.name);
  const fallback = solo ? soloNames[0] : (teamNames[0] ?? people.data?.contractors[0]);
  const contractor = pickedContractor || fallback || "";
  const isSolo = (name: string) => rowsOf.find((r) => r.name.toLowerCase() === name.toLowerCase())?.kind === "one";

  useEffect(() => writeMemory(memory, { taskId, contractor, solo }), [memory, taskId, contractor, solo]);

  if (works.isPending || people.isPending) return <SectionSkeleton />;
  if (works.isError) return <SectionError error={works.error} onRetry={() => void works.refetch()} />;
  if (people.isError) return <SectionError error={people.error} onRetry={() => void people.refetch()} />;
  const workTitle = taskId ? (works.data.items.find((w) => w.id === taskId)?.title ?? "") : "General";

  const open = (s: Sheet) => {
    setDate(s.date);
    setContractor(s.contractor);
    setTaskId(s.taskId);
    setSolo(s.solo);
    setWaiting(null);
    dirtyRef.current = false;
  };
  /** Move to another sheet; with unsaved changes, ask first (inside the sheet) */
  const go = (patch: Partial<Sheet>) => {
    const next = { date, contractor, taskId, solo, ...patch };
    if (sameSheet(next, { date, contractor, taskId, solo })) return;
    if (dirtyRef.current) setWaiting(next);
    else open(next);
  };
  /** Open the sheet (on a person or a day), then bring it into view */
  const openFromList = (s: Sheet) => {
    setMarking(true);
    setClosing(false);
    go(s);
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  /** Close the sheet; with unsaved changes, ask first */
  const close = (force = false) => {
    if (dirtyRef.current && !force) {
      setClosing(true);
      return;
    }
    dirtyRef.current = false;
    setWaiting(null);
    setClosing(false);
    setMarking(false);
  };
  /** A team / One person: the other list's first name, or nobody yet */
  const switchMode = (toSolo: boolean) => go({ solo: toSolo, contractor: (toSolo ? soloNames[0] : teamNames[0]) ?? "" });

  return (
    <div className="space-y-5">
      <TeamList
        projectId={projectId}
        onMark={(name, toSolo) => openFromList({ date, contractor: name, taskId, solo: toSolo })}
        onMarkNew={() => openFromList({ date: todayYmd(), contractor, taskId, solo })}
        onOpenDay={(d) => openFromList(d)}
      />
      {marking && (
        <div ref={top} className={`${mono.card} scroll-mt-4 overflow-hidden`}>
          {closing && (
            <div role="alert" className="flex flex-wrap items-center gap-2 border-b border-[#FAC775] bg-[#FAEEDA] px-5 py-3 text-sm text-[#633806]">
              <span className="mr-auto font-medium">This sheet has changes that are not saved.</span>
              <button type="button" onClick={() => close(true)} className={`${mono.secondary} min-h-9 px-3 text-sm`}>
                Close without saving
              </button>
              <button type="button" onClick={() => setClosing(false)} className={`${mono.quiet} min-h-9 px-3 text-sm`}>
                Stay here
              </button>
            </div>
          )}
          <div className="border-b border-[#EFEFED] px-5 pb-4 pt-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h3 className="mr-auto text-[15px] font-semibold text-[#111111]">Mark attendance</h3>
              <span role="group" aria-label="Mark attendance for" className="inline-flex rounded-xl bg-[#F1F1EF] p-1">
                {([false, true] as const).map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => switchMode(v)}
                    aria-pressed={solo === v}
                    className={`min-h-9 rounded-lg px-4 text-sm ${mono.motion} ${solo === v ? "bg-white font-semibold text-[#111111] shadow-[0_1px_2px_rgba(17,17,17,0.08)]" : "text-[#666666] hover:text-[#111111]"}`}
                  >
                    {v ? "One person" : "A team"}
                  </button>
                ))}
              </span>
              <button type="button" onClick={() => close()} className={`${mono.secondary} min-h-9 px-3 text-sm`} aria-label="Close the sheet">
                <FiX aria-hidden /> Close
              </button>
            </div>
            <Header
              projectId={projectId}
              date={date}
              contractor={contractor}
              contractors={solo ? soloNames : teamNames.length ? teamNames : people.data.contractors}
              solo={solo}
              works={works.data.items}
              taskId={taskId}
              go={go}
            />
          </div>
          {contractor ? (
            <SheetLoader
              key={`${date}|${contractor.toLowerCase()}|${taskId ?? ""}|${solo ? "one" : "team"}`}
              projectId={projectId}
              sheet={{ date, contractor, taskId, solo }}
              workTitle={workTitle}
              dirtyRef={dirtyRef}
              waiting={waiting}
              onContinue={() => waiting && open(waiting)}
              onStay={() => setWaiting(null)}
            />
          ) : (
            <p className="px-5 py-8 text-center text-sm text-[#666666]">
              {solo ? "Add the person first (New, next to Person), then mark attendance." : "Add a team head first (New, next to Team head), then mark attendance."}
            </p>
          )}
        </div>
      )}
      <Recent projectId={projectId} current={{ date, contractor, taskId, solo }} isSolo={isSolo} onOpen={openFromList} />
      <ArchivedList projectId={projectId} tab="team" />
    </div>
  );
}

type Sheet = { date: string; contractor: string; taskId: string | null; solo: boolean };
const sameSheet = (a: Sheet, b: Sheet) =>
  a.date === b.date && a.contractor.toLowerCase() === b.contractor.toLowerCase() && a.taskId === b.taskId && a.solo === b.solo;

function readMemory(key: string): { taskId?: string | null; contractor?: string; solo?: boolean } {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}");
  } catch {
    return {};
  }
}
function writeMemory(key: string, v: { taskId: string | null; contractor: string; solo: boolean }) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode: nothing to remember */
  }
}

/* ------------------------------------------------ attendance for · team head · date ------------------------------------------------ */

const GENERAL = "General (no work item)";

function Header({
  projectId,
  date,
  contractor,
  contractors,
  solo,
  works,
  taskId,
  go,
}: {
  projectId: string;
  date: string;
  contractor: string;
  contractors: string[];
  solo: boolean;
  works: { id: string; title: string }[];
  taskId: string | null;
  go: (patch: Partial<Sheet>) => void;
}) {
  const add = useAddWork(projectId);
  const rename = useRenameWork(projectId);
  const [typing, setTyping] = useState<null | { what: "work" | "rename" | "head"; text: string }>(null);
  const heads = contractor && !contractors.some((c) => c.toLowerCase() === contractor.toLowerCase()) ? [contractor, ...contractors] : contractors;
  const workTitle = taskId ? (works.find((w) => w.id === taskId)?.title ?? "") : GENERAL;

  const done = () => {
    const text = typing?.text.trim();
    if (!typing || !text) return;
    if (typing.what === "head") {
      go({ contractor: text });
      setTyping(null);
    } else if (typing.what === "work") {
      add.mutate(text, {
        onSuccess: (r) => {
          go({ taskId: r.item.id });
          setTyping(null);
        },
      });
    } else if (taskId) {
      rename.mutate({ id: taskId, title: text }, { onSuccess: () => setTyping(null) });
    }
  };
  const typingBox = (what: "work" | "rename" | "head", placeholder: string) =>
    typing?.what === what ? (
      <span className="flex items-center gap-1.5">
        <input
          value={typing.text}
          onChange={(e) => setTyping({ what, text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") done();
            if (e.key === "Escape") setTyping(null);
          }}
          autoFocus
          maxLength={120}
          placeholder={placeholder}
          aria-label={placeholder}
          className={`${field} h-11 w-full text-base`}
        />
        <button type="button" onClick={done} disabled={add.isPending || rename.isPending} className={`${mono.primary} px-3 text-sm`}>
          {what === "rename" ? "Save" : add.isPending ? "Adding…" : "Add"}
        </button>
        <button type="button" onClick={() => setTyping(null)} className={mono.icon} aria-label="Cancel">
          <FiX aria-hidden />
        </button>
      </span>
    ) : null;

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]">
      <div className={label}>
        <span>Attendance for (work)</span>
        {typingBox("work", "New work, e.g. Flooring") ??
          typingBox("rename", "Work name") ?? (
            <span className="flex items-center gap-1.5">
              <PickList
                value={workTitle}
                options={[...works.map((w) => w.title), GENERAL]}
                onChange={(t) => go({ taskId: works.find((w) => w.title === t)?.id ?? null })}
                label="Attendance for"
                className="min-w-0 flex-1"
              />
              {taskId && (
                <button type="button" onClick={() => setTyping({ what: "rename", text: workTitle })} className={mono.icon} aria-label="Rename this work" title="Rename this work">
                  <FiEdit2 aria-hidden />
                </button>
              )}
              <button type="button" onClick={() => setTyping({ what: "work", text: "" })} className={`${mono.secondary} px-3 text-sm`} title="Add a new work">
                <FiPlus aria-hidden /> New
              </button>
            </span>
          )}
      </div>

      <div className={label}>
        <span>{solo ? "Person" : "Team head"}</span>
        {typingBox("head", solo ? "Person's name" : "Team head's name") ?? (
          <span className="flex items-center gap-1.5">
            <PickList
              value={contractor}
              options={heads}
              onChange={(c) => go({ contractor: c })}
              label={solo ? "Person" : "Team head"}
              placeholder={solo ? "Nobody yet" : "No team head yet"}
              className="min-w-0 flex-1"
            />
            <button type="button" onClick={() => setTyping({ what: "head", text: "" })} className={`${mono.secondary} px-3 text-sm`} title={solo ? "Add a new person" : "Add a new team head"}>
              <FiUserPlus aria-hidden /> New
            </button>
          </span>
        )}
      </div>

      <div className={label}>
        <span>Date</span>
        <span className="flex items-center gap-1">
          <button type="button" onClick={() => go({ date: addDays(date, -1) })} className={mono.icon} aria-label="Day before">
            <FiChevronLeft aria-hidden />
          </button>
          <DatePick value={date} onChange={(v) => go({ date: v })} label="Date" className="w-44" align="right" />
          <button type="button" onClick={() => go({ date: addDays(date, 1) })} className={mono.icon} aria-label="Next day">
            <FiChevronRight aria-hidden />
          </button>
          {date !== todayYmd() && (
            <button type="button" onClick={() => go({ date: todayYmd() })} className="ml-1 text-sm font-medium text-[#185FA5] hover:underline">
              Today
            </button>
          )}
        </span>
      </div>
      {(add.isError || rename.isError) && <p role="alert" className="text-sm text-[#B3261E] sm:col-span-3">{describeError(add.error ?? rename.error)}</p>}
    </div>
  );
}

/* ------------------------------------------------ the sheet ------------------------------------------------ */

type Row = { key: string; name: string; hours: string; otHours: string; rate: string; otRate: string; fixed: number | null };
let seq = 0;
const nextKey = () => `w${++seq}`;
const toRow = (w: Worker): Row => ({ key: nextKey(), name: w.name, hours: txt(w.hours), otHours: txt(w.otHours), rate: txt(w.rate), otRate: txt(w.otRate), fixed: w.fixed });
/** Last day's people with their rates, hours left empty: fill in only who came */
const toBlankRow = (w: Worker): Row => ({ ...toRow(w), hours: "", otHours: "", fixed: null });
const blankRow = (prev?: Row): Row => ({ key: nextKey(), name: "", hours: "", otHours: "", rate: prev?.rate ?? "", otRate: prev?.otRate ?? "", fixed: null });
const payOf = (r: Row) => {
  if (r.fixed !== null && num(r.hours) === 0 && num(r.otHours) === 0 && num(r.rate) === 0) return r.fixed;
  return r2(num(r.hours) * num(r.rate) + num(r.otHours) * num(r.otRate));
};
/** Marked = has a name and some hours, OT or an older saved amount. Only these are saved. */
const isMarked = (r: Row) => !!r.name.trim() && (num(r.hours) > 0 || num(r.otHours) > 0 || r.fixed !== null);
const toSave = (rows: Row[]) =>
  rows.filter(isMarked).map((r) => ({ name: r.name.trim(), hours: num(r.hours), otHours: num(r.otHours), rate: num(r.rate), otRate: num(r.otRate), fixed: r.fixed }));

function SheetLoader(props: {
  projectId: string;
  sheet: Sheet;
  workTitle: string;
  dirtyRef: MutableRefObject<boolean>;
  waiting: Sheet | null;
  onContinue: () => void;
  onStay: () => void;
}) {
  const day = useDay(props.projectId, props.sheet.date, props.sheet.contractor, props.sheet.taskId);
  if (day.isPending) return <div className="p-5"><SectionSkeleton /></div>;
  if (day.isError) return <SectionError error={day.error} onRetry={() => void day.refetch()} />;
  return <SheetBody {...props} day={day.data} />;
}

function SheetBody({
  projectId,
  sheet,
  workTitle,
  day,
  dirtyRef,
  waiting,
  onContinue,
  onStay,
}: {
  projectId: string;
  sheet: Sheet;
  workTitle: string;
  day: Day;
  dirtyRef: MutableRefObject<boolean>;
  waiting: Sheet | null;
  onContinue: () => void;
  onStay: () => void;
}) {
  const { date, contractor, taskId } = sheet;
  // One person only when the day holds just them: a team's day opened here stays a team sheet, so no one is dropped
  const solo = sheet.solo && day.workers.every((w) => w.name.trim().toLowerCase() === contractor.trim().toLowerCase());
  const save = useSaveDay(projectId);
  const isNew = day.workers.length === 0 && !day.extras;
  const filledFrom = isNew && day.last ? day.last.date : null; // a new day starts with the last day's people and rates
  const [rows, setRows] = useState<Row[]>(() => {
    if (solo) {
      // One person: one line, in their own name; their rates carried from their last day
      const mine = day.workers[0] ?? day.last?.workers[0];
      const row = !mine ? blankRow() : day.workers[0] ? toRow(mine) : toBlankRow(mine);
      return [{ ...row, name: contractor }];
    }
    if (!isNew) return day.workers.map(toRow);
    if (day.last?.workers.length) return day.last.workers.map(toBlankRow);
    return [blankRow(), blankRow(), blankRow()];
  });
  const [saved, setSaved] = useState(() => JSON.stringify(toSave(day.workers.map(toRow))));
  const [copying, setCopying] = useState(false);

  const now = JSON.stringify(toSave(rows));
  const unsaved = now !== saved;
  useEffect(() => {
    dirtyRef.current = unsaved; // read by the tab only when moving to another sheet
  }, [dirtyRef, unsaved]);

  const doSave = async () => {
    const body = { date, contractorName: contractor, taskId, workers: toSave(rows), forward: false };
    await save.mutateAsync(body);
    setSaved(JSON.stringify(body.workers));
    setCopying(false);
  };
  const onSave = () => {
    doSave().catch(() => undefined); // the error shows under the sheet
  };

  const edit = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch, ...("hours" in patch || "rate" in patch ? { fixed: null } : {}) } : r)));
  const addLine = () => {
    if (solo) return; // one person: one line
    setRows((rs) => [...rs, blankRow(rs[rs.length - 1])]);
    requestAnimationFrame(() => {
      const names = document.querySelectorAll<HTMLInputElement>("[data-col='name']");
      names[names.length - 1]?.focus();
    });
  };
  /** Enter: down to the same box in the next line; in the last line, a new line */
  const onEnter = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (i === rows.length - 1) {
      if (solo) onSave();
      else addLine();
    }
    else document.querySelectorAll<HTMLInputElement>(`[data-col="${e.currentTarget.dataset.col}"]`)[i + 1]?.focus();
  };
  const sameAsLast = () => {
    if (!day.last) return;
    if (solo) setRows(day.last.workers.slice(0, 1).map((w) => ({ ...toRow(w), name: contractor })));
    else setRows(day.last.workers.map(toRow));
  };

  const marked = rows.filter(isMarked);
  const extras = day.extras ?? 0; // an older day's extra amount: kept and counted
  const total = r2(marked.reduce((s, r) => s + payOf(r), 0) + extras);
  const hours = r2(marked.reduce((s, r) => s + num(r.hours), 0));
  const ot = r2(marked.reduce((s, r) => s + num(r.otHours), 0));
  const savedCount = (JSON.parse(saved) as unknown[]).length;
  const summary = `${savedCount} ${savedCount === 1 ? "person" : "people"}, ${money(total)} a day`;

  return (
    <section aria-label={`${workTitle} · ${contractor} · ${longDay(date)}`}>
      {waiting && (
        <div role="alert" className="flex flex-wrap items-center gap-2 border-b border-[#FAC775] bg-[#FAEEDA] px-5 py-3 text-sm text-[#633806]">
          <span className="mr-auto font-medium">This sheet has changes that are not saved.</span>
          <button
            type="button"
            onClick={() => {
              doSave().then(onContinue, () => undefined);
            }}
            disabled={save.isPending}
            className={`${mono.primary} min-h-9 px-3 text-sm`}
          >
            {save.isPending ? "Saving…" : "Save and go on"}
          </button>
          <button type="button" onClick={onContinue} className={`${mono.secondary} min-h-9 px-3 text-sm`}>
            Don&apos;t save
          </button>
          <button type="button" onClick={onStay} className={`${mono.quiet} min-h-9 px-3 text-sm`}>
            Stay here
          </button>
        </div>
      )}

      <p className="px-5 pt-3 text-sm text-[#666666]">
        <span className="font-semibold text-[#111111]">{contractor}</span> · {workTitle} · {weekday(date)} {longDay(date)}
        {filledFrom && <> · <span className="text-[#185FA5]">People and rates from {shortDay(filledFrom)}. Fill hours only for those who came.</span></>}
        {!isNew && <> · <span className="text-[#3B6D11]">Already marked. Change anything and Save.</span></>}
      </p>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-200 text-sm">
          <thead>
            <tr className="border-y border-[#EFEFED] bg-[#F7F7F5] text-xs text-[#666666]">
              <th scope="col" className="w-10 py-2.5 pl-5 text-left font-medium">#</th>
              <th scope="col" className="px-1.5 py-2.5 text-left font-medium">{solo ? "Person" : "Labour"}</th>
              <th scope="col" className="w-20 px-1.5 py-2.5 text-center font-medium">Hours</th>
              <th scope="col" className="w-20 px-1.5 py-2.5 text-center font-medium">OT hours</th>
              <th scope="col" className="w-24 px-1.5 py-2.5 text-center font-medium">Rate / hour</th>
              <th scope="col" className="w-24 px-1.5 py-2.5 text-center font-medium">OT rate / hour</th>
              <th scope="col" className="w-28 px-2 py-2.5 text-right font-medium">Total</th>
              <th scope="col" className="w-12 pr-3"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFEFED]">
            {rows.map((r, i) => {
              const off = !!r.name.trim() && !isMarked(r); // named but no hours: not counted
              return (
                <tr key={r.key} className={off ? "bg-[#FAFAF9]" : ""}>
                  <td className="py-1.5 pl-5 text-xs tabular-nums text-[#8C8C8C]">{i + 1}</td>
                  <td className="px-1.5 py-1.5">
                    {solo ? (
                      <span className="block px-1 text-base font-semibold text-[#111111]">{r.name}</span>
                    ) : (
                      <input data-col="name" value={r.name} onChange={(e) => edit(i, { name: e.target.value })} onKeyDown={onEnter(i)} maxLength={80} placeholder="Name" aria-label={`Labour ${i + 1}`} className={`${field} h-11 text-base ${off ? "text-[#8C8C8C]" : ""}`} />
                    )}
                    {r.fixed !== null && <span className="mt-0.5 block text-[11px] text-[#8C8C8C]">Saved earlier as {money(r.fixed)}. Type hours to change it.</span>}
                  </td>
                  {(["hours", "otHours", "rate", "otRate"] as const).map((f) => (
                    <td key={f} className="px-1.5 py-1.5">
                      <input
                        value={r[f]}
                        onChange={(e) => edit(i, { [f]: e.target.value } as Partial<Row>)}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={onEnter(i)}
                        data-col={f}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        placeholder={f === "hours" ? "–" : "0"}
                        aria-label={`${{ hours: "Hours", otHours: "OT hours", rate: "Rate per hour", otRate: "OT rate per hour" }[f]} for ${r.name || `labour ${i + 1}`}`}
                        className={`${field} h-11 text-center text-base tabular-nums`}
                      />
                    </td>
                  ))}
                  <td className={`px-2 py-1.5 text-right tabular-nums ${off ? "text-[#8C8C8C]" : "font-semibold text-[#111111]"}`}>{off ? "Absent" : r.name.trim() ? money(payOf(r)) : ""}</td>
                  <td className="pr-3 text-center">
                    {!solo && <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className={mono.icon} aria-label={`Remove ${r.name || `line ${i + 1}`}`} title="Remove this line">
                      <FiX aria-hidden />
                    </button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 pt-3">
        {!solo && (
          <button type="button" onClick={addLine} className={`${mono.secondary} min-h-10 text-sm`}>
            <FiPlus aria-hidden /> Add labour
          </button>
        )}
        {day.last && (
          <button type="button" onClick={sameAsLast} className={`${mono.secondary} min-h-10 text-sm`} title={`Fill the same people, hours and rates as ${longDay(day.last.date)}`}>
            <FiCopy aria-hidden /> Same as {shortDay(day.last.date)}
          </button>
        )}
        <button
          type="button"
          onClick={() => setCopying((c) => !c)}
          disabled={unsaved || savedCount === 0}
          title={unsaved ? "Save first, then copy" : savedCount === 0 ? "Mark and save this day first" : "Copy this day to one or more days"}
          className={`${mono.secondary} min-h-10 border-[#378ADD] text-sm text-[#185FA5] disabled:border-[#DADAD7] disabled:text-[#8C8C8C]`}
        >
          <FiCalendar aria-hidden /> Copy to other days
        </button>
        <span className="ml-auto text-xs text-[#8C8C8C]">{solo ? "Leave hours empty if absent. Enter saves." : "Leave hours empty for anyone absent. Enter goes to the next line."}</span>
      </div>

      {copying && !unsaved && <CopyDays projectId={projectId} date={date} contractor={contractor} taskId={taskId} workTitle={workTitle} summary={summary} onClose={() => setCopying(false)} />}

      {extras > 0 && <p className="mx-5 mt-2 text-xs text-[#666666]">Includes {money(extras)} extra saved earlier on this day (kept).</p>}
      {save.isError && <p role="alert" className="mx-5 mt-2 text-sm text-[#B3261E]">Not saved: {describeError(save.error)}</p>}

      <div className={`mx-5 mb-5 mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[18px] border px-5 py-3.5 ${unsaved ? "border-[#FAC775] bg-[#FAEEDA]" : "border-[#B5D4F4] bg-[#E6F1FB]"}`}>
        <span className={`text-sm ${unsaved ? "text-[#854F0B]" : "text-[#185FA5]"}`}>
          {marked.length} present · {hours} h{ot ? ` + ${ot} OT` : ""}
        </span>
        <span className={`text-xl font-semibold tabular-nums ${unsaved ? "text-[#633806]" : "text-[#0C447C]"}`}>{money(total)}</span>
        <span className="ml-auto flex items-center gap-3">
          <span aria-live="polite" className={`text-sm ${unsaved ? "font-medium text-[#854F0B]" : "text-[#3B6D11]"}`}>
            {unsaved ? "Not saved yet" : savedCount ? "Saved" : ""}
          </span>
          <button type="button" onClick={onSave} disabled={!unsaved || save.isPending} className={`${mono.primary} min-w-28`}>
            {save.isPending ? (
              "Saving…"
            ) : unsaved ? (
              "Save"
            ) : (
              <>
                <FiCheck aria-hidden /> Saved
              </>
            )}
          </button>
        </span>
      </div>
    </section>
  );
}

/* ------------------------------------------------ recent attendance ------------------------------------------------ */

const RANGES = [
  { days: 7, text: "Last 7 days" },
  { days: 30, text: "Last 30 days" },
  { days: 90, text: "Last 3 months" },
  { days: 0, text: "All" }, // every day ever marked, old ones included
] as const;

function Recent({ projectId, current, isSolo, onOpen }: { projectId: string; current: Sheet; isSolo: (name: string) => boolean; onOpen: (s: Sheet) => void }) {
  const today = todayYmd();
  const [days, setDays] = useState<number>(7);
  // days copied ahead (future dates) show too, at the top
  const list = useRecords(projectId, days ? addDays(today, -(days - 1)) : "2000-01-01", addDays(today, 60));

  return (
    <section className={`${mono.card} overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-2 px-5 py-4">
        <h3 className="mr-auto text-[15px] font-semibold text-[#111111]">Recent attendance</h3>
        {RANGES.map((r) => (
          <button
            key={r.days}
            type="button"
            onClick={() => setDays(r.days)}
            aria-pressed={days === r.days}
            className={`min-h-9 rounded-full border px-3.5 text-sm ${mono.motion} ${mono.ring} ${days === r.days ? "border-[#111111] bg-[#111111] font-semibold text-white" : "border-[#DADAD7] bg-white text-[#111111] hover:border-[#8C8C8C]"
              }`}
          >
            {r.text}
          </button>
        ))}
      </div>
      {list.isError ? (
        <p role="alert" className="px-5 pb-4 text-sm text-[#B3261E]">{describeError(list.error)}</p>
      ) : !list.data ? (
        <p className="px-5 pb-4 text-sm text-[#8C8C8C]">Loading…</p>
      ) : list.data.items.length === 0 ? (
        <p className="border-t border-[#EFEFED] px-5 py-6 text-center text-sm text-[#666666]">No attendance marked in these days.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-2xl text-sm">
            <thead>
              <tr className="border-y border-[#EFEFED] bg-[#F7F7F5] text-xs text-[#666666]">
                <th scope="col" className="px-5 py-2 text-left font-medium">Date</th>
                <th scope="col" className="px-2 py-2 text-left font-medium">Work</th>
                <th scope="col" className="px-2 py-2 text-left font-medium">Team head or person</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Labour</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Hours</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">OT</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Total</th>
                <th scope="col" className="w-20 pr-5"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEFED]">
              {list.data.items.map((r, i) => {
                const s = { date: r.date, contractor: r.contractorName, taskId: r.taskId, solo: isSolo(r.contractorName) };
                const isOpen = sameSheet(s, current);
                return (
                  <tr
                    key={`${r.date}|${r.contractorName}|${r.taskId ?? ""}|${i}`}
                    onClick={() => onOpen(s)}
                    className={`cursor-pointer ${isOpen ? "bg-[#E6F1FB]" : "hover:bg-[#FAFAF9]"}`}
                  >
                    <td className="whitespace-nowrap px-5 py-2.5">
                      {weekday(r.date)} {longDay(r.date)}
                      {r.date > today && <span className="ml-1.5 rounded-full bg-[#EEEDFE] px-2 py-0.5 text-[11px] text-[#534AB7]">Ahead</span>}
                    </td>
                    <td className="px-2 py-2.5">{r.work}</td>
                    <td className="px-2 py-2.5">{r.contractorName}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{r.workers}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{r.hours || "–"}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{r.otHours || "–"}</td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{money(r.amount)}</td>
                    <td className="pr-5 text-right text-sm font-medium text-[#185FA5]">{isOpen ? "Showing" : "Open ›"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#EFEFED] bg-[#F7F7F5]">
                <td colSpan={6} className="px-5 py-2.5 font-semibold">Total</td>
                <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{money(list.data.total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}