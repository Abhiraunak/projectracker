"use client";

import { useState, type FormEvent } from "react";
import { FiCalendar, FiCheck, FiCopy, FiEdit2, FiKey, FiPlus, FiSend, FiTrash2, FiX } from "react-icons/fi";
import { describeError } from "@/lib/api";
import { pct } from "@/lib/dashboard/format";
import { REASON_LABEL, type ClientProject, type Instalment } from "@/lib/client/types";
import {
  useAddClient,
  useClientProject,
  useDecideProof,
  useDeleteInstalment,
  useRemoveClient,
  useRequestPayment,
  useResetClientPassword,
  useSetAdvance,
} from "@/hooks/useClientAdmin";
import { PaymentSchedule } from "@/components/client/PaymentSchedule";
import { Card, Empty, ErrorBox, Pill, dayLabel, focusRing, inputClass, inr, primaryButton, secondaryButton } from "@/components/client/ui";
import { DelayDialog, InstalmentDialog, RecordPaymentDialog, RejectDialog } from "./Dialogs";
import { SHOW_CLIENT_LOGINS, SHOW_PAYMENT_CHECKS } from "./flags";

const small = `inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50 ${focusRing}`;

/** Everything about one project's client: who can log in, what they owe, what they paid, and schedule extensions */
export function ProjectPanel({ projectId }: { projectId: string }) {
  const query = useClientProject(projectId);
  if (query.isPending) return <div aria-busy="true" className="h-96 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />;
  if (query.isError) return <ErrorBox>{describeError(query.error)}</ErrorBox>;
  return (
    <div className={`flex flex-col gap-4 ${query.isPlaceholderData ? "opacity-60 transition-opacity" : ""}`}>
      <AdvanceBanner data={query.data} />
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Schedule data={query.data} />
        </div>
        <div className="flex flex-col gap-4">
          {SHOW_CLIENT_LOGINS && <Clients data={query.data} />}
          <Delays data={query.data} />
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------- advance ----------------------------------- */

function AdvanceBanner({ data }: { data: ClientProject }) {
  const set = useSetAdvance(data.project.id);
  const advance = data.instalments.find((i) => i.kind === "ADVANCE");
  if (data.advance === "No advance") {
    return (
      <p className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
        No advance on this project. Add one to the payment schedule if the client should pay before work starts.
      </p>
    );
  }
  if (data.advance === "Advance paid") {
    return <p className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">Advance received: work can go ahead.</p>;
  }
  const waiting = data.advance === "Waiting for advance";
  return (
    <div className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${waiting ? "border-orange-200 bg-orange-50 text-orange-900" : "border-stone-200 bg-stone-50 text-stone-800"}`}>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{waiting ? "Waiting for the advance before work starts" : "Work started without the advance"}</p>
        <p className="text-sm opacity-80">
          {advance ? `${inr(advance.remaining)} still to come${advance.checking > 0 ? `, ${inr(advance.checking)} being checked` : ""}` : ""}
        </p>
      </div>
      <button type="button" disabled={set.isPending} onClick={() => set.mutate(waiting)} className={waiting ? primaryButton : secondaryButton}>
        {waiting ? "Start work anyway" : "Wait for the advance again"}
      </button>
      {set.isError && <ErrorBox>{describeError(set.error)}</ErrorBox>}
    </div>
  );
}

/* ---------------------------------- schedule ---------------------------------- */

function Schedule({ data }: { data: ClientProject }) {
  const [editing, setEditing] = useState<Instalment | null>(null);
  const [adding, setAdding] = useState(false);
  const [recording, setRecording] = useState<Instalment | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const request = useRequestPayment();
  const remove = useDeleteInstalment();
  const decide = useDecideProof();
  const p = data.payments;
  const error = request.error ?? remove.error ?? decide.error;

  return (
    <Card
      title="Payment schedule"
      sub={`${inr(p.paid)} received of ${inr(p.contract)} · ${inr(p.dueNow)} due now${p.overdue ? ` · ${inr(p.overdue)} overdue` : ""} · work ${pct(data.schedule.done)} done`}
      right={
        <button type="button" onClick={() => setAdding(true)} className={small}>
          <FiPlus aria-hidden /> Add payment
        </button>
      }
    >
      <PaymentSchedule
        instalments={data.instalments}
        emptyText="No payments yet. Add the advance first, then the instalments."
        actions={(i) => (
          <>
            {i.status !== "Paid" && (
              <>
                {!i.isDue && (
                  <button type="button" disabled={request.isPending} onClick={() => request.mutate(i.id)} className={small} title="Make it due now: the client has 7 days to pay">
                    <FiSend aria-hidden /> Ask now
                  </button>
                )}
                <button type="button" onClick={() => setRecording(i)} className={small}>
                  Received
                </button>
              </>
            )}
            <button type="button" onClick={() => setEditing(i)} className={small} aria-label={`Edit ${i.label}`}>
              <FiEdit2 aria-hidden />
            </button>
            {i.proofs.every((x) => x.status === "REJECTED") && (
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => window.confirm(`Remove the payment "${i.label}"?`) && remove.mutate(i.id)}
                className={small}
                aria-label={`Remove ${i.label}`}
              >
                <FiTrash2 aria-hidden />
              </button>
            )}
          </>
        )}
        proofActions={(proof) =>
          SHOW_PAYMENT_CHECKS && proof.status === "PENDING" ? (
            <>
              <button type="button" disabled={decide.isPending} onClick={() => setRejecting(proof.id)} className={small}>
                <FiX aria-hidden /> Reject
              </button>
              <button
                type="button"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ id: proof.id, approve: true, note: "" })}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg bg-green-700 px-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 ${focusRing}`}
              >
                <FiCheck aria-hidden /> Approve
              </button>
            </>
          ) : null
        }
      />
      {error && (
        <div className="px-4 pb-4">
          <ErrorBox>{describeError(error)}</ErrorBox>
        </div>
      )}
      <InstalmentDialog projectId={data.project.id} open={adding || !!editing} editing={editing} onClose={() => (setAdding(false), setEditing(null))} />
      <RecordPaymentDialog instalment={recording} onClose={() => setRecording(null)} />
      <RejectDialog proofId={rejecting} onClose={() => setRejecting(null)} />
    </Card>
  );
}

/* ---------------------------------- clients ---------------------------------- */

/** A one-time password, shown once, with a copy button and a ready-to-send message */
function PasswordNote({ email, password, onDone }: { email: string; password: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const site = typeof window === "undefined" ? "" : window.location.origin;
  const message = `Your project portal is ready.\nSign in at ${site}/signin\nEmail: ${email}\nPassword: ${password}`;
  return (
    <div className="m-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
      <p className="font-semibold">Send these sign-in details to the client</p>
      <p className="mt-1 break-all">
        {email} · <span className="font-mono font-semibold">{password}</span>
      </p>
      <p className="mt-1 text-xs">This password is shown only now. You can reset it later if it gets lost.</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(message).then(() => setCopied(true), () => setCopied(false))}
          className={small}
        >
          <FiCopy aria-hidden /> {copied ? "Copied" : "Copy message"}
        </button>
        <button type="button" onClick={onDone} className={small}>
          Done
        </button>
      </div>
    </div>
  );
}

function Clients({ data }: { data: ClientProject }) {
  const add = useAddClient(data.project.id);
  const remove = useRemoveClient(data.project.id);
  const reset = useResetClientPassword();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [shown, setShown] = useState<{ email: string; password: string } | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || add.isPending) return;
    add.mutate(
      { email: email.trim(), name: name.trim() },
      {
        onSuccess: (r) => {
          setEmail("");
          setName("");
          if (r.password) setShown({ email: r.email, password: r.password });
        },
      }
    );
  };

  return (
    <Card title="Client logins" sub="People who can see this project in the client portal">
      {shown && <PasswordNote {...shown} onDone={() => setShown(null)} />}
      {data.clients.length === 0 ? (
        <Empty>No client can see this project yet.</Empty>
      ) : (
        <ul className="divide-y divide-stone-100">
          {data.clients.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{c.name || c.email}</span>
                {c.name && <span className="block truncate text-xs text-stone-500">{c.email}</span>}
              </span>
              <button
                type="button"
                disabled={reset.isPending}
                onClick={() => window.confirm(`Give ${c.email} a new password? Their old one stops working.`) && reset.mutate(c.id, { onSuccess: (r) => setShown(r) })}
                className={small}
                aria-label={`New password for ${c.email}`}
                title="New password"
              >
                <FiKey aria-hidden />
              </button>
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => window.confirm(`Stop ${c.email} seeing this project?`) && remove.mutate(c.id)}
                className={small}
                aria-label={`Remove ${c.email}`}
                title="Remove"
              >
                <FiTrash2 aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex flex-col gap-2 border-t border-stone-100 p-4">
        <label className="text-sm">
          <span className="sr-only">Client email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@email.com" className={inputClass} />
        </label>
        <div className="flex gap-2">
          <label className="min-w-0 flex-1 text-sm">
            <span className="sr-only">Client name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" maxLength={80} className={inputClass} />
          </label>
          <button type="submit" disabled={add.isPending} className={primaryButton}>
            <FiPlus aria-hidden /> Add
          </button>
        </div>
        {(add.isError || remove.isError || reset.isError) && <ErrorBox>{describeError(add.error ?? remove.error ?? reset.error)}</ErrorBox>}
      </form>
    </Card>
  );
}

/* ----------------------------------- delays ----------------------------------- */

function Delays({ data }: { data: ClientProject }) {
  const [open, setOpen] = useState(false);
  return (
    <Card
      title="Schedule extensions"
      sub={data.schedule.finish ? `Finish now ${dayLabel(data.schedule.finish)}${data.delayDays ? ` · +${data.delayDays} days so far` : ""}` : "No work dates yet"}
      right={
        <button type="button" onClick={() => setOpen(true)} className={small}>
          <FiCalendar aria-hidden /> Extend
        </button>
      }
    >
      {data.delays.length === 0 ? (
        <Empty>Monsoon, festival or weather stoppage? Extend the schedule and the client sees why.</Empty>
      ) : (
        <ul className="divide-y divide-stone-100">
          {data.delays.map((d) => (
            <li key={d.id} className="px-4 py-2.5 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{d.title}</span>
                <Pill tone="blue">+{d.days} days</Pill>
              </p>
              <p className="text-xs text-stone-500">
                {REASON_LABEL[d.reason]} · from {dayLabel(d.fromDate)} · moved {d.tasksMoved} work items, {d.paymentsMoved} payment dates · by {d.by}
              </p>
            </li>
          ))}
        </ul>
      )}
      <DelayDialog projectId={data.project.id} open={open} onClose={() => setOpen(false)} />
    </Card>
  );
}