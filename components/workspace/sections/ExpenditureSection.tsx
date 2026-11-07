"use client";

import ExpensesSection from "./ExpensesSection";

/**
 * The Expenditure tab: project cost and BOQ amount against what has been spent, a bar each for labour, material and
 * general, the work-wise table (set, given, left to pay), then the General expenses only (labour and material
 * money is entered in their own sections).
 */
export default function ExpenditureSection({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-6">
      <section aria-label="General expenses" className="space-y-3">
        <ExpensesSection projectId={projectId} sections={["general"]} />
      </section>
    </div>
  );
}