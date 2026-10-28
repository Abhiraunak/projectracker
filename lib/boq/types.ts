/**
 * A BOQ in the same shape as a measurement-style BOQ workbook (like "The Nature Park" sheet):
 *
 *   SUMMARY            one row per works sheet, then TOTAL-A, deductions, TOTAL-B, additions, TOTAL, "Say xx Lacs"
 *   works sheet        SOR No | S.No | Particulars | No. | Length | Width | Height | Qty. | Unit | Rate | Amount
 *     section          5.1 EARTHWORK
 *       label          P.C.C.                                   (a bold sub-heading between items)
 *       item           5.1.1 | 1 | Earthwork in excavation ...  (S.No is numbered automatically)
 *         part         (a) 10mm ...  each part has its own total row: Qty | Unit | Rate | Amount
 *           text line  For Foundation- Left and Right Wing
 *           measure    CF6 | 2 | 7 | 1.8 | 2 | = 50.40
 */

export type BoqStatus = "DRAFT" | "FINAL";

export interface MeasureLine {
  id: string;
  kind: "measure";
  label: string; // CF6, PB-7, "For Flooring", or empty
  no: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  /** A typed quantity. Only used when No, Length, Width and Height are all empty. */
  qty: number | null;
}

export interface TextLine {
  id: string;
  kind: "text";
  text: string; // "For Foundation- Conservatory- Left Wing and Right Wing"
}

export type Line = MeasureLine | TextLine;

/** One priced block: its measurements add up to one quantity, with one unit, rate and amount */
export interface Part {
  id: string;
  code: string; // "(a)", "5.3.1.2", or empty
  description: string; // "10mm (TMT coil Fe 500)...", or empty
  unit: string; // cum, sqm, MT
  rate: number | null;
  lines: Line[];
}

export interface Item {
  id: string;
  kind: "item";
  code: string; // SOR No, e.g. 5.1.1
  description: string;
  parts: Part[];
}

export interface Label {
  id: string;
  kind: "label";
  text: string; // P.C.C., R.C.C.
}

export type Entry = Item | Label;

export interface Section {
  id: string;
  code: string; // 5.1
  title: string; // EARTHWORK
  entries: Entry[];
}

/** One works sheet (one row in the summary, one tab in the Excel export) */
export interface WorksSheet {
  id: string;
  name: string; // how it is named in the summary: "CIVIL WORKS- CONSERVATORY - Main Wing..."
  title: string; // the heading on its own page: "PART-H-1 : CIVIL WORKS - SOR- CONSERVATORY..."
  sections: Section[];
}

/** A percentage in the summary. Deductions come off TOTAL-A; additions are worked out on TOTAL-B. */
export interface Adjustment {
  id: string;
  label: string;
  percent: number;
  effect: "deduct" | "add";
}

export interface Company {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
}

export interface Signatures {
  leftLabel: string; // Commissioned by:
  leftName: string;
  rightLabel: string; // Submitted by:
  rightName: string;
}

export interface BoqDocument {
  company: Company;
  /** A small image as a data: URL (resized in the browser), or null */
  logo: string | null;
  /** Show the logo and company details at the top (page, print and Excel). Missing in older BOQs = shown. */
  showCompanyHeader?: boolean;
  title: string; // THE NATURE PARK, BARIDH, RANCHI (JHARKHAND)
  subtitle: string; // PART H-1 -CONSERVATORY- LEFT AND RIGHT WING
  rateBasis: string; // Rates as per SOR Jharkhand: 2022/ DSR: 2023
  boqNumber: string;
  date: string; // YYYY-MM-DD, or empty
  sheets: WorksSheet[];
  adjustments: Adjustment[];
  signatures: Signatures;
}

/** A saved BOQ, as the server returns it */
export interface BoqRecord {
  id: string;
  status: BoqStatus;
  version: number; // goes up on every save; a save with an old version is refused (someone else saved meanwhile)
  document: BoqDocument;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null; // email
  /** The project whose materials this BOQ feeds (chosen in the editor), or null */
  project: { id: string; title: string } | null;
}

/** One row of the BOQ dashboard */
export interface BoqSummary {
  id: string;
  title: string;
  subtitle: string;
  boqNumber: string;
  status: BoqStatus;
  grandTotal: number;
  itemCount: number;
  project: { id: string; title: string } | null;
  updatedAt: string;
  updatedBy: string | null;
}
