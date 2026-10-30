"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { describeError } from "@/lib/api";
import { REASON_LABEL, type DelayReason, type Instalment, type InstalmentInput, type InstalmentKind } from "@/lib/client/types";
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
  <label className="flex flex-col gap-1 text-sm">
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
    <ModalDialog open={open} onClose={onClose} label={editing ? "Edit payment" : "Add a payment"} size="lg">
      <InstalmentForm projectId={projectId} editing={editing} onClose={onClose} />
    </ModalDialog>
  );
}

function InstalmentForm({ projectId, editing, onClose }: { projectId: string; editing: Instalment | null; onClose: () => void }) {
  const save = useSaveInstalment(projectId);
  const [kind, setKind] = useState<InstalmentKind>(editing?.kind ?? "INSTALMENT");
  const [label, setLabel] = useState(editing?.label ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [tax, setTax] = useState(editing ? String(editing.taxPercent) : "18");
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? "");
  const [atProgress, setAtProgress] = useState(editing?.dueAtProgress ? String(editing.dueAtProgress) : "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [problem, setProblem] = useState<string | null>(null);

  const amountNum = Number(amount.replace(/,/g, ""));
  const taxNum = Number(tax || 0);
  const total = Number.isFinite(amountNum) ? amountNum * (1 + (Number.isFinite(taxNum) ? taxNum : 0) / 100) : 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (save.isPending) return;
    const progress = atProgress ? Number(atProgress) : null;
    if (!label.trim()) return setProblem("Give it a name, like “Plinth complete”.");
    if (!Number.isFinite(amountNum) || amountNum <= 0) return setProblem("Enter the amount.");
    if (!Number.isFinite(taxNum) || taxNum < 0 || taxNum > 50) return setProblem("GST should be between 0 and 50%.");
    if (progress !== null && (!Number.isInteger(progress) || progress < 1 || progress > 100)) return setProblem("The work % should be a whole number from 1 to 100.");
    if (kind === "INSTALMENT" && !dueDate && progress === null) return setProblem("Give a due date, a work %, or both (whichever comes first).");
    setProblem(null);
    const input: InstalmentInput = { label: label.trim(), kind, amount: Math.round(amountNum * 100) / 100, taxPercent: taxNum, dueDate: dueDate || null, dueAtProgress: progress, note: note.trim() };
    save.mutate({ id: editing?.id ?? null, input }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={submit}>
      <DialogHeader title={editing ? `Edit ${editing.invoiceNo}` : "Add a payment"} subtitle="Each payment is an invoice the client can open and pay" onClose={onClose} locked={save.isPending} />
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-2">
          {(
            [
              ["ADVANCE", "Advance", "Asked for now. Work waits for it."],
              ["INSTALMENT", "Instalment", "Due on a date or at a work %."],
            ] as const
          ).map(([value, title, help]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              onClick={() => setKind(value)}
              className={`rounded-lg border p-3 text-left text-sm ${kind === value ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 hover:bg-stone-50"}`}
            >
              <span className="block font-semibold">{title}</span>
              <span className={`block text-xs ${kind === value ? "text-stone-300" : "text-stone-500"}`}>{help}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder={kind === "ADVANCE" ? "Advance" : "Plinth complete"} className={inputClass} />
          </Field>
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <Field label="Amount (₹)" hint="before GST">
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
            </Field>
            <Field label="GST %">
              <input inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Due date" hint={kind === "ADVANCE" ? "(optional)" : undefined}>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </Field>
          {kind === "INSTALMENT" && (
            <Field label="Or when work reaches" hint="(%)">
              <input inputMode="numeric" value={atProgress} onChange={(e) => setAtProgress(e.target.value)} placeholder="e.g. 40" className={inputClass} />
            </Field>
          )}
          <div className="sm:col-span-2">
            <Field label="Note on the invoice" hint="(optional)">
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={inputClass} />
            </Field>
          </div>
        </div>
        <p className="text-sm text-stone-600">
          Client pays <span className="font-semibold text-stone-900">{inr(total)}</span>
          {taxNum > 0 && ` (incl. ${taxNum}% GST)`}
          {kind === "INSTALMENT" && dueDate && atProgress && ", on the date or at the work %, whichever comes first"}.
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
      <DialogHeader title="Record a payment received" subtitle={`${instalment.invoiceNo} · ${instalment.label} · ${inr(instalment.remaining)} left`} onClose={onClose} locked={record.isPending} />
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

const PRESETS = [3, 7, 14, 21];
const SUGGESTED: Record<DelayReason, string> = {
  MONSOON: "Heavy monsoon rain",
  FESTIVAL: "Festival holidays",
  NATURAL: "Flooding at site",
  OTHER: "",
};

/** Extends the schedule: unfinished work and unpaid payment dates move later by the chosen days. A week unless changed. */
export function DelayDialog({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  return (
    <ModalDialog open={open} onClose={onClose} label="Extend the schedule" size="lg">
      <DelayForm projectId={projectId} onClose={onClose} />
    </ModalDialog>
  );
}

function DelayForm({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const add = useAddDelay(projectId);
  const [reason, setReason] = useState<DelayReason>("MONSOON");
  const [title, setTitle] = useState(SUGGESTED.MONSOON);
  const [fromDate, setFromDate] = useState(todayKey());
  const [days, setDays] = useState(7);
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const pickReason = (r: DelayReason) => {
    // Swap the suggested title along with the reason, unless the admin wrote their own
    if (!title || Object.values(SUGGESTED).includes(title)) setTitle(SUGGESTED[r]);
    setReason(r);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (add.isPending) return;
    if (!title.trim()) return setProblem("Say what happened, in a few words. The client sees it.");
    if (!Number.isInteger(days) || days < 1 || days > 120) return setProblem("Choose between 1 and 120 days.");
    setProblem(null);
    add.mutate({ reason, title: title.trim(), note: note.trim(), fromDate, days }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={submit}>
      <DialogHeader title="Extend the schedule" subtitle="For delays nobody controls: monsoon, festivals, weather" onClose={onClose} locked={add.isPending} />
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <div role="radiogroup" aria-label="Reason" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(REASON_LABEL) as DelayReason[]).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => pickReason(r)}
              className={`h-10 rounded-lg border text-sm font-semibold ${reason === r ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 hover:bg-stone-50"}`}
            >
              {REASON_LABEL[r]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="What happened" hint="(the client sees this)">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} className={inputClass} />
          </Field>
          <Field label="Work stopped from">
            <input type="date" required value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Extend by</p>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={days === p}
                onClick={() => setDays(p)}
                className={`h-10 rounded-lg border px-4 text-sm font-semibold ${days === p ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 hover:bg-stone-50"}`}
              >
                {p === 7 ? "1 week" : p === 14 ? "2 weeks" : p === 21 ? "3 weeks" : `${p} days`}
              </button>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="number" min={1} max={120} value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${inputClass} w-20`} aria-label="Days" />
              days
            </label>
          </div>
        </div>
        <Field label="Note" hint="(optional)">
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={inputClass} />
        </Field>
        <p className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
          Unfinished work running on or after <strong>{fromDate ? dayLabel(fromDate) : "that day"}</strong> moves {days} {days === 1 ? "day" : "days"} later, and so do unpaid payment dates. Finished work and
          payments already made stay as they are. The client sees the extension and the reason.
        </p>
        {(problem || add.isError) && <ErrorBox>{problem ?? describeError(add.error)}</ErrorBox>}
      </div>
      <Footer onClose={onClose} busy={add.isPending} submit={`Extend by ${days} ${days === 1 ? "day" : "days"}`} />
    </form>
  );
}
