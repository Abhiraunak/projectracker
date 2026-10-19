import { toIsoDay, todayLocal } from "@/lib/materials/format";
import { blankDocument } from "./factory";
import type { BoqDocument } from "./types";

export const todayIso = () => toIsoDay(todayLocal());

/** A blank BOQ dated today */
export const newBlankDocument = (): BoqDocument => blankDocument(todayIso());

/**
 * The Nature Park BOQ (Part H-1, Conservatory), converted from its workbook: a ready-made example to start from.
 * Loaded only when asked for, so it adds nothing to the page otherwise.
 */
export async function newSampleDocument(): Promise<BoqDocument> {
  const sample = (await import("./samples/natureParkBoq.json")).default as unknown as BoqDocument;
  return { ...structuredClone(sample), date: todayIso() };
}
