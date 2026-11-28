"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { FiArchive, FiChevronDown, FiChevronUp, FiEdit2, FiPaperclip, FiRotateCcw, FiTrash2, FiX } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useAddExpense, useArchiveExpense, useExpenses, useRemoveExpense, useUpdateExpense } from "@/hooks/useExpenses";
import { ConfirmDeleteDialog } from "@/components/utilites/Confirmdeletedialog";
import { DatePick } from "./labour-simple/DatePick";
import { describeError } from "@/lib/api";
import { rupees, shortDate } from "@/lib/projects/hub";
import { EXPENSE_SECTIONS, type Expense, type ExpenseCategory } from "@/lib/projects/expenses";
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
  const canAdd = useCan("expenses.manage");
  const archive = useArchiveExpense(projectId);
  const [editing, setEditing] = useState<Expense | null>(null); // the entry being changed in the form above
  // In the order asked for, so the first one opens: the Materials tab shows Material first, then General
  const shown = sections.flatMap((k) => EXPENSE_SECTIONS.filter((s) => s.key === k));
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
              className={`min-h-10 flex-1 rounded-md px-4 font-medium transition-colors sm:flex-none ${section === s.key ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
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

      {canAdd && (
        <AddForm
          key={`${section}-${editing?.id ?? "new"}`}
          projectId={projectId}
          category={section}
          example={current.example}
          editing={editing && (editing.category ?? "general") === section ? editing : null}
          onDone={() => setEditing(null)}
        />
      )}

      {items.length === 0 ? (
        <EmptyState title={`No ${current.label.toLowerCase()} expenditure yet`} hint={canAdd ? "Add what was paid above." : undefined} />
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
          {items.map((e) => (
            <li key={e.id} className={`flex items-start gap-3 px-4 py-3 ${editing?.id === e.id ? "bg-[#E6F1FB]" : ""}`}>
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
                  aria-label={`Edit ${e.purpose} on ${shortDate(e.date)}`}
                  title="Edit"
                  onClick={() => {
                    setEditing(e);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="shrink-0 rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <FiEdit2 aria-hidden />
                </button>
              )}
              {canAdd && (
                <button
                  type="button"
                  aria-label={`Archive ${e.purpose} on ${shortDate(e.date)}`}
                  title="Archive"
                  disabled={archive.isPending}
                  onClick={() => {
                    if (editing?.id === e.id) setEditing(null);
                    archive.mutate({ expenseId: e.id, archive: true });
                  }}
                  className="shrink-0 rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50"
                >
                  <FiArchive aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {archive.isError && (
        <p role="alert" className="text-sm text-red-700">
          {describeError(archive.error)}
        </p>
      )}

      {canAdd && <ArchivedExpenses projectId={projectId} items={(book.data.archived ?? []).filter((e) => (e.category ?? "general") === section)} />}
    </div>
  );
}

/** Archived entries of this section: they count nowhere; Restore brings one back, Delete removes it for good */
function ArchivedExpenses({ projectId, items }: { projectId: string; items: Expense[] }) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState<Expense | null>(null);
  const archive = useArchiveExpense(projectId);
  const remove = useRemoveExpense(projectId);
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-stone-200">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 w-full items-center justify-between px-4 text-sm font-medium text-stone-700">
        <span>
          Archived <span className="font-normal text-stone-500">· {items.length}</span>
        </span>
        {open ? <FiChevronUp aria-hidden /> : <FiChevronDown aria-hidden />}
      </button>
      {open && (
        <ul className="divide-y divide-stone-100 border-t border-stone-100">
          {items.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-500">
              <span className="w-16 shrink-0 tabular-nums">{shortDate(e.date)}</span>
              <span className="min-w-0 flex-1 truncate">{e.purpose}</span>
              <span className="shrink-0 tabular-nums">{rupees(e.amount)}</span>
              <button
                type="button"
                onClick={() => archive.mutate({ expenseId: e.id, archive: false })}
                disabled={archive.isPending}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
              >
                <FiRotateCcw aria-hidden /> Restore
              </button>
              <button
                type="button"
                onClick={() => setAsking(e)}
                aria-label={`Delete ${e.purpose} for good`}
                title="Delete for good"
                className="shrink-0 rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600"
              >
                <FiTrash2 aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {archive.isError && <p role="alert" className="px-4 pb-3 text-sm text-red-700">{describeError(archive.error)}</p>}
      <ConfirmDeleteDialog
        open={asking !== null}
        onClose={() => {
          setAsking(null);
          remove.reset();
        }}
        title="Delete for good?"
        itemName={asking ? `${asking.purpose} · ${rupees(asking.amount)}` : ""}
        description="The entry and its bill are removed and cannot be brought back."
        pending={remove.isPending}
        error={remove.error ? describeError(remove.error) : null}
        onConfirm={() => {
          if (asking) remove.mutate(asking.id, { onSuccess: () => setAsking(null) });
        }}
      />
    </div>
  );
}

/** Add an entry, or (with `editing`) change one: its figures, and attach, replace or remove its bill */
function AddForm({
  projectId,
  category,
  example,
  editing,
  onDone,
}: {
  projectId: string;
  category: ExpenseCategory;
  example: string;
  editing: Expense | null;
  onDone: () => void;
}) {
  const add = useAddExpense(projectId);
  const update = useUpdateExpense(projectId);
  const save = editing ? update : add;
  const [date, setDate] = useState(editing?.date ?? todayLocal());
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [purpose, setPurpose] = useState(editing?.purpose ?? "");
  const [remark, setRemark] = useState(editing?.remark ?? "");
  const [bill, setBill] = useState<File | null>(null);
  const [dropBill, setDropBill] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasBill = !!editing?.billUrl && !dropBill && !bill;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!(Number(amount) > 0) || !purpose.trim()) return;
    if (!date || date > todayLocal()) return setProblem("The date can't be empty or in the future.");
    setProblem(null);
    const body = { category, date, amount: Number(amount), purpose: purpose.trim(), remark: remark.trim(), bill, removeBill: dropBill };
    try {
      if (editing) {
        await update.mutateAsync({ expenseId: editing.id, e: body });
        onDone();
        return;
      }
      await add.mutateAsync(body);
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
    <form
      onSubmit={submit}
      className={`grid grid-cols-2 gap-3 rounded-xl border p-4 md:grid-cols-[9rem_9rem_minmax(0,1fr)_minmax(0,1fr)] ${editing ? "border-[#185FA5] bg-[#F5F9FD]" : "border-stone-200"}`}
    >
      {editing && <p className="col-span-2 text-sm font-semibold text-[#185FA5] md:col-span-4">Change entry · {editing.purpose}</p>}
      <div className="text-sm">
        <span className="font-medium text-stone-700">Date</span>
        <DatePick value={date} onChange={setDate} label="Date" className="mt-1 w-full" />
      </div>
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
        {/* The bill: attach one, or (editing) view, replace or remove the one already there */}
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-700">
          {hasBill ? (
            <>
              <a href={editing!.billUrl!} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 font-medium underline">
                <FiPaperclip aria-hidden className="text-stone-400" /> View bill
              </a>
              <label className="cursor-pointer text-stone-600 underline">
                Replace
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setBill(e.target.files?.[0] ?? null)} className="sr-only" />
              </label>
              <button type="button" onClick={() => setDropBill(true)} className="text-red-700 underline">
                Remove
              </button>
            </>
          ) : (
            <label className="flex min-h-11 cursor-pointer items-center gap-2">
              <FiPaperclip aria-hidden className="text-stone-400" />
              <span className="max-w-56 truncate">{bill ? bill.name : "Attach bill (optional)"}</span>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setBill(e.target.files?.[0] ?? null)} className="sr-only" />
            </label>
          )}
          {bill && (
            <button type="button" onClick={() => setBill(null)} aria-label="Remove this file" className="rounded p-1 text-stone-500 hover:bg-stone-100">
              <FiX aria-hidden />
            </button>
          )}
          {dropBill && !bill && <span className="text-xs text-stone-500">The bill will be removed when you save.</span>}
        </span>
        <span className="flex gap-2">
          {editing && (
            <button type="button" onClick={onDone} disabled={save.isPending} className="min-h-11 rounded-lg px-4 text-sm font-medium text-stone-700 hover:bg-stone-100">
              Cancel
            </button>
          )}
          <button type="submit" disabled={save.isPending} className="min-h-11 rounded-lg bg-stone-900 px-5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
            {save.isPending ? "Saving…" : editing ? "Save changes" : "Add"}
          </button>
        </span>
      </div>
      {(problem || save.isError) && (
        <p role="alert" className="col-span-2 text-sm text-red-700 md:col-span-4">
          {problem ?? describeError(save.error)}
        </p>
      )}
    </form>
  );
}