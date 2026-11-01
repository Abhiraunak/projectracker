"use client";

import { memo, useState } from "react";
import { FiCheck, FiTag } from "react-icons/fi";
import { describeError } from "@/lib/api";
import type { TradeSummary, TradesResponse } from "@/lib/attendanceApi";
import { useSetContractorTrade } from "@/hooks/useAttendance";

const rupees = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const NOT_SET = "-";

/**
 * Attendance by trade: one card per trade with this week, this month and who works in it. Tapping a card shows only
 * that trade's entries below; tapping it again shows all. Older entries without a trade get a "Not set" card, and
 * can be sorted a contractor at a time.
 */
export const TradeCards = memo(function TradeCards({
  projectId,
  data,
  selected,
  onSelect,
  canEdit,
}: {
  projectId: string;
  data: TradesResponse;
  selected: string | undefined;
  onSelect: (trade: string | undefined) => void;
  canEdit: boolean;
}) {
  const [sorting, setSorting] = useState(false);
  if (data.trades.length === 0) return null;
  const notSet = data.trades.find((t) => t.trade === "");

  return (
    <section aria-label="Attendance by trade" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">By trade</h2>
        {selected !== undefined && (
          <button type="button" onClick={() => onSelect(undefined)} className="text-sm font-medium text-stone-600 underline">
            Show all trades
          </button>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {data.trades.map((t) => (
          <TradeCard key={t.trade || NOT_SET} t={t} active={selected === (t.trade || NOT_SET)} onClick={() => onSelect(selected === (t.trade || NOT_SET) ? undefined : t.trade || NOT_SET)} />
        ))}
      </ul>
      {notSet && canEdit && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>
              {notSet.entries} older {notSet.entries === 1 ? "entry has" : "entries have"} no trade yet ({notSet.contractors.length} {notSet.contractors.length === 1 ? "contractor" : "contractors"}).
            </p>
            <button type="button" onClick={() => setSorting((v) => !v)} aria-expanded={sorting} className="font-semibold underline">
              {sorting ? "Done" : "Sort them"}
            </button>
          </div>
          {sorting && (
            <ul className="mt-3 divide-y divide-amber-200 rounded border border-amber-200 bg-white">
              {notSet.contractors.map((name) => (
                <SortRow key={name} projectId={projectId} contractor={name} choices={data.choices} suggested={data.usual[name]} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
});

function TradeCard({ t, active, onClick }: { t: TradeSummary; active: boolean; onClick: () => void }) {
  const label = t.trade || "Not set";
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`flex h-full w-full flex-col gap-1 rounded border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
          active ? "border-stone-900 bg-stone-900 text-white" : t.trade ? "border-stone-300 hover:border-stone-500" : "border-dashed border-amber-300 bg-amber-50/50 hover:border-amber-500"
        }`}
      >
        <span className="flex items-center gap-1.5 font-semibold">
          <FiTag aria-hidden className={active ? "text-white" : "text-stone-400"} /> {label}
        </span>
        <span className={`text-lg font-semibold tabular-nums ${active ? "" : "text-stone-900"}`}>{rupees(t.week)}</span>
        <span className={`text-xs ${active ? "text-stone-300" : "text-stone-500"}`}>
          this week · {rupees(t.month)} this month
        </span>
        <span className={`truncate text-xs ${active ? "text-stone-300" : "text-stone-500"}`}>
          {t.contractors.length ? t.contractors.join(", ") : "—"}
        </span>
      </button>
    </li>
  );
}

/** One contractor with no trade: pick one and all their unsorted entries move under it */
function SortRow({ projectId, contractor, choices, suggested }: { projectId: string; contractor: string; choices: string[]; suggested?: string }) {
  const [trade, setTrade] = useState(suggested ?? "");
  const set = useSetContractorTrade();
  const listId = `trades-${contractor.replace(/\W+/g, "-")}`;
  return (
    <li className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
      <span className="min-w-0 flex-1 truncate font-medium text-stone-900">{contractor}</span>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (trade.trim()) set.mutate({ projectId, contractorName: contractor, trade: trade.trim() });
        }}
        className="flex items-center gap-2"
      >
        <input
          value={trade}
          onChange={(e) => setTrade(e.target.value)}
          list={listId}
          maxLength={40}
          placeholder="Trade"
          aria-label={`Trade for ${contractor}`}
          className="min-h-10 w-40 rounded border border-stone-300 px-2 text-sm text-stone-900"
        />
        <datalist id={listId}>
          {choices.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <button type="submit" disabled={!trade.trim() || set.isPending} className="flex min-h-10 items-center gap-1 rounded bg-stone-900 px-3 text-sm font-medium text-white disabled:opacity-40">
          <FiCheck aria-hidden /> {set.isPending ? "…" : "Set"}
        </button>
      </form>
      {set.isError && <span className="text-xs text-red-700">{describeError(set.error)}</span>}
    </li>
  );
}
