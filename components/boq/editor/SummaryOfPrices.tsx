"use client";

import React, { memo } from "react";
import { FiArrowDown, FiArrowUp, FiTrash2 } from "react-icons/fi";
import type { AdjustmentLine, BoqTotals } from "@/lib/boq/calc";
import { newAdjustment } from "@/lib/boq/factory";
import { fmtLakhs, fmtMoney } from "@/lib/boq/format";
import { addAdjustment, moveAdjustment, removeAdjustment, updateAdjustment, updateSheet } from "@/lib/boq/operations";
import type { Adjustment } from "@/lib/boq/types";
import { EditableNumber } from "./cells/EditableNumber";
import { EditableText } from "./cells/EditableText";
import { useBoqEdit } from "./editContext";
import { RowActions } from "./rows/RowActions";

const TD = "border border-stone-200 p-0 align-middle";
const STATIC = "block px-2 py-1.5 text-sm";

/** One percentage line (contractor's profit, GST, labour cess...): name, %, whether it is deducted or added */
const AdjustmentRow = memo(function AdjustmentRow({ line, isFirst, isLast }: { line: AdjustmentLine; isFirst: boolean; isLast: boolean }) {
  const { apply, readOnly } = useBoqEdit();
  const { adjustment, amount } = line;
  const set = (patch: Partial<Adjustment>, field: string) => apply((d) => updateAdjustment(d, adjustment.id, patch), `adj:${adjustment.id}:${field}`);

  return (
    <tr data-grid-row data-row-id={adjustment.id} className="group">
      <td className={TD} />
      <td className={TD}>
        <EditableText value={adjustment.label} onValue={(v) => set({ label: v }, "label")} label="Name of the percentage line" col={1} placeholder="e.g. GST" />
      </td>
      <td className={TD}>
        <div className="flex items-center gap-1 pr-1">
          <EditableNumber value={adjustment.percent} onValue={(v) => set({ percent: v ?? 0 }, "percent")} label={`${adjustment.label || "Line"} percent`} col={2} />
          <span className="text-sm text-stone-500">%</span>
          <select
            value={adjustment.effect}
            disabled={readOnly}
            onChange={(e) => set({ effect: e.target.value as Adjustment["effect"] }, "effect")}
            aria-label="Deduct or add"
            className="rounded border border-stone-200 bg-white px-1 py-0.5 text-xs text-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:appearance-none disabled:border-transparent"
          >
            <option value="deduct">deduct</option>
            <option value="add">add</option>
          </select>
        </div>
      </td>
      <td className={TD}>
        <span className={`${STATIC} text-right tabular-nums`}>
          {adjustment.effect === "deduct" ? "− " : ""}
          {fmtMoney(amount)}
        </span>
      </td>
      <RowActions
        actions={[
          { label: "Move up", icon: FiArrowUp, onClick: () => apply((d) => moveAdjustment(d, adjustment.id, -1)), disabled: isFirst },
          { label: "Move down", icon: FiArrowDown, onClick: () => apply((d) => moveAdjustment(d, adjustment.id, 1)), disabled: isLast },
          { label: "Delete line", icon: FiTrash2, onClick: () => apply((d) => removeAdjustment(d, adjustment.id)), danger: true },
        ]}
      />
    </tr>
  );
});

function TotalRow({ label, amount, colSpanLabel = false }: { label: string; amount: number; colSpanLabel?: boolean }) {
  return (
    <tr className="bg-stone-100/80">
      {colSpanLabel ? (
        <td colSpan={2} className={TD}>
          <span className={`${STATIC} font-bold`}>{label}</span>
        </td>
      ) : (
        <>
          <td className={TD} />
          <td className={TD}>
            <span className={`${STATIC} font-bold`}>{label}</span>
          </td>
        </>
      )}
      <td className={TD}>
        <span className={STATIC}>Rs.</span>
      </td>
      <td className={TD}>
        <span className={`${STATIC} text-right font-bold tabular-nums`}>{fmtMoney(amount)}</span>
      </td>
      <td />
    </tr>
  );
}

/** The SUMMARY sheet: each works sheet's total, then TOTAL-A, deductions, TOTAL-B, additions, TOTAL, "Say xx Lacs" */
export const SummaryOfPrices = memo(function SummaryOfPrices({ totals }: { totals: BoqTotals }) {
  const { apply, readOnly } = useBoqEdit();
  const all = [...totals.deductions, ...totals.additions];
  const position = (line: AdjustmentLine) => all.indexOf(line);
  const including = totals.additions.map((a) => a.adjustment.label).filter(Boolean).join(", ");

  return (
    <section aria-label="Summary of prices" className="mx-auto mt-6 max-w-3xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <colgroup>
            <col style={{ width: "3.5rem" }} />
            <col />
            <col style={{ width: "10rem" }} />
            <col style={{ width: "11rem" }} />
            <col style={{ width: "6.5rem" }} />
          </colgroup>
          <thead>
            <tr className="bg-stone-100">
              {["S. No.", "SECTIONS", "Rs.", "Amount"].map((heading, i) => (
                <th key={heading} scope="col" className={`border border-stone-300 px-2 py-2 text-xs font-semibold text-stone-700 ${i === 3 ? "text-right" : "text-left"}`}>
                  {heading}
                </th>
              ))}
              <th scope="col">
                <span className="sr-only">Row actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {totals.sheets.map(({ sheet, total }, i) => (
              <tr key={sheet.id} data-grid-row className="group">
                <td className={TD}>
                  <span className={`${STATIC} text-center`}>{i + 1}</span>
                </td>
                <td className={TD}>
                  <EditableText
                    value={sheet.name}
                    onValue={(v) => apply((d) => updateSheet(d, sheet.id, { name: v }), `sheet:${sheet.id}:name`)}
                    label="Works sheet name in the summary"
                    col={1}
                    placeholder="e.g. CIVIL WORKS"
                  />
                </td>
                <td className={TD}>
                  <span className={STATIC}>Rs.</span>
                </td>
                <td className={TD}>
                  <span className={`${STATIC} text-right tabular-nums`}>{fmtMoney(total)}</span>
                </td>
                <td />
              </tr>
            ))}

            <TotalRow label="TOTAL- A" amount={totals.totalA} />
            {totals.deductions.map((line) => (
              <AdjustmentRow key={line.adjustment.id} line={line} isFirst={position(line) === 0} isLast={position(line) === all.length - 1} />
            ))}
            {totals.deductions.length > 0 && <TotalRow label="TOTAL- B (after deductions)" amount={totals.totalB} />}
            {totals.additions.map((line) => (
              <AdjustmentRow key={line.adjustment.id} line={line} isFirst={position(line) === 0} isLast={position(line) === all.length - 1} />
            ))}
            <TotalRow label={including ? `TOTAL (Including ${including})` : "TOTAL"} amount={totals.grandTotal} colSpanLabel />
            <tr>
              <td colSpan={3} className={TD}>
                <span className={`${STATIC} font-semibold`}>Say</span>
              </td>
              <td className={TD}>
                <span className={`${STATIC} text-right font-semibold tabular-nums`}>{fmtLakhs(totals.sayLakhs)}</span>
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={() => apply((d) => addAdjustment(d, newAdjustment({ label: "", percent: 0, effect: "add" })))}
          className="mt-1 rounded px-2 py-1 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          + Percentage line (GST, cess, deduction…)
        </button>
      )}
    </section>
  );
});
