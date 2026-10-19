/**
 * Every edit to a BOQ, as a pure function: (document, ...) -> new document. Nothing is changed in place.
 * Untouched parts keep their identity, so React only re-draws the rows that actually changed.
 */
import { newItem, newLabel, newMeasureLine, newPart, newSection, newSheet, newTextLine } from "./factory";
import type { Adjustment, BoqDocument, Company, Entry, Item, Line, Part, Section, Signatures, WorksSheet } from "./types";

/* ----------------------------- list helpers ----------------------------- */

type WithId = { id: string };

/** map, but hand back the same array if nothing changed */
function mapKeep<T>(list: T[], fn: (item: T) => T): T[] {
  let changed = false;
  const out = list.map((item) => {
    const next = fn(item);
    if (next !== item) changed = true;
    return next;
  });
  return changed ? out : list;
}

const patchById = <T extends WithId>(list: T[], id: string, patch: Partial<T>): T[] =>
  mapKeep(list, (item) => (item.id === id ? { ...item, ...patch } : item));

/** Put `item` right after `afterId`; at the end if afterId is null or not found */
function insertAfter<T extends WithId>(list: T[], afterId: string | null, items: T[]): T[] {
  const index = afterId === null ? -1 : list.findIndex((x) => x.id === afterId);
  if (index === -1) return [...list, ...items];
  return [...list.slice(0, index + 1), ...items, ...list.slice(index + 1)];
}

const removeById = <T extends WithId>(list: T[], id: string): T[] => {
  const next = list.filter((x) => x.id !== id);
  return next.length === list.length ? list : next;
};

function moveById<T extends WithId>(list: T[], id: string, direction: -1 | 1): T[] {
  const index = list.findIndex((x) => x.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

/* -------------------------- walking the document -------------------------- */

const withSheets = (doc: BoqDocument, fn: (sheets: WorksSheet[]) => WorksSheet[]): BoqDocument => {
  const sheets = fn(doc.sheets);
  return sheets === doc.sheets ? doc : { ...doc, sheets };
};

const withSections = (doc: BoqDocument, fn: (sections: Section[], sheet: WorksSheet) => Section[]) =>
  withSheets(doc, (sheets) =>
    mapKeep(sheets, (sheet) => {
      const sections = fn(sheet.sections, sheet);
      return sections === sheet.sections ? sheet : { ...sheet, sections };
    })
  );

const withEntries = (doc: BoqDocument, fn: (entries: Entry[], section: Section) => Entry[]) =>
  withSections(doc, (sections) =>
    mapKeep(sections, (section) => {
      const entries = fn(section.entries, section);
      return entries === section.entries ? section : { ...section, entries };
    })
  );

const withParts = (doc: BoqDocument, fn: (parts: Part[], item: Item) => Part[]) =>
  withEntries(doc, (entries) =>
    mapKeep(entries, (entry) => {
      if (entry.kind !== "item") return entry;
      const parts = fn(entry.parts, entry);
      return parts === entry.parts ? entry : { ...entry, parts };
    })
  );

const withLines = (doc: BoqDocument, fn: (lines: Line[], part: Part) => Line[]) =>
  withParts(doc, (parts) =>
    mapKeep(parts, (part) => {
      const lines = fn(part.lines, part);
      return lines === part.lines ? part : { ...part, lines };
    })
  );

/* ------------------------------ top level ------------------------------ */

export type HeaderField = "title" | "subtitle" | "rateBasis" | "boqNumber" | "date";

export const setHeader = (doc: BoqDocument, field: HeaderField, value: string): BoqDocument =>
  doc[field] === value ? doc : { ...doc, [field]: value };

export const setCompany = (doc: BoqDocument, patch: Partial<Company>): BoqDocument => ({ ...doc, company: { ...doc.company, ...patch } });

export const setLogo = (doc: BoqDocument, logo: string | null): BoqDocument => ({ ...doc, logo });

export const setSignatures = (doc: BoqDocument, patch: Partial<Signatures>): BoqDocument => ({
  ...doc,
  signatures: { ...doc.signatures, ...patch },
});

/* ------------------------------ adjustments ------------------------------ */

export const updateAdjustment = (doc: BoqDocument, id: string, patch: Partial<Adjustment>): BoqDocument => ({
  ...doc,
  adjustments: patchById(doc.adjustments, id, patch),
});
export const addAdjustment = (doc: BoqDocument, adjustment: Adjustment): BoqDocument => ({
  ...doc,
  adjustments: [...doc.adjustments, adjustment],
});
export const removeAdjustment = (doc: BoqDocument, id: string): BoqDocument => ({ ...doc, adjustments: removeById(doc.adjustments, id) });
export const moveAdjustment = (doc: BoqDocument, id: string, direction: -1 | 1): BoqDocument => ({
  ...doc,
  adjustments: moveById(doc.adjustments, id, direction),
});

/* -------------------------------- sheets -------------------------------- */

export const updateSheet = (doc: BoqDocument, id: string, patch: Partial<WorksSheet>) => withSheets(doc, (s) => patchById(s, id, patch));
export const addSheet = (doc: BoqDocument, afterId: string | null) => withSheets(doc, (s) => insertAfter(s, afterId, [newSheet()]));
/** A BOQ always keeps at least one works sheet */
export const removeSheet = (doc: BoqDocument, id: string) => (doc.sheets.length <= 1 ? doc : withSheets(doc, (s) => removeById(s, id)));
export const moveSheet = (doc: BoqDocument, id: string, direction: -1 | 1) => withSheets(doc, (s) => moveById(s, id, direction));

/* ------------------------------- sections ------------------------------- */

export const updateSection = (doc: BoqDocument, id: string, patch: Partial<Section>) => withSections(doc, (s) => patchById(s, id, patch));
export const addSection = (doc: BoqDocument, sheetId: string, afterId: string | null) =>
  withSections(doc, (sections, sheet) => (sheet.id === sheetId ? insertAfter(sections, afterId, [newSection()]) : sections));
export const removeSection = (doc: BoqDocument, id: string) => withSections(doc, (s) => removeById(s, id));
export const moveSection = (doc: BoqDocument, id: string, direction: -1 | 1) => withSections(doc, (s) => moveById(s, id, direction));

/* ------------------------- items and labels (entries) ------------------------- */

export const updateEntry = (doc: BoqDocument, id: string, patch: Partial<Item> | Partial<Entry>) =>
  withEntries(doc, (entries) => mapKeep(entries, (e) => (e.id === id ? ({ ...e, ...patch } as Entry) : e)));
export const addItem = (doc: BoqDocument, sectionId: string, afterId: string | null) =>
  withEntries(doc, (entries, section) => (section.id === sectionId ? insertAfter<Entry>(entries, afterId, [newItem()]) : entries));
export const addLabel = (doc: BoqDocument, sectionId: string, afterId: string | null) =>
  withEntries(doc, (entries, section) => (section.id === sectionId ? insertAfter<Entry>(entries, afterId, [newLabel()]) : entries));
export const removeEntry = (doc: BoqDocument, id: string) => withEntries(doc, (e) => removeById(e, id));
export const moveEntry = (doc: BoqDocument, id: string, direction: -1 | 1) => withEntries(doc, (e) => moveById(e, id, direction));

/* --------------------------------- parts --------------------------------- */

export const updatePart = (doc: BoqDocument, id: string, patch: Partial<Part>) => withParts(doc, (p) => patchById(p, id, patch));
export const addPart = (doc: BoqDocument, itemId: string, afterId: string | null) =>
  withParts(doc, (parts, item) => (item.id === itemId ? insertAfter(parts, afterId, [newPart()]) : parts));
/** An item always keeps at least one part (it is what gets priced) */
export const removePart = (doc: BoqDocument, id: string) =>
  withParts(doc, (parts) => (parts.length <= 1 || !parts.some((p) => p.id === id) ? parts : removeById(parts, id)));
export const movePart = (doc: BoqDocument, id: string, direction: -1 | 1) => withParts(doc, (p) => moveById(p, id, direction));

/* --------------------------------- lines --------------------------------- */

export const updateLine = (doc: BoqDocument, id: string, patch: Partial<Line>) =>
  withLines(doc, (lines) => mapKeep(lines, (l) => (l.id === id ? ({ ...l, ...patch } as Line) : l)));

/** Add lines to a part, right after `afterId` (or at the end). Used for "new row" and for pasting from Excel. */
export const insertLines = (doc: BoqDocument, partId: string, afterId: string | null, lines: Line[]) =>
  withLines(doc, (existing, part) => (part.id === partId ? insertAfter(existing, afterId, lines) : existing));

export const insertMeasureLine = (doc: BoqDocument, partId: string, afterId: string | null) =>
  insertLines(doc, partId, afterId, [newMeasureLine()]);
export const insertTextLine = (doc: BoqDocument, partId: string, afterId: string | null) =>
  insertLines(doc, partId, afterId, [newTextLine()]);

export const removeLine = (doc: BoqDocument, id: string) => withLines(doc, (l) => removeById(l, id));
export const moveLine = (doc: BoqDocument, id: string, direction: -1 | 1) => withLines(doc, (l) => moveById(l, id, direction));

/** A line with nothing typed in it yet */
export const isEmptyLine = (line: Line): boolean =>
  line.kind === "text"
    ? line.text.trim() === ""
    : line.label.trim() === "" && [line.no, line.length, line.width, line.height, line.qty].every((v) => v === null);

/**
 * Pasting several rows onto a line: like Excel, an empty line is filled (replaced by the pasted rows);
 * a line that already has something in it keeps it, and the rows go in right after.
 */
export const pasteLines = (doc: BoqDocument, lineId: string, lines: Line[]) =>
  withLines(doc, (existing) => {
    const index = existing.findIndex((l) => l.id === lineId);
    if (index === -1 || lines.length === 0) return existing;
    const replace = isEmptyLine(existing[index]!);
    return [...existing.slice(0, replace ? index : index + 1), ...lines, ...existing.slice(index + 1)];
  });

/* ------------- inserting a ready-made piece (so the caller knows its id, to put the cursor in it) ------------- */

export const insertSheet = (doc: BoqDocument, afterId: string | null, sheet: WorksSheet) => withSheets(doc, (s) => insertAfter(s, afterId, [sheet]));
export const insertSection = (doc: BoqDocument, sheetId: string, afterId: string | null, section: Section) =>
  withSections(doc, (sections, sheet) => (sheet.id === sheetId ? insertAfter(sections, afterId, [section]) : sections));
export const insertEntry = (doc: BoqDocument, sectionId: string, afterId: string | null, entry: Entry) =>
  withEntries(doc, (entries, section) => (section.id === sectionId ? insertAfter<Entry>(entries, afterId, [entry]) : entries));
export const insertPart = (doc: BoqDocument, itemId: string, afterId: string | null, part: Part) =>
  withParts(doc, (parts, item) => (item.id === itemId ? insertAfter(parts, afterId, [part]) : parts));
