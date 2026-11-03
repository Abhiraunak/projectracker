"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FiChevronDown, FiFileText, FiImage, FiPaperclip, FiPlus, FiTrash2 } from "react-icons/fi";
import { ChipInput } from "@/components/utilites/ChipInput";
import { useCan } from "@/hooks/useProjectAccess";
import { useAddPayment, usePayments, useRemovePayment } from "@/hooks/useLabour";
import { describeError } from "@/lib/api";
import { rupees, shortDate } from "@/lib/projects/hub";
import type { ContractorLedger, ContractorPayment, PaymentBook } from "@/lib/projects/labour";
import { EmptyState, SectionError, SectionSkeleton } from "../../ui";

const field = "mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:outline-none";
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const lineKey = (trade: string, name: string) => `${trade.trim().toLowerCase()}|${name.trim().toLowerCase()}`;

/** Local date: toISOString() would give yesterday early in the morning in India */
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Money paid to labour contractors. Each payment: trade, contractor, amount, date, an optional remark and an optional
 * receipt (photo or PDF). Below the form, every trade with its contractors: what attendance says they earned, what
 * was paid, and what is still owed. Open a contractor to see each payment.
 */
export function PaymentsPanel({ projectId }: { projectId: string }) {
  const book = usePayments(projectId);
  const canPay = useCan("project.manage");
  const [prefill, setPrefill] = useState<{ trade: string; name: string; n: number } | null>(null);

  if (book.isPending) return <SectionSkeleton />;
  if (book.isError) return <SectionError error={book.error} onRetry={() => void book.refetch()} />;
  const { totals } = book.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-stone-600">
        <span>
          Earned (attendance) <span className="ml-1 font-semibold tabular-nums text-stone-900">{rupees(totals.earned)}</span>
        </span>
        <span>
          Paid <span className="ml-1 font-semibold tabular-nums text-stone-900">{rupees(totals.paid)}</span>
        </span>
        <span>
          Still to pay <span className={`ml-1 font-semibold tabular-nums ${totals.balance > 0 ? "text-amber-700" : "text-stone-900"}`}>{rupees(Math.max(totals.balance, 0))}</span>
        </span>
      </div>

      {canPay && <PaymentForm key={prefill?.n ?? 0} projectId={projectId} book={book.data} prefill={prefill} />}

      <Ledger book={book.data} projectId={projectId} canPay={canPay} onPay={(trade, name) => setPrefill((p) => ({ trade, name, n: (p?.n ?? 0) + 1 }))} />
    </div>
  );
}

/* ---------------------------------- the form ---------------------------------- */

function PaymentForm({ projectId, book, prefill }: { projectId: string; book: PaymentBook; prefill: { trade: string; name: string } | null }) {
  const add = useAddPayment(projectId);
  const [trade, setTrade] = useState(prefill?.trade ?? "");
  const [name, setName] = useState(prefill?.name ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [remark, setRemark] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Contractors to tap: the ones in the chosen trade (or all, when no trade is picked), most owed first
  const people = useMemo(() => {
    const list = book.contractors.filter((c) => !trade || same(c.trade, trade));
    return [...new Set(list.map((c) => c.contractorName))].slice(0, 12);
  }, [book.contractors, trade]);

  // Opened from "Pay" on a contractor: bring the form into view with the amount ready to type
  useEffect(() => {
    if (!prefill) return;
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("pay-amount")?.focus({ preventScroll: true });
  }, [prefill]);

  const owed = book.contractors.find((c) => same(c.contractorName, name) && (!trade || same(c.trade, trade)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(null);
    if (!name.trim()) {
      setProblem("Enter the contractor's name.");
      document.getElementById("pay-name")?.focus();
      return;
    }
    if (!(Number(amount) > 0)) {
      setProblem("Enter an amount above zero.");
      document.getElementById("pay-amount")?.focus();
      return;
    }
    setProblem(null);
    try {
      const p = await add.mutateAsync({ trade, contractorName: name.trim(), amount: Number(amount), date, remark: remark.trim(), proof });
      setSaved(`${rupees(p.amount)} paid to ${p.contractorName} on ${shortDate(p.date)} saved.`);
      // Trade and date stay for the next payment of the day
      setName("");
      setAmount("");
      setRemark("");
      setProof(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      /* shown below */
    }
  };

  return (
    <form ref={formRef} onSubmit={submit} className="scroll-mt-28 space-y-4 rounded-xl border border-stone-200 p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
        <FiPlus aria-hidden className="text-stone-500" /> Record a payment
      </h3>

      <div>
        <span id="pay-trade-label" className="text-sm font-medium text-stone-700">
          Trade <span className="font-normal text-stone-400">(optional)</span>
        </span>
        <div className="mt-1.5">
          <ChipInput id="pay-trade" value={trade} onChange={setTrade} choices={book.trades} storageKey={`attendance-trades:${projectId}`} labelledBy="pay-trade-label" size="sm" />
        </div>
      </div>

      {/* The contractor, with the names already used to tap, and what they are owed */}
      <div>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Contractor</span>
          <input
            id="pay-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoComplete="off"
            placeholder="Suresh Yadav"
            className={field}
          />
        </label>
        {people.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Contractors in this trade">
            {people.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={same(p, name)}
                onClick={() => setName(p)}
                className={`min-h-8 rounded-full border px-3 text-xs font-medium transition-colors ${
                  same(p, name) ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 text-stone-600 hover:border-stone-500 hover:text-stone-900"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
        {owed && (
          <p className="mt-2 text-xs text-stone-500" aria-live="polite">
            {owed.contractorName}: earned {rupees(owed.earned)}, paid {rupees(owed.paid)}
            {owed.balance > 0 ? (
              <>
                {" · "}
                <button type="button" onClick={() => setAmount(String(owed.balance))} className="font-medium text-amber-700 underline underline-offset-2">
                  {rupees(owed.balance)} still to pay
                </button>
              </>
            ) : owed.balance < 0 ? (
              ` · ${rupees(-owed.balance)} paid in advance`
            ) : (
              " · paid up"
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-[9rem_9.5rem_minmax(0,1fr)]">
        <label className="text-sm">
          <span className="font-medium text-stone-700">Amount</span>
          <input
            id="pay-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="₹"
            className={`${field} tabular-nums`}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-stone-700">Date paid</span>
          <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} required className={field} />
        </label>
        <label className="col-span-2 text-sm md:col-span-1">
          <span className="font-medium text-stone-700">
            Remark <span className="font-normal text-stone-400">(optional)</span>
          </span>
          <input value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={500} placeholder="Week 2 settlement, by UPI" className={field} />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-stone-300 px-3 text-sm text-stone-700 hover:border-stone-500">
          <FiPaperclip aria-hidden className="text-stone-400" />
          <span className="max-w-56 truncate">{proof ? proof.name : "Attach PDF or photo (optional)"}</span>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={(e) => setProof(e.target.files?.[0] ?? null)} className="sr-only" />
        </label>
        <button type="submit" disabled={add.isPending} className="min-h-11 rounded-lg bg-stone-900 px-5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
          {add.isPending ? "Saving…" : "Save payment"}
        </button>
      </div>

      {(problem || add.isError) && (
        <p role="alert" className="text-sm text-red-700">
          {problem ?? describeError(add.error)}
        </p>
      )}
      {saved && !problem && !add.isError && (
        <p role="status" className="text-sm text-green-700">
          {saved}
        </p>
      )}
    </form>
  );
}

/* --------------------------------- the ledger --------------------------------- */

function Ledger({ book, projectId, canPay, onPay }: { book: PaymentBook; projectId: string; canPay: boolean; onPay: (trade: string, name: string) => void }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  // Payments by contractor line, newest first (the list already comes newest first)
  const byLine = useMemo(() => {
    const m = new Map<string, ContractorPayment[]>();
    for (const p of book.items) {
      const k = lineKey(p.trade, p.contractorName);
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return m;
  }, [book.items]);

  const groups = useMemo(() => {
    const g: { trade: string; lines: ContractorLedger[] }[] = [];
    for (const c of book.contractors) {
      const last = g[g.length - 1];
      if (last && same(last.trade, c.trade)) last.lines.push(c);
      else g.push({ trade: c.trade, lines: [c] });
    }
    return g;
  }, [book.contractors]);

  if (groups.length === 0) return <EmptyState title="No contractors yet" hint="They appear here once attendance or a payment is recorded for them." />;

  const toggle = (k: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="space-y-5">
      {groups.map((g) => {
        const owed = g.lines.reduce((s, c) => s + Math.max(c.balance, 0), 0);
        return (
          <section key={g.trade || "-"} aria-label={g.trade || "Trade not set"}>
            <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
              <h3 className="text-sm font-semibold text-stone-900">
                {g.trade || "Trade not set"}
                <span className="ml-2 text-xs font-normal text-stone-500">
                  {g.lines.length} {g.lines.length === 1 ? "contractor" : "contractors"}
                </span>
              </h3>
              {owed > 0 && <span className="text-xs tabular-nums text-amber-700">{rupees(owed)} to pay</span>}
            </div>
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
              {g.lines.map((c) => {
                const k = lineKey(c.trade, c.contractorName);
                const payments = byLine.get(k) ?? [];
                const isOpen = open.has(k);
                return (
                  <li key={k}>
                    <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
                      <button
                        type="button"
                        onClick={() => toggle(k)}
                        aria-expanded={isOpen}
                        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                      >
                        <FiChevronDown aria-hidden className={`shrink-0 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-stone-900">{c.contractorName}</span>
                          <span className="block text-xs tabular-nums text-stone-500">
                            Earned {rupees(c.earned)} · Paid {rupees(c.paid)}
                            {payments.length > 0 && ` in ${payments.length}`}
                            {c.lastPaid && <span className="hidden sm:inline"> · last {shortDate(c.lastPaid)}</span>}
                          </span>
                          {/* Phones: the balance goes under the name so the figures keep their line */}
                          <span className="mt-1 block sm:hidden">
                            <Balance value={c.balance} />
                          </span>
                        </span>
                        <span className="hidden sm:block">
                          <Balance value={c.balance} />
                        </span>
                      </button>
                      {canPay && (
                        <button
                          type="button"
                          onClick={() => onPay(c.trade, c.contractorName)}
                          className="min-h-9 shrink-0 rounded-lg border border-stone-300 px-3 text-xs font-medium text-stone-700 hover:border-stone-500 hover:text-stone-900"
                        >
                          Pay
                        </button>
                      )}
                    </div>
                    {isOpen && <PaymentList payments={payments} projectId={projectId} canPay={canPay} />}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Balance({ value }: { value: number }) {
  if (value > 0) return <span className="inline-block shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-800">{rupees(value)} to pay</span>;
  if (value < 0) return <span className="inline-block shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-sky-800">{rupees(-value)} advance</span>;
  return <span className="inline-block shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">Paid up</span>;
}

function PaymentList({ payments, projectId, canPay }: { payments: ContractorPayment[]; projectId: string; canPay: boolean }) {
  const remove = useRemovePayment(projectId);
  if (payments.length === 0) return <p className="border-t border-stone-100 bg-stone-50/60 px-4 py-3 text-sm text-stone-500 sm:pl-11">No payments yet.</p>;
  return (
    <div className="border-t border-stone-100 bg-stone-50/60">
      <ul className="divide-y divide-stone-100">
        {payments.map((p) => (
          <li key={p.id} className="flex items-start gap-3 px-4 py-2.5 text-sm sm:pl-11">
            <span className="w-14 shrink-0 pt-0.5 tabular-nums text-stone-500">{shortDate(p.date)}</span>
            <span className="min-w-0 flex-1">
              {p.remark ? <span className="block text-stone-700">{p.remark}</span> : <span className="block text-stone-400">No remark</span>}
              {p.proofUrl && (
                <a href={p.proofUrl} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-stone-700 underline underline-offset-2">
                  {p.proofKind === "pdf" ? <FiFileText aria-hidden /> : <FiImage aria-hidden />} {p.proofKind === "pdf" ? "PDF" : "Photo"}
                </a>
              )}
            </span>
            <span className="shrink-0 pt-0.5 font-semibold tabular-nums text-stone-900">{rupees(p.amount)}</span>
            {canPay && (
              <button
                type="button"
                aria-label={`Delete ${rupees(p.amount)} paid on ${shortDate(p.date)}`}
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(`Delete the payment of ${rupees(p.amount)} on ${shortDate(p.date)}?`)) remove.mutate(p.id);
                }}
                className="-my-1 shrink-0 rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <FiTrash2 aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
      {remove.isError && (
        <p role="alert" className="px-4 pb-2 text-sm text-red-700 sm:pl-11">
          {describeError(remove.error)}
        </p>
      )}
    </div>
  );
}