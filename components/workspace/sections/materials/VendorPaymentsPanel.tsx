"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FiChevronDown, FiFileText, FiImage, FiPaperclip, FiPlus, FiTrash2 } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useAddMaterialPayment, useMaterialPayments, useRemoveMaterialPayment } from "@/hooks/useMaterialPayments";
import { describeError } from "@/lib/api";
import { rupees, shortDate } from "@/lib/projects/hub";
import type { MaterialPayment, VendorLine, VendorPaymentBook } from "@/lib/inventory/materialPayments";
import { EmptyState, SectionError, SectionSkeleton } from "../../ui";

const field = "mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:outline-none";
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const chip = (on: boolean) =>
  `min-h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors ${on ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 text-stone-600 hover:border-stone-500 hover:text-stone-900"}`;

/** Local date: toISOString() would give yesterday early in the morning in India */
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Money paid to material vendors, like Payments on the Labour page. Each payment: vendor, amount, date, and
 * optionally what material it was for, a remark and the receipt. Below, every vendor with what they delivered
 * (its value), what was paid and what is still owed; open one to see each payment.
 */
export function VendorPaymentsPanel({ projectId, materials }: { projectId: string; materials: { id: string; name: string }[] }) {
  const book = useMaterialPayments(projectId);
  const canPay = useCan("project.manage");
  const [prefill, setPrefill] = useState<{ vendor: string; n: number } | null>(null);

  if (book.isPending) return <SectionSkeleton />;
  if (book.isError) return <SectionError error={book.error} onRetry={() => void book.refetch()} />;
  const { totals } = book.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-stone-600">
        <span>
          Bought (delivered) <span className="ml-1 font-semibold tabular-nums text-stone-900">{rupees(totals.bought)}</span>
        </span>
        <span>
          Paid <span className="ml-1 font-semibold tabular-nums text-stone-900">{rupees(totals.paid)}</span>
        </span>
        <span>
          Still to pay <span className={`ml-1 font-semibold tabular-nums ${totals.balance > 0 ? "text-amber-700" : "text-stone-900"}`}>{rupees(totals.balance)}</span>
        </span>
      </div>

      {canPay && <PaymentForm key={prefill?.n ?? 0} projectId={projectId} book={book.data} materials={materials} prefill={prefill?.vendor ?? null} />}

      <Ledger book={book.data} projectId={projectId} canPay={canPay} onPay={(vendor) => setPrefill((p) => ({ vendor, n: (p?.n ?? 0) + 1 }))} />
    </div>
  );
}

/* ---------------------------------- the form ---------------------------------- */

function PaymentForm({ projectId, book, materials, prefill }: { projectId: string; book: VendorPaymentBook; materials: { id: string; name: string }[]; prefill: string | null }) {
  const add = useAddMaterialPayment(projectId);
  const [vendor, setVendor] = useState(prefill ?? "");
  const [materialId, setMaterialId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [remark, setRemark] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Opened from "Pay" on a vendor: bring the form into view with the amount ready to type
  useEffect(() => {
    if (!prefill) return;
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("mpay-amount")?.focus({ preventScroll: true });
  }, [prefill]);

  // Vendors to tap: the ones this project owes first, then any other known names
  const names = useMemo(() => {
    const owed = book.vendors.map((v) => v.vendorName);
    return [...new Set([...owed, ...book.vendorNames])].slice(0, 12);
  }, [book.vendors, book.vendorNames]);
  const line = book.vendors.find((v) => same(v.vendorName, vendor));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(null);
    if (!vendor.trim()) {
      setProblem("Enter the vendor's name.");
      document.getElementById("mpay-vendor")?.focus();
      return;
    }
    if (!(Number(amount) > 0)) {
      setProblem("Enter an amount above zero.");
      document.getElementById("mpay-amount")?.focus();
      return;
    }
    setProblem(null);
    try {
      const p = await add.mutateAsync({ vendorName: vendor.trim(), materialId, amount: Number(amount), date, remark: remark.trim(), proof });
      setSaved(`${rupees(p.amount)} paid to ${p.vendorName} on ${shortDate(p.date)} saved.`);
      setVendor("");
      setMaterialId("");
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
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Vendor</span>
          <input id="mpay-vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} maxLength={120} autoComplete="off" placeholder="Shree Traders" className={field} />
        </label>
        {names.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Vendors">
            {names.map((n) => (
              <button key={n} type="button" aria-pressed={same(n, vendor)} onClick={() => setVendor(n)} className={chip(same(n, vendor))}>
                {n}
              </button>
            ))}
          </div>
        )}
        {line && (
          <p className="mt-2 text-xs text-stone-500" aria-live="polite">
            {line.vendorName}: delivered {rupees(line.bought)}, paid {rupees(line.paid)}
            {line.balance > 0 ? (
              <>
                {" · "}
                <button type="button" onClick={() => setAmount(String(line.balance))} className="font-medium text-amber-700 underline underline-offset-2">
                  {rupees(line.balance)} still to pay
                </button>
              </>
            ) : line.balance < 0 ? (
              ` · ${rupees(-line.balance)} paid in advance`
            ) : (
              " · paid up"
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-[9rem_9.5rem_minmax(0,1fr)]">
        <label className="text-sm">
          <span className="font-medium text-stone-700">Amount</span>
          <input id="mpay-amount" type="number" inputMode="decimal" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₹" className={`${field} tabular-nums`} />
        </label>
        <label className="text-sm">
          <span className="font-medium text-stone-700">Date paid</span>
          <input type="date" value={date} max={todayLocal()} onChange={(e) => e.target.value && setDate(e.target.value)} required className={field} />
        </label>
        <label className="col-span-2 text-sm md:col-span-1">
          <span className="font-medium text-stone-700">
            Remark <span className="font-normal text-stone-400">(optional)</span>
          </span>
          <input value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={500} placeholder="Part payment, by cheque" className={field} />
        </label>
      </div>

      {materials.length > 0 && (
        <div>
          <span className="text-sm font-medium text-stone-700">
            For <span className="font-normal text-stone-400">(optional)</span>
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5" aria-label="What it was for">
            {materials.map((m) => (
              <button key={m.id} type="button" aria-pressed={materialId === m.id} onClick={() => setMaterialId((v) => (v === m.id ? "" : m.id))} className={chip(materialId === m.id)}>
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

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

function Ledger({ book, projectId, canPay, onPay }: { book: VendorPaymentBook; projectId: string; canPay: boolean; onPay: (vendor: string) => void }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const byVendor = useMemo(() => {
    const m = new Map<string, MaterialPayment[]>();
    for (const p of book.items) {
      const k = p.vendorName.trim().toLowerCase();
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return m;
  }, [book.items]);

  if (book.vendors.length === 0) return <EmptyState title="No vendors yet" hint="They appear here once a delivery is received with a vendor, or a payment is recorded." />;

  const toggle = (k: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <section aria-label="Vendors">
      <h3 className="mb-2 px-1 text-sm font-semibold text-stone-900">
        Vendors <span className="ml-1 text-xs font-normal text-stone-400">{book.vendors.length}</span>
      </h3>
      <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
        {book.vendors.map((v) => {
          const k = v.vendorName.trim().toLowerCase();
          const payments = byVendor.get(k) ?? [];
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
                    <span className="block truncate font-medium text-stone-900">{v.vendorName}</span>
                    <span className="block text-xs tabular-nums text-stone-500">
                      Delivered {rupees(v.bought)} · Paid {rupees(v.paid)}
                      {payments.length > 0 && ` in ${payments.length}`}
                      {v.lastPaid && <span className="hidden sm:inline"> · last {shortDate(v.lastPaid)}</span>}
                    </span>
                    <span className="mt-1 block sm:hidden">
                      <Balance value={v.balance} />
                    </span>
                  </span>
                  <span className="hidden sm:block">
                    <Balance value={v.balance} />
                  </span>
                </button>
                {canPay && (
                  <button type="button" onClick={() => onPay(v.vendorName)} className="min-h-9 shrink-0 rounded-lg border border-stone-300 px-3 text-xs font-medium text-stone-700 hover:border-stone-500 hover:text-stone-900">
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
}

function Balance({ value }: { value: VendorLine["balance"] }) {
  if (value > 0) return <span className="inline-block shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-800">{rupees(value)} to pay</span>;
  if (value < 0) return <span className="inline-block shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-sky-800">{rupees(-value)} advance</span>;
  return <span className="inline-block shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">Paid up</span>;
}

function PaymentList({ payments, projectId, canPay }: { payments: MaterialPayment[]; projectId: string; canPay: boolean }) {
  const remove = useRemoveMaterialPayment(projectId);
  if (payments.length === 0) return <p className="border-t border-stone-100 bg-stone-50/60 px-4 py-3 text-sm text-stone-500 sm:pl-11">No payments yet.</p>;
  return (
    <div className="border-t border-stone-100 bg-stone-50/60">
      <ul className="divide-y divide-stone-100">
        {payments.map((p) => (
          <li key={p.id} className="flex items-start gap-3 px-4 py-2.5 text-sm sm:pl-11">
            <span className="w-14 shrink-0 pt-0.5 tabular-nums text-stone-500">{shortDate(p.date)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-stone-700">{[p.material?.name, p.remark].filter(Boolean).join(" · ") || <span className="text-stone-400">No remark</span>}</span>
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