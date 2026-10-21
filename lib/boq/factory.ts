/** New, empty pieces of a BOQ, each with its own id */
import type { Adjustment, BoqDocument, Item, Label, MeasureLine, Part, Section, TextLine, WorksSheet } from "./types";

export const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export const newMeasureLine = (patch: Partial<Omit<MeasureLine, "id" | "kind">> = {}): MeasureLine => ({
  id: newId(), kind: "measure", label: "", no: null, length: null, width: null, height: null, qty: null, ...patch,
});

export const newTextLine = (text = ""): TextLine => ({ id: newId(), kind: "text", text });

export const newPart = (): Part => ({ id: newId(), code: "", description: "", unit: "", rate: null, lines: [newMeasureLine()] });

export const newItem = (): Item => ({ id: newId(), kind: "item", code: "", description: "", parts: [newPart()] });

export const newLabel = (text = ""): Label => ({ id: newId(), kind: "label", text });

export const newSection = (): Section => ({ id: newId(), code: "", title: "", entries: [newItem()] });

export const newSheet = (name = "WORKS"): WorksSheet => ({ id: newId(), name, title: name, sections: [newSection()] });

export const newAdjustment = (patch: Partial<Omit<Adjustment, "id">> = {}): Adjustment => ({
  id: newId(), label: "", percent: 0, effect: "add", ...patch,
});

/** The summary lines a SOR-based estimate usually has. Each can be edited or removed. */
export const defaultAdjustments = (): Adjustment[] => [
  newAdjustment({ label: "Deduction Contractor's Profit", percent: 9.1, effect: "deduct" }),
  newAdjustment({ label: "GST", percent: 18, effect: "add" }),
  newAdjustment({ label: "Labour Cess", percent: 1, effect: "add" }),
  newAdjustment({ label: "Contingency", percent: 1, effect: "add" }),
];

/** A new BOQ: one works sheet with one section, item and measurement line, ready to type into */
export const blankDocument = (today: string): BoqDocument => ({
  company: { name: "", address: "", phone: "", email: "", gstin: "" },
  logo: null,
  showCompanyHeader: true,
  title: "",
  subtitle: "",
  rateBasis: "",
  boqNumber: "",
  date: today,
  sheets: [newSheet("CIVIL WORKS")],
  adjustments: defaultAdjustments(),
  signatures: { leftLabel: "Commissioned by:", leftName: "", rightLabel: "Submitted by:", rightName: "" },
});
