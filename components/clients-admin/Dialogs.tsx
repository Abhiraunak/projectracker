"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { describeError } from "@/lib/api";
import { REASON_LABEL, type DelayReason, type Instalment, type InstalmentInput} from "@/lib/client/types";
import { useAddDelay, useDecideProof, useRecordPayment, useSaveInstalment } from "@/hooks/useClientAdmin";
import { PaymentFields, emptyDraft, readDraft, type PaymentDraft } from "@/components/client/PaymentFields";
import { ErrorBox, dayLabel, inputClass, inr, primaryButton, secondaryButton, todayKey } from "@/components/client/ui";

function Footer({ onClose, busy, submit }: { onClose: () => void; busy: boolean; submit: string }) {
  return (
    <div className="flex justify-end gap-2 border-t border-stone-200 px-4 py-3 sm:px-5">
      <button type="button" onClick={onClose} disabled={busy} className={secondaryButton}>
        Cancel
      </button>
      <button type="submit" disabled={busy} className={primaryButton}>
        {busy ? "Saving…" : submit}
      </button>
    </div>
  );
}

const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="flex min-w-0 flex-col gap-1 text-sm">
    <span className="font-medium">
      {label} {hint && <span className="font-normal text-stone-500">{hint}</span>}
    </span>
    {children}
  </label>
);

/* ------------------------------ advance / instalment ------------------------------ */

/** Adds or edits a payment on the schedule. `editing` null = a new one. */
export function InstalmentDialog({ projectId, open, editing, onClose }: { projectId: string; open: boolean; editing: Instalment | null; onClose: () => void }) {
  return (
    <ModalDialog open={open} onClose={onClose} label={editing ? "Edit payment" : "Add a payment"}>
      <InstalmentForm projectId={projectId} editing={editing} onClose={onClose} />
    </ModalDialog>
  );
}

function InstalmentForm({ projectId, editing, onClose }: { projectId: string; editing: Instalment | null; onClose: () => void }) {
  const save = useSaveInstalment(projectId);
  const [isAdvance, setIsAdvance] = useState(editing ? editing.kind === "ADVANCE" : false);
  const [label, setLabel] = useState(editing?.label ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [tax, setTax] = useState(editing ? String(editing.taxPercent) : "0");
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? todayKey());
  const [problem, setProblem] = useState<string | null>(null);

  const amountNum = Number(amount.replace(/,/g, ""));
  const taxNum = Number(tax || 0);
  const total = Number.isFinite(amountNum) ? amountNum * (1 + (Number.isFinite(taxNum) ? taxNum : 0) / 100) : 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (save.isPending) return;
    if (!label.trim()) return setProblem("Give it a name, like “Plinth complete”.");
    if (!Number.isFinite(amountNum) || amountNum <= 0) return setProblem("Enter the amount.");
    if (!Number.isFinite(taxNum) || taxNum < 0 || taxNum > 50) return setProblem("GST should be between 0 and 50%.");
    if (!isAdvance && !dueDate && !editing?.dueAtProgress) return setProblem("Pick the date it's due.");
    setProblem(null);
    const input: InstalmentInput = {
      label: label.trim(),
      kind: isAdvance ? "ADVANCE" : "INSTALMENT",
      amount: Math.round(amountNum * 100) / 100,
      taxPercent: taxNum,
      dueDate: dueDate || null,
      // Not asked for any more; an older payment keeps what it had
      dueAtProgress: editing?.dueAtProgress ?? null,
      note: editing?.note ?? "",
    };
    save.mutate({ id: editing?.id ?? null, input }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={submit} className="min-w-0">
      <DialogHeader title={editing ? `Edit ${editing.label}` : "Add a payment"} onClose={onClose} locked={save.isPending} />
      <div className="flex min-w-0 flex-col gap-4 px-4 py-4 sm:px-5">
        <Field label="Name">
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder={isAdvance ? "Advance" : "Plinth complete"} className={inputClass} />
        </Field>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
          <Field label="Amount (₹)">
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="200000" className={inputClass} />
          </Field>
          <Field label="GST %">
            <input inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Due on">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${inputClass} min-w-0`} />
        </Field>
        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-stone-200 px-3 text-sm">
          <input type="checkbox" checked={isAdvance} onChange={(e) => setIsAdvance(e.target.checked)} className="h-5 w-5 accent-stone-900" />
          <span>
            This is the <b className="font-semibold">advance</b> <span className="text-stone-500">(work waits for it)</span>
          </span>
        </label>
        <p className="rounded-lg bg-stone-50 px-3 py-2.5 text-sm text-stone-700">
          Client pays <span className="font-semibold text-stone-900">{inr(total)}</span>
          {taxNum > 0 && ` (incl. ${taxNum}% GST)`}
        </p>
        {(problem || save.isError) && <ErrorBox>{problem ?? describeError(save.error)}</ErrorBox>}
      </div>
      <Footer onClose={onClose} busy={save.isPending} submit={editing ? "Save" : "Add payment"} />
    </form>
  );
}

/* --------------------------------- record payment --------------------------------- */

/** Money received without a client upload (cash, a cheque handed over): counts as paid at once */
export function RecordPaymentDialog({ instalment, onClose }: { instalment: Instalment | null; onClose: () => void }) {
  return (
    <ModalDialog open={!!instalment} onClose={onClose} label="Record a payment" size="lg">
      {instalment && <RecordForm instalment={instalment} onClose={onClose} />}
    </ModalDialog>
  );
}

function RecordForm({ instalment, onClose }: { instalment: Instalment; onClose: () => void }) {
  const record = useRecordPayment();
  const [draft, setDraft] = useState<PaymentDraft>(() => ({ ...emptyDraft(instalment.remaining), mode: "BANK_TRANSFER" }));
  const [problem, setProblem] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (record.isPending) return;
    const read = readDraft(draft, instalment.remaining);
    if ("error" in read) return setProblem(read.error);
    setProblem(null);
    record.mutate({ id: instalment.id, input: read.input }, { onSuccess: onClose });
  };
  return (
    <form onSubmit={submit}>
      <DialogHeader title="Record a payment received" subtitle={`${instalment.label} · ${inr(instalment.remaining)} left`} onClose={onClose} locked={record.isPending} />
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <PaymentFields value={draft} onChange={setDraft} disabled={record.isPending} />
        <p className="text-xs text-stone-500">For money that reached the account without a screenshot from the client. It counts as paid straight away.</p>
        {(problem || record.isError) && <ErrorBox>{problem ?? describeError(record.error)}</ErrorBox>}
      </div>
      <Footer onClose={onClose} busy={record.isPending} submit="Record payment" />
    </form>
  );
}

/* ---------------------------------- reject proof ---------------------------------- */

const REJECT_REASONS = ["The amount hasn't reached our account yet", "The screenshot isn't readable", "The amount doesn't match", "The transaction reference doesn't match"];

/** Rejecting needs a reason: the client sees it and can send the payment again */
export function RejectDialog({ proofId, onClose }: { proofId: string | null; onClose: () => void }) {
  return (
    <ModalDialog open={!!proofId} onClose={onClose} label="Reject payment">
      {proofId && <RejectForm proofId={proofId} onClose={onClose} />}
    </ModalDialog>
  );
}

function RejectForm({ proofId, onClose }: { proofId: string; onClose: () => void }) {
  const decide = useDecideProof();
  const [note, setNote] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim() || decide.isPending) return;
    decide.mutate({ id: proofId, approve: false, note: note.trim() }, { onSuccess: onClose });
  };
  return (
    <form onSubmit={submit}>
      <DialogHeader title="Reject this payment" subtitle="The client sees your reason and can upload it again" onClose={onClose} locked={decide.isPending} />
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap gap-2">
          {REJECT_REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setNote(r)} className="rounded-full border border-stone-200 px-3 py-1 text-xs hover:bg-stone-50">
              {r}
            </button>
          ))}
        </div>
        <Field label="Reason">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300} required className={inputClass} />
        </Field>
        {decide.isError && <ErrorBox>{describeError(decide.error)}</ErrorBox>}
      </div>
      <Footer onClose={onClose} busy={decide.isPending} submit="Reject" />
    </form>
  );
}

/* ------------------------------------ delay ------------------------------------ */

const PRESETS = [7, 14, 30];
const SUGGESTED: Record<DelayReason, string> = {
  MONSOON: "Heavy monsoon rain",
  FESTIVAL: "Festival holidays",
  NATURAL: "Bad weather at site",
  OTHER: "Work stopped for a while",
};

/** Extends the schedule: unfinished work and unpaid payment dates move later by the chosen days. A week unless changed. */
export function DelayDialog({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  return (
    <ModalDialog open={open} onClose={onClose} label="Extend the work">
      <DelayForm projectId={projectId} onClose={onClose} />
    </ModalDialog>
  );
}

function DelayForm({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const add = useAddDelay(projectId);
  const [reason, setReason] = useState<DelayReason>("MONSOON");
  const [fromDate, setFromDate] = useState(todayKey());
  const [days, setDays] = useState(7);
  const [otherReason, setOtherReason] = useState(""); // only for "Other": the client sees it
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (add.isPending) return;
    if (reason === "OTHER" && !otherReason.trim()) {
      setProblem("Write the reason.");
      document.getElementById("delay-other-reason")?.focus();
      return;
    }
    if (!Number.isInteger(days) || days < 1 || days > 120) return setProblem("Choose between 1 and 120 days.");
    setProblem(null);
    // What the client sees: the reason written for "Other", otherwise a plain one ("Heavy monsoon rain"…)
    const title = reason === "OTHER" ? otherReason.trim() : SUGGESTED[reason];
    add.mutate({ reason, title, note: "", fromDate, days }, { onSuccess: onClose });
  };

  const chip = (on: boolean) => `h-11 min-w-0 rounded-lg border px-2 text-sm font-semibold ${on ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 hover:bg-stone-50"}`;

  return (
    <form onSubmit={submit} className="min-w-0">
      <DialogHeader title="Extend the work" onClose={onClose} locked={add.isPending} />
      <div className="flex min-w-0 flex-col gap-4 px-4 py-4 sm:px-5">
        <div>
          <p className="mb-1.5 text-sm font-medium">Why</p>
          <div role="radiogroup" aria-label="Why" className="grid grid-cols-2 gap-2">
            {(Object.keys(REASON_LABEL) as DelayReason[]).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                onClick={() => {
                  setReason(r);
                  setProblem(null);
                }}
                className={chip(reason === r)}
              >
                {REASON_LABEL[r]}
              </button>
            ))}
          </div>
          {reason === "OTHER" && (
            <div className="mt-2">
              <Field label="Reason" hint="(the client sees this)">
                <input
                  id="delay-other-reason"
                  value={otherReason}
                  onChange={(e) => {
                    setOtherReason(e.target.value);
                    setProblem(null);
                  }}
                  maxLength={100}
                  autoFocus
                  placeholder="e.g. Material shortage"
                  aria-invalid={!!problem && !otherReason.trim()}
                  className={inputClass}
                />
              </Field>
            </div>
          )}
        </div>
        <Field label="Work stopped on">
          <input type="date" required value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={`${inputClass} min-w-0`} />
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium">Extend by</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button key={p} type="button" aria-pressed={days === p} onClick={() => setDays(p)} className={chip(days === p)}>
                {p === 7 ? "1 week" : p === 14 ? "2 weeks" : p === 30 ? "1 month" : `${p} days`}
              </button>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-stone-600">
            or
            <input type="number" min={1} max={120} value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${inputClass.replace("w-full", "")} w-20`} aria-label="Days" />
            days
          </label>
        </div>
        <p className="rounded-lg bg-stone-50 px-3 py-2.5 text-sm text-stone-700">
          Work and unpaid payments from <strong>{fromDate ? dayLabel(fromDate) : "that day"}</strong> move <strong>{days} {days === 1 ? "day" : "days"}</strong> later.
        </p>
        {(problem || add.isError) && <ErrorBox>{problem ?? describeError(add.error)}</ErrorBox>}
      </div>
      <Footer onClose={onClose} busy={add.isPending} submit={`Extend by ${days} ${days === 1 ? "day" : "days"}`} />
    </form>
  );
}