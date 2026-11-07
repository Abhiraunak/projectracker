"use client";

import { useMemo, useState, type FormEvent } from "react";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { usePayments } from "@/hooks/useLabour";
import { useMeasures, useSaveMeasure } from "@/hooks/useLabourWeeks";
import { describeError } from "@/lib/api";
import { todayLocal, type Measure } from "@/lib/projects/labourWeeks";
import { mono } from "../materials/mono";
import { money } from "../materials/purchaseFormat";

const UNITS = ["sqft", "rft", "sqm", "cum", "nos"];
const TRADES = ["Tiles", "Civil", "Painting", "Plumbing", "Electrical", "Fabrication", "Carpentry", "Architecture"];

/** Contractor names and trades already used on the project, to pick from instead of retyping */
export function useLabourNames(projectId: string) {
  const book = usePayments(projectId);
  const measures = useMeasures(projectId);
  return useMemo(() => {
    const names = new Map<string, string>();
    for (const c of book.data?.contractors ?? []) names.set(c.contractorName.toLowerCase(), c.contractorName);
    for (const m of measures.data?.items ?? []) names.set(m.contractorName.toLowerCase(), m.contractorName);
    const trades = [...new Set([...(book.data?.trades ?? []), ...TRADES])];
    const units = [...new Set([...UNITS, ...(measures.data?.units ?? [])])];
    return { names: [...names.values()].sort((a, b) => a.localeCompare(b)), trades, units };
  }, [book.data, measures.data]);
}

/**
 * Log contract work: who, what, how much, at what rate. 420 sqft of floor tiles × ₹28 = ₹11,760, counted on its date
 * in that pay week, like a day of attendance. Opens filled in to edit, or with a contractor already chosen.
 */
export function MeasureDialog({
  projectId,
  editing,
  preset,
  onClose,
}: {
  projectId: string;
  editing?: Measure;
  preset?: { trade: string; contractorName: string; date?: string };
  onClose: () => void;
}) {
  const { names, trades, units } = useLabourNames(projectId);
  const save = useSaveMeasure(projectId);
  const [contractorName, setName] = useState(editing?.contractorName ?? preset?.contractorName ?? "");
  const [trade, setTrade] = useState(editing?.trade ?? preset?.trade ?? "Tiles");
  const [date, setDate] = useState(editing?.date ?? preset?.date ?? todayLocal());
  const [work, setWork] = useState(editing?.work ?? "");
  const [quantity, setQuantity] = useState(editing ? String(editing.quantity) : "");
  const [unit, setUnit] = useState(editing?.unit ?? "sqft");
  const [rate, setRate] = useState(editing ? String(editing.rate) : "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [problem, setProblem] = useState<string | null>(null);

  const q = Number(quantity);
  const r = Number(rate);
  const amount = q > 0 && r > 0 ? Math.round(q * r * 100) / 100 : 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const missing = !contractorName.trim()
      ? ["Enter the contractor or team head.", "m-name"]
      : !work.trim()
        ? ["Say what work was measured, e.g. Floor tiles, 2nd floor.", "m-work"]
        : !(q > 0)
          ? ["Enter the area or quantity measured.", "m-qty"]
          : !(r > 0)
            ? ["Enter the rate.", "m-rate"]
            : null;
    if (missing) {
      setProblem(missing[0]!);
      document.getElementById(missing[1]!)?.focus();
      return;
    }
    setProblem(null);
    try {
      await save.mutateAsync({ id: editing?.id, data: { trade: trade.trim(), contractorName: contractorName.trim(), date, work: work.trim(), quantity: q, unit, rate: r, note: note.trim() } });
      onClose();
    } catch (err) {
      setProblem(describeError(err));
    }
  };

  return (
    <ModalDialog open onClose={onClose} label={editing ? "Edit contract work" : "Log contract work"} size="lg" locked={save.isPending}>
      <DialogHeader title={editing ? "Edit contract work" : "Log contract work"} subtitle="Measured work × rate, paid to the sub-contractor or team head" onClose={onClose} locked={save.isPending} />
      <form onSubmit={submit} className="space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={mono.fieldLabel}>
            Sub-contractor / team head
            <input id="m-name" list="m-names" value={contractorName} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="off" placeholder="e.g. Raju Tiles" className={mono.field} />
            <datalist id="m-names">
              {names.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </label>
          <label className={mono.fieldLabel}>
            Trade
            <input list="m-trades" value={trade} onChange={(e) => setTrade(e.target.value)} maxLength={40} autoComplete="off" className={mono.field} />
            <datalist id="m-trades">
              {trades.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
        </div>
        <label className={mono.fieldLabel}>
          Work
          <input id="m-work" value={work} onChange={(e) => setWork(e.target.value)} maxLength={160} placeholder="e.g. Floor tiles, 2nd floor" className={mono.field} />
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_7rem_1fr_1fr]">
          <label className={mono.fieldLabel}>
            Area / qty
            <input id="m-qty" type="number" inputMode="decimal" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="420" className={`${mono.field} text-right tabular-nums`} />
          </label>
          <label className={mono.fieldLabel}>
            Unit
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={mono.field}>
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
          <label className={mono.fieldLabel}>
            Rate (₹ / {unit})
            <input id="m-rate" type="number" inputMode="decimal" min={0} step="any" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="28" className={`${mono.field} text-right tabular-nums`} />
          </label>
          <label className={mono.fieldLabel}>
            Date
            <input type="date" value={date} max={todayLocal()} onChange={(e) => e.target.value && setDate(e.target.value)} className={mono.field} />
          </label>
        </div>
        <label className={mono.fieldLabel}>
          Note <span className="font-normal text-[#8C8C8C]">(optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={mono.field} />
        </label>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F7F7F5] px-4 py-3">
          <span className="text-sm text-[#666666]">{amount ? `${quantity} ${unit} × ${money(r)}` : "Amount"}</span>
          <span className="text-2xl font-semibold tabular-nums tracking-[-0.01em] text-[#111111]">{money(amount)}</span>
        </div>

        {problem && (
          <p role="alert" className="text-sm text-[#B3261E]">
            {problem}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={save.isPending} className={mono.quiet}>
            Cancel
          </button>
          <button type="submit" disabled={save.isPending} className={mono.primary}>
            {save.isPending ? "Saving…" : editing ? "Save changes" : "Save contract work"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}