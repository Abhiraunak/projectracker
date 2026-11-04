"use client";

import { MoneyOverview } from "./expenditure/MoneyOverview";

/**
 * The Expenditure tab: project cost and BOQ amount against what has been spent, a bar each for labour, material and
 * general, the work-wise table (set, given, left to pay), then the daily expenses as before (General · Labour · Material).
 */
export default function ExpenditureSection({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-6">
      <MoneyOverview projectId={projectId} />
      <section aria-label="Expenses" className="space-y-3">
        <h2 className="text-sm font-semibold text-stone-900">Expenses</h2>
      </section>
    </div>
  );
}