/**
 * Where the person is inside the project workspace, kept in the address: ?p=<project>&s=<section>&i=<item>.
 * The item is a place inside a section, such as one material tile ("steel") on the Materials section.
 * So the back button, a refresh, a bookmark or a shared link all land on the same screen.
 */
export const SECTION_KEYS = ["overview", "progress", "drawings", "boq", "materials", "payments", "rates", "expenses", "attendance", "equipment"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export interface Place {
  projectId: string | null;
  section: SectionKey;
  /** A place inside the section (e.g. a material tile); none means the section's first screen */
  item?: string | null;
}

const isSection = (v: string | null): v is SectionKey => v !== null && (SECTION_KEYS as readonly string[]).includes(v);
const ID = /^[A-Za-z0-9_-]{1,64}$/; // project ids are cuids; anything else in the address is ignored
const ITEM = /^[a-z0-9-]{1,40}$/; // equipment ids are lowercase cuids, so they fit too

export function parsePlace(search: string): Place {
  const q = new URLSearchParams(search);
  const p = q.get("p");
  const projectId = p && ID.test(p) ? p : null;
  const s = q.get("s");
  const section = projectId && isSection(s) ? s : "overview";
  const i = q.get("i");
  return { projectId, section, item: section !== "overview" && i && ITEM.test(i) ? i : null };
}

/** The address for a place. Other parameters are kept; the defaults are left out, so addresses stay short. */
export function placeSearch(place: Place, currentSearch = ""): string {
  const q = new URLSearchParams(currentSearch);
  q.delete("p");
  q.delete("s");
  q.delete("i");
  if (place.projectId) {
    q.set("p", place.projectId);
    if (place.section !== "overview") {
      q.set("s", place.section);
      if (place.item) q.set("i", place.item);
    }
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const samePlace = (a: Place, b: Place) => a.projectId === b.projectId && a.section === b.section && (a.item ?? null) === (b.item ?? null);
