"use client";

import { FiArrowLeft, FiPrinter } from "react-icons/fi";
import { describeError } from "@/lib/api";
import { MODE_LABEL } from "@/lib/client/types";
import { useInvoice } from "@/hooks/useClientPortal";
import { inWords } from "@/lib/client/format";
import { ErrorBox, INSTALMENT_TONE, Pill, dayLabel, inr, primaryButton, secondaryButton } from "./ui";

/** A printable invoice for one payment on the schedule. Print, or "Save as PDF" from the print window. */
export function InvoiceView({ id }: { id: string }) {
  const query = useInvoice(id);
  if (query.isPending) return <div aria-busy="true" className="mx-auto h-[70vh] max-w-3xl animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />;
  if (query.isError) return <div className="mx-auto max-w-3xl"><ErrorBox>{describeError(query.error)}</ErrorBox></div>;
  const { company, billTo, project, instalment: i, issuedOn, progress } = query.data;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex justify-between gap-2 print:hidden">
        <button type="button" onClick={() => history.back()} className={secondaryButton}>
          <FiArrowLeft aria-hidden /> Back
        </button>
        <button type="button" onClick={() => window.print()} className={primaryButton}>
          <FiPrinter aria-hidden /> Print or save as PDF
        </button>
      </div>

      <article className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-900 sm:p-10 print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-col gap-6 border-b border-stone-200 pb-6 sm:flex-row sm:justify-between">
          <div>
            <p className="text-lg font-semibold">{company.name || "Your company name"}</p>
            {company.address && <p className="whitespace-pre-line text-stone-600">{company.address}</p>}
            {company.gstin && <p className="text-stone-600">GSTIN {company.gstin}</p>}
            {(company.phone || company.email) && <p className="text-stone-600">{[company.phone, company.email].filter(Boolean).join(" · ")}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-2xl font-semibold tracking-tight">{i.kind === "ADVANCE" ? "Advance invoice" : "Invoice"}</p>
            <p className="font-semibold">{i.invoiceNo}</p>
            <p className="text-stone-600">Issued {dayLabel(issuedOn)}</p>
            {i.dueOn && <p className="text-stone-600">Pay by {dayLabel(i.dueOn)}</p>}
            <p className="mt-1 print:hidden">
              <Pill tone={INSTALMENT_TONE[i.status]}>{i.status}</Pill>
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 border-b border-stone-200 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-stone-500">Bill to</p>
            {billTo.length ? billTo.map((b) => <p key={b}>{b}</p>) : <p className="text-stone-500">–</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-stone-500">Project</p>
            <p>{project.title}</p>
            <p className="text-stone-600">Work done to date: {Math.round(progress)}%</p>
          </div>
        </section>

        <table className="mt-6 w-full">
          <thead className="border-b border-stone-200 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="py-2 font-semibold">Description</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            <tr>
              <td className="py-3">
                <p className="font-semibold">{i.label}</p>
                <p className="text-stone-600">{i.why}</p>
                {i.note && <p className="text-stone-600">{i.note}</p>}
              </td>
              <td className="py-3 text-right tabular-nums">{inr(i.amount)}</td>
            </tr>
            {i.taxPercent > 0 && (
              <>
                <tr>
                  <td className="py-2 text-stone-600">CGST {i.taxPercent / 2}%</td>
                  <td className="py-2 text-right tabular-nums">{inr(i.tax / 2)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-stone-600">SGST {i.taxPercent / 2}%</td>
                  <td className="py-2 text-right tabular-nums">{inr(i.tax / 2)}</td>
                </tr>
              </>
            )}
          </tbody>
          <tfoot className="border-t-2 border-stone-900">
            <tr>
              <td className="py-3 font-semibold">Total</td>
              <td className="py-3 text-right text-lg font-semibold tabular-nums">{inr(i.total)}</td>
            </tr>
            {i.paid > 0 && (
              <>
                <tr>
                  <td className="py-1 text-stone-600">Received</td>
                  <td className="py-1 text-right tabular-nums">− {inr(i.paid)}</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold">Balance</td>
                  <td className="py-1 text-right font-semibold tabular-nums">{inr(i.remaining)}</td>
                </tr>
              </>
            )}
          </tfoot>
        </table>
        <p className="mt-2 text-stone-600">{inWords(i.total)}</p>

        {i.proofs.length > 0 && (
          <section className="mt-6">
            <p className="text-xs font-semibold uppercase text-stone-500">Payments received</p>
            <ul className="mt-1 divide-y divide-stone-100">
              {i.proofs.map((p) => (
                <li key={p.id} className="flex justify-between gap-4 py-1.5">
                  <span>
                    {dayLabel(p.paidOn)} · {MODE_LABEL[p.mode]}
                    {p.reference && ` · ${p.reference}`}
                  </span>
                  <span className="tabular-nums">{inr(p.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {company.bank && i.status !== "Paid" && (
          <section className="mt-6 rounded-lg bg-stone-50 p-4 print:border print:border-stone-300">
            <p className="text-xs font-semibold uppercase text-stone-500">How to pay</p>
            <p className="whitespace-pre-line">{company.bank}</p>
            <p className="mt-1 text-stone-600">After paying, upload the screenshot on your project page so we can confirm it.</p>
          </section>
        )}

        <p className="mt-8 text-xs text-stone-500">This is a computer-generated invoice.</p>
      </article>
    </div>
  );
}
