/**
 * Writes the workbook plan with ExcelJS and downloads it. ExcelJS is large, so it is only loaded when someone
 * actually exports (npm i exceljs).
 */
import type { Style, Worksheet } from "exceljs";
import { downloadBlob } from "./download";
import { buildWorkbookPlan, excelFileName, type CellStyle, type PlanImage, type PlanSheet } from "./excelPlan";
import type { BoqDocument } from "./types";

type ExcelJSModule = typeof import("exceljs");

async function loadExcelJS(): Promise<ExcelJSModule> {
  const mod = await import("exceljs");
  return ((mod as unknown as { default?: ExcelJSModule }).default ?? mod) as ExcelJSModule;
}

const thin = { style: "thin" as const, color: { argb: "FFA8A29E" } };
const box = { top: thin, bottom: thin, left: thin, right: thin };

/** What each cell style looks like in Excel */
const STYLES: Record<CellStyle, Partial<Style>> = {
  companyName: { font: { bold: true, size: 14 }, alignment: { horizontal: "center", vertical: "middle" } },
  companyLine: { font: { size: 9, color: { argb: "FF57534E" } }, alignment: { horizontal: "center", wrapText: true } },
  title: { font: { bold: true, size: 12 }, alignment: { horizontal: "center", vertical: "middle", wrapText: true } },
  sheetTitle: { font: { bold: true, size: 12 }, alignment: { horizontal: "center", vertical: "middle", wrapText: true } },
  header: {
    font: { bold: true },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F4" } },
    border: box,
  },
  section: { font: { bold: true } },
  label: { font: { bold: true, underline: true } },
  code: { alignment: { vertical: "top" } },
  sno: { alignment: { horizontal: "center", vertical: "top" } },
  description: { alignment: { wrapText: true, vertical: "top" } },
  subheading: { font: { bold: true }, alignment: { wrapText: true } },
  measureLabel: {},
  dim: {},
  qty: { numFmt: "0.00" },
  qtyTotal: { numFmt: "0.00", font: { bold: true }, border: { top: thin } },
  unit: { alignment: { horizontal: "center" } },
  rate: { numFmt: "#,##0.00" },
  money: { numFmt: "#,##0.00" },
  moneyBold: { numFmt: "#,##0.00", font: { bold: true } },
  percent: { numFmt: "0.00%" },
  text: {},
  textBold: { font: { bold: true } },
  textRight: { alignment: { horizontal: "right" } },
};

function addLogo(workbook: InstanceType<ExcelJSModule["Workbook"]>, worksheet: Worksheet, image: PlanImage) {
  const [header, data] = image.dataUrl.split(",");
  const extension = header?.includes("jpeg") ? "jpeg" : "png";
  const id = workbook.addImage({ base64: data ?? "", extension });
  worksheet.addImage(id, { tl: { col: image.col, row: image.row }, ext: { width: image.width, height: image.height } });
}

function writeSheet(workbook: InstanceType<ExcelJSModule["Workbook"]>, plan: PlanSheet) {
  const worksheet = workbook.addWorksheet(plan.name, {
    pageSetup: { paperSize: 9, orientation: plan.landscape ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: plan.freezeRows ? [{ state: "frozen", ySplit: plan.freezeRows }] : [],
  });
  if (plan.printTitleRows) worksheet.pageSetup.printTitlesRow = plan.printTitleRows;
  worksheet.columns = plan.columnWidths.map((width) => ({ width }));

  for (const cell of plan.cells) {
    const target = worksheet.getCell(cell.ref);
    target.value = cell.formula !== undefined ? { formula: cell.formula, result: cell.result } : (cell.value ?? null);
    if (cell.style) target.style = { ...target.style, ...STYLES[cell.style] };
  }
  for (const range of plan.merges) worksheet.mergeCells(range);
  for (const [row, height] of Object.entries(plan.rowHeights)) worksheet.getRow(Number(row)).height = height;
  for (const image of plan.images) addLogo(workbook, worksheet, image);
}

/** Builds the .xlsx for this BOQ and starts the download */
export async function exportBoqToExcel(doc: BoqDocument): Promise<void> {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = doc.company.name || "BOQ";
  workbook.created = new Date();
  for (const sheet of buildWorkbookPlan(doc).sheets) writeSheet(workbook, sheet);

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), excelFileName(doc));
}
