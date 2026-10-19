/**
 * Every number in a BOQ that is worked out rather than typed. No React, no network: easy to test.
 * The server keeps an identical copy (boq.calc.ts) so the totals it stores match what people see.
 */
import type { Adjustment, BoqDocument, Item, Line, MeasureLine, Part, WorksSheet } from "./types";

const isMeasure = (line: Line): line is MeasureLine => line.kind === "measure";

/** The dimensions that were filled in (No., Length, Width, Height) */
export const filledDims = (line: MeasureLine): number[] =>
  [line.no, line.length, line.width, line.height].filter((value): value is number => value !== null);

/** No. x Length x Width x Height, using only the ones filled in. With none filled in, the typed quantity. */
export function lineQty(line: MeasureLine): number {
  const dims = filledDims(line);
  if (dims.length === 0) return line.qty ?? 0;
  return dims.reduce((product, value) => product * value, 1);
}

/** Is the quantity typed by hand (no dimensions) rather than worked out? */
export const isManualQty = (line: MeasureLine) => filledDims(line).length === 0;

export const partQty = (part: Part): number => part.lines.filter(isMeasure).reduce((sum, line) => sum + lineQty(line), 0);

export const partAmount = (part: Part): number => partQty(part) * (part.rate ?? 0);

export const itemAmount = (item: Item): number => item.parts.reduce((sum, part) => sum + partAmount(part), 0);

/** When an item has several parts in the same unit, their combined quantity (like the "total steel" row) */
export function itemCombinedQty(item: Item): { qty: number; unit: string } | null {
  if (item.parts.length < 2) return null;
  const unit = item.parts[0]!.unit;
  if (!unit || item.parts.some((part) => part.unit !== unit)) return null;
  return { qty: item.parts.reduce((sum, part) => sum + partQty(part), 0), unit };
}

export const sheetTotal = (sheet: WorksSheet): number =>
  sheet.sections.reduce(
    (sum, section) => sum + section.entries.reduce((s, entry) => s + (entry.kind === "item" ? itemAmount(entry) : 0), 0),
    0
  );

/** S.No for each item, counted 1, 2, 3... through the sheet */
export function serialNumbers(sheet: WorksSheet): Map<string, number> {
  const numbers = new Map<string, number>();
  let next = 1;
  for (const section of sheet.sections) {
    for (const entry of section.entries) if (entry.kind === "item") numbers.set(entry.id, next++);
  }
  return numbers;
}

export interface AdjustmentLine {
  adjustment: Adjustment;
  amount: number;
}

export interface BoqTotals {
  sheets: { sheet: WorksSheet; total: number }[];
  totalA: number; // all works sheets together
  deductions: AdjustmentLine[];
  totalB: number; // after deductions
  additions: AdjustmentLine[];
  grandTotal: number; // TOTAL including GST, labour cess, contingency...
  sayLakhs: number; // the grand total in lakhs, to 2 decimals ("Say 25.57 Lacs")
}

/** The SUMMARY sheet: TOTAL-A, then deductions (off TOTAL-A), TOTAL-B, then additions (on TOTAL-B) */
export function boqTotals(doc: BoqDocument): BoqTotals {
  const sheets = doc.sheets.map((sheet) => ({ sheet, total: sheetTotal(sheet) }));
  const totalA = sheets.reduce((sum, s) => sum + s.total, 0);

  const deductions = doc.adjustments
    .filter((a) => a.effect === "deduct")
    .map((adjustment) => ({ adjustment, amount: (totalA * adjustment.percent) / 100 }));
  const totalB = totalA - deductions.reduce((sum, d) => sum + d.amount, 0);

  const additions = doc.adjustments
    .filter((a) => a.effect === "add")
    .map((adjustment) => ({ adjustment, amount: (totalB * adjustment.percent) / 100 }));
  const grandTotal = totalB + additions.reduce((sum, a) => sum + a.amount, 0);

  return { sheets, totalA, deductions, totalB, additions, grandTotal, sayLakhs: Math.round((grandTotal / 100_000) * 100) / 100 };
}

/** How many priced items the BOQ has (for the dashboard) */
export const itemCount = (doc: BoqDocument): number =>
  doc.sheets.reduce((sum, sheet) => sum + sheet.sections.reduce((s, section) => s + section.entries.filter((e) => e.kind === "item").length, 0), 0);
