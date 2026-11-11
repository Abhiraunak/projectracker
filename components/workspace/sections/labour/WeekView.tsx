"use client";

import { memo, useEffect, useState } from "react";
import { FiCheck, FiChevronLeft, FiChevronRight, FiClipboard, FiLock, FiPlus } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useLabourWeek } from "@/hooks/useLabourWeeks";
import { addDays, dayLetter, dayNumber, todayLocal, weekLabel, weekStartOf, type WeekLine } from "@/lib/projects/labourWeeks";
import { SectionError } from "../../ui";
import { mono } from "../materials/mono";
import { money } from "../materials/purchaseFormat";
import { MeasureDialog } from "./MeasureDialog";
import { PayDialog, SettleDialog } from "./WeekDialogs";

/** ₹6,400 → 6.4k, to fit a day box on a phone */
const short = (v: number) => (v >= 100000 ? `${Math.round(v / 10000) / 10}L` : v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v)));

type Open = { kind: "pay" | "settle"; line: WeekLine } | { kind: "measure"; line?: WeekLine } | null;

/**
 * The pay week, Monday to Sunday: one card per contractor or team head with what they earned each day, contract work,
 * what was carried from last week, what was paid, and what is left for next week. Pay any amount; settle the week
 * once paid, which locks its attendance so next week starts fresh.
 */
export function WeekView({
  projectId,
  start,
  onStart,
  focusKey,
  onMarkAttendance,
}: {
  projectId: string;
  start: string;
  onStart: (start: string) => void;
  /** A contractor to bring into view (from search) */
  focusKey?: string | null;
  onMarkAttendance: () => void;
}) {
  const week = useLabourWeek(projectId, start);
  const canPay = useCan("attendance.write"); // paying and settling come with the Labour tick
  const canWrite = useCan("attendance.write");
  const [open, setOpen] = useState<Open>(null);
  const thisWeek = weekStartOf(todayLocal());
  const data = week.data;

  // From search: scroll the contractor's card into view once the week has loaded
  useEffect(() => {
    if (!focusKey || !data) return;
    document.getElementById(`wk-${focusKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusKey, data]);

  return (
    <div className="space-y-5">
      {/* the week, and the two things done most */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onStart(addDays(start, -7))} aria-label="Previous week" className={mono.icon}>
            <FiChevronLeft aria-hidden />
          </button>
          <div className="min-w-38 text-center">
            <p className="text-[17px] font-semibold tabular-nums text-[#111111]">{weekLabel(start)}</p>
            <p className="text-xs text-[#666666]">{start === thisWeek ? "This week · Mon – Sun" : start < thisWeek ? "Past week" : "Next week"}</p>
          </div>
          <button type="button" onClick={() => onStart(addDays(start, 7))} disabled={start >= thisWeek} aria-label="Next week" className={mono.icon}>
            <FiChevronRight aria-hidden />
          </button>
          {start !== thisWeek && (
            <button type="button" onClick={() => onStart(thisWeek)} className={`${mono.quiet} min-h-10 text-sm`}>
              This week
            </button>
          )}
        </div>
        {canWrite && (
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button type="button" onClick={onMarkAttendance} className={mono.secondary}>
              <FiClipboard aria-hidden /> Attendance
            </button>
            <button type="button" onClick={() => setOpen({ kind: "measure" })} className={mono.primary}>
              <FiPlus aria-hidden /> Contract work
            </button>
          </div>
        )}
      </div>

      {week.isError ? (
        <SectionError error={week.error} onRetry={() => void week.refetch()} />
      ) : !data ? (
        <div aria-busy="true" className="grid gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-[#EFEFED] motion-reduce:animate-none" />
          ))}
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <Figure label="Earned this week" value={data.totals.earned} />
            <Figure label="From last week" value={data.totals.fromLastWeek} />
            <Figure label="Paid" value={data.totals.paid} />
            <Figure label="Left for next week" value={data.totals.left} strong />
          </dl>

          {data.lines.length === 0 ? (
            <div className={`${mono.card} px-6 py-12 text-center`}>
              <p className="text-[17px] font-semibold text-[#111111]">Nothing this week yet</p>
              <p className="mt-1.5 text-sm text-[#666666]">Mark attendance or log contract work; each contractor then gets a card here to pay and settle.</p>
            </div>
          ) : (
            <ul aria-busy={week.isFetching} className={`grid gap-3 lg:grid-cols-2 ${week.isPlaceholderData ? "opacity-60" : ""}`}>
              {data.lines.map((l) => (
                <LineCard
                  key={l.key}
                  line={l}
                  start={data.start}
                  today={data.today}
                  focused={focusKey === l.key}
                  canPay={canPay}
                  canWrite={canWrite}
                  onPay={() => setOpen({ kind: "pay", line: l })}
                  onSettle={() => setOpen({ kind: "settle", line: l })}
                  onMeasure={() => setOpen({ kind: "measure", line: l })}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {open?.kind === "pay" && <PayDialog projectId={projectId} start={start} line={open.line} onClose={() => setOpen(null)} />}
      {open?.kind === "settle" && <SettleDialog projectId={projectId} start={start} line={open.line} onClose={() => setOpen(null)} />}
      {open?.kind === "measure" && (
        <MeasureDialog
          projectId={projectId}
          preset={open.line ? { trade: open.line.trade, contractorName: open.line.contractorName, date: start === thisWeek ? undefined : addDays(start, 6) } : start === thisWeek ? undefined : { trade: "Tiles", contractorName: "", date: addDays(start, 6) }}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function Figure({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`rounded-2xl px-4 py-3 ${strong ? "bg-[#111111] text-white" : "border border-[#E8E8E6] bg-white"}`}>
      <dt className={`text-xs ${strong ? "text-white/70" : "text-[#666666]"}`}>{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums tracking-[-0.01em]">
        {value < 0 ? "−" : ""}
        {money(Math.abs(value))}
      </dd>
    </div>
  );
}

const LineCard = memo(function LineCard({
  line: l,
  start,
  today,
  focused,
  canPay,
  canWrite,
  onPay,
  onSettle,
  onMeasure,
}: {
  line: WeekLine;
  start: string;
  today: string;
  focused: boolean;
  canPay: boolean;
  canWrite: boolean;
  onPay: () => void;
  onSettle: () => void;
  onMeasure: () => void;
}) {
  const settled = !!l.settled;
  return (
    <li id={`wk-${l.key}`} className={`${mono.card} scroll-mt-24 p-4 sm:p-5 ${focused ? "outline-2 outline-offset-2 outline-[#111111]" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold text-[#111111]">{l.contractorName}</p>
          {l.trade && <p className="text-sm text-[#666666]">{l.trade}</p>}
        </div>
        {settled ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#E9F5EE] px-2.5 py-1 text-xs font-medium text-[#1A6B3C]">
            <FiLock aria-hidden /> Settled
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-[#F1F1EF] px-2.5 py-1 text-xs font-medium text-[#333333]">Open</span>
        )}
      </div>

      {/* each day's attendance, Monday to Sunday */}
      <ol aria-label="Attendance each day" className="mt-4 grid grid-cols-7 gap-1">
        {l.days.map((v, i) => {
          const d = addDays(start, i);
          return (
            <li key={d} className={`rounded-xl px-0.5 py-1.5 text-center ${d === today ? "ring-1 ring-[#111111]" : ""} ${v ? "bg-[#F1F1EF]" : "bg-[#F7F7F5]"}`}>
              <span className="block text-[11px] text-[#8C8C8C]">
                {dayLetter(start, i)} {dayNumber(start, i)}
              </span>
              <span className={`block text-[13px] tabular-nums ${v ? "font-semibold text-[#111111]" : "text-[#B5B5B2]"}`}>{v ? short(v) : "–"}</span>
            </li>
          );
        })}
      </ol>

      <dl className="mt-4 space-y-1.5 text-[15px]">
        <Line label="Attendance" value={l.attendance} />
        {(l.contract > 0 || l.measures.length > 0) && <Line label="Contract work" value={l.contract} />}
        {l.measures.map((m) => (
          <p key={m.id} className="truncate pl-3 text-xs text-[#8C8C8C]">
            {m.work} · {m.quantity} {m.unit} × {money(m.rate)}
          </p>
        ))}
        <Line label={l.fromLastWeek < 0 ? "Advance from last week" : "From last week"} value={l.fromLastWeek} />
        <div className="border-t border-[#EFEFED] pt-1.5">
          <Line label="To pay" value={l.toPay} strong />
        </div>
        <Line label="Paid this week" value={-l.paid} />
        {l.payments.map((p) => (
          <p key={p.id} className="truncate pl-3 text-xs text-[#8C8C8C]">
            {dayLetter(p.date, 0)} {dayNumber(p.date, 0)} · {money(p.amount)}
            {p.remark ? ` · ${p.remark}` : ""}
          </p>
        ))}
        <div className="flex items-baseline justify-between gap-3 rounded-xl bg-[#F7F7F5] px-3 py-2">
          <dt className="text-sm font-medium text-[#333333]">{l.left < 0 ? "Advance into next week" : "Left · carried to next week"}</dt>
          <dd className={`text-lg font-semibold tabular-nums ${l.left > 0 ? "text-[#111111]" : "text-[#1A6B3C]"}`}>{money(Math.abs(l.left))}</dd>
        </div>
      </dl>

      {settled ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#666666]">
          <span className="inline-flex items-center gap-1">
            <FiCheck aria-hidden /> Settled by {l.settled!.by}
          </span>
          {canPay && (
            <button type="button" onClick={onSettle} className={`${mono.quiet} min-h-9 px-2 text-sm`}>
              Reopen
            </button>
          )}
        </div>
      ) : (
        (canPay || canWrite) && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {canPay && (
              <button type="button" onClick={onPay} className={mono.primary}>
                Pay
              </button>
            )}
            {canPay && (
              <button type="button" onClick={onSettle} className={mono.secondary}>
                Settle week
              </button>
            )}
            {canWrite && (
              <button type="button" onClick={onMeasure} className={`${mono.quiet} col-span-2 sm:col-span-1`}>
                <FiPlus aria-hidden /> Contract work
              </button>
            )}
          </div>
        )
      )}
    </li>
  );
});

function Line({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={strong ? "font-medium text-[#111111]" : "text-[#666666]"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold text-[#111111]" : "text-[#333333]"}`}>
        {value < 0 ? "− " : ""}
        {money(Math.abs(value))}
      </dd>
    </div>
  );
}