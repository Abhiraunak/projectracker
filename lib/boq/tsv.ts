/**
 * Pasting rows copied from Excel or Google Sheets. They arrive as text: cells separated by tabs, rows by new lines,
 * and a cell that itself contains a tab, new line or quote is wrapped in "quotes" (with "" for a quote inside).
 */
import { newMeasureLine } from "./factory";
import type { MeasureLine } from "./types";

/** "a\tb\n1\t2" -> [["a","b"],["1","2"]] */
export function parseClipboardRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
      continue;
    }
    if (ch === '"' && cell === "") quoted = true;
    else if (ch === "\t") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== "")); // spreadsheets add a trailing blank row
}

/** True when the text is more than one cell, so it should become rows rather than go into one box */
export const isMultiCellPaste = (text: string) => /[\t\n\r]/.test(text.replace(/[\r\n]+$/, ""));

/** "1,234.50" -> 1234.5, "" or "abc" -> null */
export function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[,\s₹]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** The measurement columns, in the order they appear on the sheet */
export const MEASURE_COLUMNS = ["label", "no", "length", "width", "height", "qty"] as const;
export type MeasureColumn = (typeof MEASURE_COLUMNS)[number];

/**
 * Turns pasted rows into measurement lines. `startColumn` is the box the person pasted into,
 * so pasting three numbers into "Length" fills Length, Width and Height.
 */
export function rowsToMeasureLines(rows: string[][], startColumn: MeasureColumn = "label"): MeasureLine[] {
  const offset = MEASURE_COLUMNS.indexOf(startColumn);
  return rows.map((cells) => {
    const patch: Partial<MeasureLine> = {};
    cells.forEach((value, i) => {
      const column = MEASURE_COLUMNS[offset + i];
      if (!column) return;
      if (column === "label") patch.label = value.trim();
      else patch[column] = parseNumber(value);
    });
    return newMeasureLine(patch);
  });
}
