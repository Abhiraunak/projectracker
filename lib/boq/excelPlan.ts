/**
 * Lays out the Excel workbook for a BOQ: which value or formula goes in which cell, how it looks, what is merged.
 * No Excel library here, so it is easy to test. exportExcel.ts hands the plan to ExcelJS in the browser.
 *
 * The layout follows the measurement BOQ workbooks it is modelled on:
 *   SUMMARY  S.No | SECTIONS | Rs. | Amount, then TOTAL-A, deductions, TOTAL-B, additions, TOTAL and "Say xx Lacs"
 *   one tab per works sheet  SOR No | S.No | Particulars | No. | Length | Width | Height | Qty. | Unit | Rate | Amount
 * Quantities, amounts and totals are real formulas, so the exported workbook keeps calculating when edited.
 */
import { boqTotals, itemCombinedQty, lineQty, partAmount, partQty, serialNumbers } from "./calc";
import { fmtDay } from "./format";
import type { BoqDocument, Item, MeasureLine, Part, WorksSheet } from "./types";

export type CellStyle =
  | "companyName" | "companyLine" | "title" | "sheetTitle" | "header"
  | "section" | "label" | "code" | "sno" | "description" | "subheading" | "measureLabel"
  | "dim" | "qty" | "qtyTotal" | "unit" | "rate" | "money" | "moneyBold" | "percent" | "text" | "textBold" | "textRight";

export interface PlanCell {
  ref: string; // "A1"
  value?: string | number;
  formula?: string; // without the leading "="
  result?: number | string; // the formula's value, so previews that don't recalculate still show numbers
  style?: CellStyle;
}

export interface PlanImage {
  dataUrl: string;
  col: number; // 0-based
  row: number; // 0-based
  width: number; // pixels
  height: number;
}

export interface PlanSheet {
  name: string;
  columnWidths: number[]; // in Excel character widths, column A first
  cells: PlanCell[];
  merges: string[]; // "A1:K1"
  rowHeights: Record<number, number>; // row number -> points
  images: PlanImage[];
  landscape: boolean;
  freezeRows: number; // header rows that stay visible while scrolling
  printTitleRows: string | null; // header rows repeated on every printed page, e.g. "1:2"
}

export interface WorkbookPlan {
  sheets: PlanSheet[];
  /** Where the key totals end up, so they can be checked */
  refs: { sheetTotals: { sheet: string; cell: string }[]; grandTotal: string; sayLakhs: string };
}

/* ------------------------------- small helpers ------------------------------- */

const COLS = "ABCDEFGHIJK";
const col = (index: number) => COLS[index]!;

/** Excel sheet names: at most 31 characters, none of []:*?/\ , and no two the same */
function sheetNameFor(name: string, used: Set<string>): string {
  const base = (name.replace(/[[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim() || "Works").slice(0, 28).trim();
  let candidate = base.slice(0, 31);
  for (let n = 2; used.has(candidate.toUpperCase()); n++) candidate = `${base.slice(0, 31 - String(n).length - 1)} ${n}`;
  used.add(candidate.toUpperCase());
  return candidate;
}

/** A reference to a cell on another sheet: 'Civil Works'!K40 (an apostrophe in the name is doubled) */
const crossRef = (sheet: string, cell: string) => `'${sheet.replace(/'/g, "''")}'!${cell}`;

class SheetWriter {
  readonly cells: PlanCell[] = [];
  readonly merges: string[] = [];
  readonly rowHeights: Record<number, number> = {};
  row = 1;
  put(column: string, cell: Omit<PlanCell, "ref">) {
    if (cell.value === undefined && cell.formula === undefined && cell.value !== "") return;
    this.cells.push({ ref: `${column}${this.row}`, ...cell });
  }
  next(by = 1) {
    this.row += by;
  }
}

/* ----------------------------- one works sheet tab ----------------------------- */

const DIM_COLUMNS = ["D", "E", "F", "G"] as const; // No., Length, Width, Height
const dimsOf = (line: MeasureLine) => [line.no, line.length, line.width, line.height];

function writeMeasure(w: SheetWriter, line: MeasureLine) {
  w.put("C", { value: line.label, style: "measureLabel" });
  dimsOf(line).forEach((value, i) => value !== null && w.put(DIM_COLUMNS[i]!, { value, style: "dim" }));

  const filled = DIM_COLUMNS.filter((_, i) => dimsOf(line)[i] !== null);
  if (filled.length > 0) {
    w.put("H", { formula: filled.map((c) => `${c}${w.row}`).join("*"), result: lineQty(line), style: "qty" });
  } else if (line.qty !== null) {
    w.put("H", { value: line.qty, style: "qty" });
  }
  w.next();
}

/** A part's lines, then its total row (Qty | Unit | Rate | Amount). Returns the total row number. */
function writePart(w: SheetWriter, part: Part): number {
  if (part.code || part.description) {
    w.put("A", { value: part.code, style: "code" });
    w.put("C", { value: part.description, style: "description" });
    w.next();
  }

  const measureRows: number[] = [];
  for (const line of part.lines) {
    if (line.kind === "text") {
      w.put("C", { value: line.text, style: "subheading" });
      w.next();
    } else {
      measureRows.push(w.row);
      writeMeasure(w, line);
    }
  }

  const totalRow = w.row;
  if (measureRows.length > 0) {
    w.put("H", { formula: `SUM(H${measureRows[0]}:H${measureRows[measureRows.length - 1]})`, result: partQty(part), style: "qtyTotal" });
  } else {
    w.put("H", { value: 0, style: "qtyTotal" });
  }
  w.put("I", { value: part.unit, style: "unit" });
  if (part.rate !== null) w.put("J", { value: part.rate, style: "rate" });
  w.put("K", { formula: `H${totalRow}*J${totalRow}`, result: partAmount(part), style: "money" });
  w.next(2); // the total row, then a blank row like the original
  return totalRow;
}

function writeItem(w: SheetWriter, item: Item, serial: number | undefined) {
  w.put("A", { value: item.code, style: "code" });
  if (serial !== undefined) w.put("B", { value: serial, style: "sno" });
  w.put("C", { value: item.description, style: "description" });
  w.next();

  const totals = item.parts.map((part) => writePart(w, part));

  // Several parts in one unit (like 10, 12 and 16mm steel): a combined quantity row, as in the original
  const combined = itemCombinedQty(item);
  if (combined) {
    w.put("C", { value: `Total ${item.code}`.trim(), style: "textRight" });
    w.put("H", { formula: totals.map((r) => `H${r}`).join("+"), result: combined.qty, style: "qtyTotal" });
    w.put("I", { value: combined.unit, style: "unit" });
    w.next(2);
  }
}

function worksSheetTab(sheet: WorksSheet, name: string): { tab: PlanSheet; totalCell: string } {
  const w = new SheetWriter();
  const serials = serialNumbers(sheet);

  w.put("A", { value: sheet.title, style: "sheetTitle" });
  w.merges.push("A1:K1");
  w.rowHeights[1] = 30;
  w.next();
  ["SOR No.", "S.No.", "Particulars", "No.", "Length", "Width", "Height", "Qty.", "Unit", "Rate", "Amount"].forEach((label, i) =>
    w.put(col(i), { value: label, style: "header" })
  );
  w.next();
  const firstBodyRow = w.row;

  for (const section of sheet.sections) {
    w.put("A", { value: section.code, style: "section" });
    w.put("C", { value: section.title, style: "section" });
    w.next();
    for (const entry of section.entries) {
      if (entry.kind === "label") {
        w.put("C", { value: entry.text, style: "label" });
        w.next();
      } else {
        writeItem(w, entry, serials.get(entry.id));
      }
    }
  }

  const totalRow = w.row;
  w.put("I", { value: "TOTAL", style: "textBold" });
  w.merges.push(`I${totalRow}:J${totalRow}`);
  const total = sheet.sections.reduce((s, sec) => s + sec.entries.reduce((t, e) => t + (e.kind === "item" ? e.parts.reduce((u, p) => u + partAmount(p), 0) : 0), 0), 0);
  w.put("K", { formula: `SUM(K${firstBodyRow}:K${totalRow - 1})`, result: total, style: "moneyBold" });

  return {
    tab: {
      name,
      columnWidths: [12.3, 7.4, 46.9, 10.1, 9.6, 8.6, 9, 11, 7.3, 11.3, 13.1],
      cells: w.cells,
      merges: w.merges,
      rowHeights: w.rowHeights,
      images: [],
      landscape: false,
      freezeRows: 2,
      printTitleRows: "1:2",
    },
    totalCell: `K${totalRow}`,
  };
}

/* ----------------------------------- SUMMARY ----------------------------------- */

const contactLine = (doc: BoqDocument) =>
  [doc.company.address, doc.company.phone, doc.company.email, doc.company.gstin && `GSTIN: ${doc.company.gstin}`].filter(Boolean).join("  |  ");

function summaryTab(doc: BoqDocument, sheetRefs: { name: string; title: string; totalCell: string }[]): { tab: PlanSheet; grandTotal: string; sayLakhs: string } {
  const w = new SheetWriter();
  const totals = boqTotals(doc);
  const images: PlanImage[] = [];
  const mergeRow = (from = "A", to = "D") => w.merges.push(`${from}${w.row}:${to}${w.row}`);

  // Company block (with the logo on its left), when filled in
  if (doc.company.name || doc.logo) {
    w.put("A", { value: doc.company.name, style: "companyName" });
    mergeRow();
    w.rowHeights[w.row] = doc.logo ? 48 : 24;
    if (doc.logo) images.push({ dataUrl: doc.logo, col: 0, row: w.row - 1, width: 64, height: 64 });
    w.next();
    const contact = contactLine(doc);
    if (contact) {
      w.put("A", { value: contact, style: "companyLine" });
      mergeRow();
      w.next();
    }
    w.next();
  }

  for (const line of [doc.title, doc.subtitle, doc.rateBasis]) {
    if (!line) continue;
    w.put("A", { value: line, style: "title" });
    mergeRow();
    w.next();
  }
  w.put("A", { value: "BILL OF QUANTITIES: SUMMARY OF PRICES", style: "title" });
  mergeRow();
  w.next();
  if (doc.boqNumber || doc.date) {
    w.put("A", { value: [doc.boqNumber && `BOQ No: ${doc.boqNumber}`, doc.date && `Date: ${fmtDay(doc.date)}`].filter(Boolean).join("     "), style: "text" });
    mergeRow();
    w.next();
  }

  ["S. No.", "SECTIONS", "Rs.", "Amount"].forEach((label, i) => w.put(col(i), { value: label, style: "header" }));
  w.next();

  const firstSheetRow = w.row;
  sheetRefs.forEach((s, i) => {
    w.put("A", { value: i + 1, style: "sno" });
    w.put("B", { value: s.name, style: "description" });
    w.put("C", { value: "Rs.", style: "text" });
    w.put("D", { formula: crossRef(s.title, s.totalCell), result: totals.sheets[i]!.total, style: "money" });
    w.next();
  });
  const lastSheetRow = w.row - 1;
  w.next();

  const rowA = w.row;
  w.put("B", { value: "TOTAL- A", style: "textBold" });
  w.put("C", { value: "Rs.", style: "text" });
  w.put("D", { formula: `SUM(D${firstSheetRow}:D${lastSheetRow})`, result: totals.totalA, style: "moneyBold" });
  w.next();

  const deductionRows: number[] = [];
  for (const d of totals.deductions) {
    deductionRows.push(w.row);
    w.put("B", { value: d.adjustment.label, style: "text" });
    w.put("C", { value: d.adjustment.percent / 100, style: "percent" });
    w.put("D", { formula: `C${w.row}*D${rowA}`, result: d.amount, style: "money" });
    w.next();
  }

  let rowB = rowA;
  if (deductionRows.length > 0) {
    rowB = w.row;
    const names = totals.deductions.map((d) => d.adjustment.label.replace(/^deduction\s*/i, "")).join(", ");
    w.put("B", { value: `TOTAL-B -(After deducting ${names})`, style: "textBold" });
    w.put("C", { value: "Rs.", style: "text" });
    w.put("D", {
      formula: `D${rowA}-SUM(D${deductionRows[0]}:D${deductionRows[deductionRows.length - 1]})`,
      result: totals.totalB,
      style: "moneyBold",
    });
    w.next();
  }

  for (const a of totals.additions) {
    w.put("B", { value: a.adjustment.label, style: "text" });
    w.put("C", { value: a.adjustment.percent / 100, style: "percent" });
    w.put("D", { formula: `C${w.row}*D${rowB}`, result: a.amount, style: "money" });
    w.next();
  }
  const lastAdditionRow = w.row - 1;

  const totalRow = w.row;
  const including = totals.additions.map((a) => a.adjustment.label).join(", ");
  w.put("A", { value: including ? `TOTAL(Including ${including})` : "TOTAL", style: "textBold" });
  w.merges.push(`A${totalRow}:B${totalRow}`);
  w.put("C", { value: "Rs.", style: "text" });
  w.put("D", {
    formula: totals.additions.length > 0 ? `SUM(D${rowB}:D${lastAdditionRow})` : `D${rowB}`,
    result: totals.grandTotal,
    style: "moneyBold",
  });
  w.next();

  const sayRow = w.row;
  w.put("A", { value: "Say", style: "textBold" });
  w.put("D", { formula: `TEXT(ROUND(D${totalRow}/100000,2),"0.00")&" Lacs"`, result: `${totals.sayLakhs.toFixed(2)} Lacs`, style: "textRight" });
  w.next(3);

  w.put("B", { value: doc.signatures.leftLabel, style: "text" });
  w.put("C", { value: doc.signatures.rightLabel, style: "text" });
  mergeRow("C", "D");
  w.next(5);
  w.put("B", { value: doc.signatures.leftName, style: "textBold" });
  w.put("C", { value: doc.signatures.rightName, style: "textBold" });
  mergeRow("C", "D");

  return {
    tab: { name: "SUMMARY", columnWidths: [8, 66.3, 12, 32.7], cells: w.cells, merges: w.merges, rowHeights: w.rowHeights, images, landscape: false, freezeRows: 0, printTitleRows: null },
    grandTotal: `D${totalRow}`,
    sayLakhs: `D${sayRow}`,
  };
}

/* ------------------------------------ all ------------------------------------ */

export function buildWorkbookPlan(doc: BoqDocument): WorkbookPlan {
  const used = new Set<string>(["SUMMARY"]);
  const works = doc.sheets.map((sheet) => {
    const name = sheetNameFor(sheet.name || sheet.title, used);
    const { tab, totalCell } = worksSheetTab(sheet, name);
    return { tab, ref: { name: sheet.name, title: name, totalCell } };
  });
  const summary = summaryTab(doc, works.map((w) => w.ref));

  return {
    sheets: [summary.tab, ...works.map((w) => w.tab)],
    refs: {
      sheetTotals: works.map((w) => ({ sheet: w.ref.title, cell: w.ref.totalCell })),
      grandTotal: `SUMMARY!${summary.grandTotal}`,
      sayLakhs: `SUMMARY!${summary.sayLakhs}`,
    },
  };
}

/** A safe file name for the download: "Nature Park - Part H-1.xlsx" */
export const excelFileName = (doc: BoqDocument) =>
  `${[doc.title, doc.subtitle].filter(Boolean).join(" - ").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "BOQ"}.xlsx`;
