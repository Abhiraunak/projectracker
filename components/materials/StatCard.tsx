import React from "react";

/** A summary number, in the same card style as the dashboard's StatCards */
export function StatCard({ title, value, note, pill }: { title: string; value: string; note: string; pill?: React.ReactNode }) {
  return (
    <div className="rounded border border-stone-300 p-4">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="mb-1 text-sm text-stone-500">{title}</h3>
          <p className="text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
        </div>
        {pill}
      </div>
      <p className="text-xs text-stone-500">{note}</p>
    </div>
  );
}
