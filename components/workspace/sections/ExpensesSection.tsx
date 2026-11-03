"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { FiPaperclip, FiTrash2 } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useAddExpense, useExpenses, useRemoveExpense } from "@/hooks/useExpenses";
import { describeError } from "@/lib/api";
import { rupees, shortDate } from "@/lib/projects/hub";
import { EXPENSE_SECTIONS, type ExpenseCategory } from "@/lib/projects/expenses";
import { EmptyState, SectionError, SectionSkeleton } from "../ui";

const ALL: ExpenseCategory[] = ["general", "labour", "material"];
const field = "mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:outline-none";

/** Local date: toISOString() would give yesterday early in the morning in India */
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Expenditure: money paid each day, in three sections (General, Labour, Material), each with its purpose,
 * a remark and the bill. The switch at the top picks the section; the totals, the list and the form follow it.
 *
 * `sections` picks which parts show, so other pages can reuse this:
 *   <ExpensesSection projectId={id} />                          all three, with the switch (the Expenditure tab)
 *   <ExpensesSection projectId={id} sections={["labour"]} />    only Labour, no switch (the Labour page)
 *   <ExpensesSection projectId={id} sections={["material"]} />  only Material, no switch (Materials)
 */
export default function ExpensesSection({ projectId, sections = ALL }: { projectId: string; sections?: ExpenseCategory[] }) {
  const book = useExpenses(projectId);
  const canAdd = useCan("project.manage");
  const remove = useRemoveExpense(projectId);
  const shown = EXPENSE_SECTIONS.filter((s) => sections.includes(s.key));
  const parts = shown.length > 0 ? shown : EXPENSE_SECTIONS; // an empty list would show nothing: show all instead
  const [picked, setSection] = useState<ExpenseCategory>(parts[0]!.key);
  const section = parts.some((s) => s.key === picked) ? picked : parts[0]!.key; // the list changed: first one shown

  if (book.isPending) return <SectionSkeleton />;
  if (book.isError) return <SectionError error={book.error} onRetry={() => void book.refetch()} />;
  const current = parts.find((s) => s.key === section)!;
  // An older API sends no sections: everything then counts as General
  const items = book.data.items.filter((e) => (e.category ?? "general") === section);
  const totals = book.data.byCategory?.[section] ?? (section === "general" ? book.data : { total: 0, thisMonth: 0 });
  const many = parts.length > 1;
  // "All sections this month": only the sections shown here
  const shownThisMonth = parts.reduce((sum, s) => sum + (book.data.byCategory?.[s.key]?.thisMonth ?? 0), 0);

  return (
    <div className="space-y-4">
      {many && (
        <div role="group" aria-label="Expenditure section" className="flex rounded-lg bg-stone-100 p-1 text-sm sm:inline-flex">
          {parts.map((s, i) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={section === s.key}
              onClick={() => setSection(s.key)}
              className={`min-h-10 flex-1 rounded-md px-4 font-medium transition-colors sm:flex-none ${
                section === s.key ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <span className="text-stone-400">{i + 1}.</span> {s.label}
            </button>
          ))}
        </div>
      )}
      {!many && <h3 className="text-sm font-semibold text-stone-900">{current.label} expenses</h3>}

      <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-stone-600">
        <span>
          This month <span className="ml-1 font-semibold tabular-nums text-stone-900">{rupees(totals.thisMonth)}</span>
        </span>
        <span>
          In all <span className="ml-1 font-semibold tabular-nums text-stone-900">{rupees(totals.total)}</span>
        </span>
        {book.data.byCategory && many && (
          <span className="text-stone-500">
            {parts.length === EXPENSE_SECTIONS.length ? "All three sections" : "These sections"} this month{" "}
            <span className="ml-1 font-medium tabular-nums text-stone-700">{rupees(parts.length === EXPENSE_SECTIONS.length ? book.data.thisMonth : shownThisMonth)}</span>
          </span>
        )}
      </div>

      {canAdd && <AddForm key={section} projectId={projectId} category={section} example={current.example} />}

      {items.length === 0 ? (
        <EmptyState title={`No ${current.label.toLowerCase()} expenditure yet`} hint={canAdd ? "Add what was paid above." : undefined} />
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
          {items.map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-4 py-3">
              <span className="w-16 shrink-0 pt-0.5 text-sm tabular-nums text-stone-500">{shortDate(e.date)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-stone-900">{e.purpose}</span>
                {e.remark && <span className="block text-sm text-stone-500">{e.remark}</span>}
                {e.billUrl && (
                  <a href={e.billUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-stone-700 underline">
                    <FiPaperclip aria-hidden /> Bill
                  </a>
                )}
              </span>
              <span className="shrink-0 pt-0.5 font-semibold tabular-nums text-stone-900">{rupees(e.amount)}</span>
              {canAdd && (
                <button
                  type="button"
                  aria-label={`Delete ${e.purpose} on ${shortDate(e.date)}`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete "${e.purpose}" (${rupees(e.amount)})?`)) remove.mutate(e.id);
                  }}
                  className="shrink-0 rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <FiTrash2 aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {remove.isError && (
        <p role="alert" className="text-sm text-red-700">
          {describeError(remove.error)}
        </p>
      )}
    </div>
  );
}

function AddForm({ projectId, category, example }: { projectId: string; category: ExpenseCategory; example: string }) {
  const add = useAddExpense(projectId);
  const [date, setDate] = useState(todayLocal());
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [remark, setRemark] = useState("");
  const [bill, setBill] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!(Number(amount) > 0) || !purpose.trim()) return;
    try {
      await add.mutateAsync({ category, date, amount: Number(amount), purpose: purpose.trim(), remark: remark.trim(), bill });
      // Same date kept for the next entry of the day
      setAmount("");
      setPurpose("");
      setRemark("");
      setBill(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      /* shown below */
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3 rounded-xl border border-stone-200 p-4 md:grid-cols-[9rem_9rem_minmax(0,1fr)_minmax(0,1fr)]">
      <label className="text-sm">
        <span className="font-medium text-stone-700">Date</span>
        <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} required className={field} />
      </label>
      <label className="text-sm">
        <span className="font-medium text-stone-700">Amount</span>
        <input type="number" inputMode="decimal" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="₹" className={`${field} tabular-nums`} />
      </label>
      <label className="col-span-2 text-sm md:col-span-1">
        <span className="font-medium text-stone-700">Purpose</span>
        <input value={purpose} onChange={(e) => setPurpose(e.target.value)} required maxLength={200} placeholder={example} className={field} />
      </label>
      <label className="col-span-2 text-sm md:col-span-1">
        <span className="font-medium text-stone-700">
          Remark <span className="font-normal text-stone-400">(optional)</span>
        </span>
        <input value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={500} className={field} />
      </label>
      <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 md:col-span-4">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-stone-700">
          <FiPaperclip aria-hidden className="text-stone-400" />
          <span className="max-w-56 truncate">{bill ? bill.name : "Attach bill (optional)"}</span>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={(e) => setBill(e.target.files?.[0] ?? null)} className="sr-only" />
        </label>
        <button type="submit" disabled={add.isPending} className="min-h-11 rounded-lg bg-stone-900 px-5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
          {add.isPending ? "Saving…" : "Add"}
        </button>
      </div>
      {add.isError && (
        <p role="alert" className="col-span-2 text-sm text-red-700 md:col-span-4">
          {describeError(add.error)}
        </p>
      )}
    </form>
  );
}