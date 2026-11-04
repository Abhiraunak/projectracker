"use client";

import { MoneyOverview } from "./expenditure/MoneyOverview";

/**
 * The Expenditure tab: the project's money at a glance (cost vs spent and profit left, where the money goes, money
 * in vs out), then the daily expenses as before (General · Labour · Material).
 */
export default function ExpenditureSection({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-6">
      <MoneyOverview projectId={projectId} />
     
    </div>
  );
}