"use client";

import { useRef, useState, type FormEvent } from "react";
import { FiPaperclip } from "react-icons/fi";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { useAddPayment } from "@/hooks/useLabour";
import { useSettleWeek } from "@/hooks/useLabourWeeks";
import { describeError } from "@/lib/api";
import { addDays, todayLocal, weekLabel, type WeekLine } from "@/lib/projects/labourWeeks";
import { mono } from "../materials/mono";
import { money } from "../materials/purchaseFormat";

/** The last day of the week that isn't in the future: payments can't be dated ahead */
const payDay = (start: string) => {
  const end = addDays(start, 6);
  const today = todayLocal();
  return today < end ? today : end;
};

/**
 * Pay a contractor for this week: any amount (all of it, part, or an advance). The rest is carried into next week.
 * Dated inside the week, so it counts against this week.
 */
export function PayDialog({ projectId, start, line, onClose }: { projectId: string; start: string; line: WeekLine; onClose: () => void }) {
  const add = useAddPayment(projectId);
  const due = Math.max(line.left, 0);
  const [amount, setAmount] = useState(due ? String(due) : "");
  const [date, setDate] = useState(payDay(start));
  const [remark, setRemark] = useState(`Week ${weekLabel(start)}`);
  const [proof, setProof] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const n = Number(amount);
  const after = Math.round((line.left - (n > 0 ? n : 0)) * 100) / 100;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!(n > 0)) {
      setProblem("Enter an amount above zero.");
      document.getElementById("wk-pay-amount")?.focus();
      return;
    }
    setProblem(null);
    try {
      await add.mutateAsync({ trade: line.trade, contractorName: line.contractorName, amount: n, date, remark: remark.trim(), proof });
      onClose();
    } catch (err) {
      setProblem(describeError(err));
    }
  };

  const chips = [due, Math.round(due / 2)].filter((v, i, all) => v > 0 && all.indexOf(v) === i);

  return (
    <ModalDialog open onClose={onClose} label={`Pay ${line.contractorName}`} size="md" locked={add.isPending}>
      <DialogHeader title={`Pay ${line.contractorName}`} subtitle={`${line.trade ? `${line.trade} · ` : ""}week ${weekLabel(start)} · to pay ${money(Math.max(line.toPay - line.paid, 0))}`} onClose={onClose} locked={add.isPending} />
      <form onSubmit={submit} className="space-y-4 p-4 sm:p-6">
        <label className={mono.fieldLabel}>
          Amount paid (₹)
          <input
            id="wk-pay-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${mono.field} h-12 text-lg font-semibold tabular-nums`}
          />
        </label>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((v, i) => (
              <button key={v} type="button" onClick={() => setAmount(String(v))} className={`${mono.secondary} min-h-10 text-sm`}>
                {i === 0 ? "All" : "Half"} · {money(v)}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={mono.fieldLabel}>
            Date
            <input type="date" value={date} min={start} max={payDay(start)} onChange={(e) => e.target.value && setDate(e.target.value)} className={mono.field} />
          </label>
          <label className={mono.fieldLabel}>
            Remark
            <input value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={500} className={mono.field} />
          </label>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="sr-only" id="wk-pay-proof" onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
          <label htmlFor="wk-pay-proof" className={`${mono.quiet} -ml-2 cursor-pointer text-sm`}>
            <FiPaperclip aria-hidden /> {proof ? proof.name : "Attach receipt (optional)"}
          </label>
        </div>

        <div className="rounded-2xl bg-[#F7F7F5] px-4 py-3 text-sm text-[#666666]">
          {after > 0 ? (
            <>
              <b className="font-semibold tabular-nums text-[#111111]">{money(after)}</b> will carry to next week
            </>
          ) : after < 0 ? (
            <>
              <b className="font-semibold tabular-nums text-[#111111]">{money(-after)}</b> paid in advance (taken off next week)
            </>
          ) : (
            "Paid in full for this week"
          )}
        </div>

        {problem && (
          <p role="alert" className="text-sm text-[#B3261E]">
            {problem}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={add.isPending} className={mono.quiet}>
            Cancel
          </button>
          <button type="submit" disabled={add.isPending} className={mono.primary}>
            {add.isPending ? "Saving…" : "Save payment"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

/** Settle (close) a contractor's week, or reopen a settled one to correct it */
export function SettleDialog({ projectId, start, line, onClose }: { projectId: string; start: string; line: WeekLine; onClose: () => void }) {
  const settle = useSettleWeek(projectId);
  const reopen = !!line.settled;
  const go = async () => {
    try {
      await settle.mutateAsync({ start, trade: line.trade, contractorName: line.contractorName, reopen });
      onClose();
    } catch {
      /* shown below */
    }
  };
  return (
    <ModalDialog open onClose={onClose} label={reopen ? "Reopen week" : "Settle week"} size="md" locked={settle.isPending}>
      <DialogHeader title={`${reopen ? "Reopen" : "Settle"} ${weekLabel(start)}`} subtitle={line.contractorName} onClose={onClose} locked={settle.isPending} />
      <div className="space-y-4 p-4 sm:p-6">
        {reopen ? (
          <p className="text-[15px] text-[#333333]">Attendance and contract work for this week can be changed again. Settle it again once corrected.</p>
        ) : (
          <>
            <dl className="divide-y divide-[#EFEFED] rounded-2xl border border-[#E8E8E6] text-[15px]">
              <Row label="To pay this week" value={money(line.toPay)} />
              <Row label="Paid" value={money(line.paid)} />
              <Row label={line.left < 0 ? "Advance into next week" : "Carried to next week"} value={money(Math.abs(line.left))} strong />
            </dl>
            <p className="text-sm text-[#666666]">
              This week&apos;s attendance and contract work for {line.contractorName} will be locked. Next week starts fresh{line.left ? ` with ${money(Math.abs(line.left))} ${line.left > 0 ? "carried" : "advance"}` : ""}.
            </p>
          </>
        )}
        {settle.isError && (
          <p role="alert" className="text-sm text-[#B3261E]">
            {describeError(settle.error)}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={settle.isPending} className={mono.quiet}>
            Cancel
          </button>
          <button type="button" onClick={() => void go()} disabled={settle.isPending} className={mono.primary}>
            {settle.isPending ? "Saving…" : reopen ? "Reopen week" : "Settle week"}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className="text-[#666666]">{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold text-[#111111]" : "text-[#333333]"}`}>{value}</dd>
    </div>
  );
}