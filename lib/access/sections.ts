import { BASE_PERMISSION, SECTION_ACCESS, type AdminUser, type Permission, type SectionAccess } from "./types";

export type TickState = "on" | "part" | "off";

/** Whether a person has all, some or none of a section's permissions */
export const sectionState = (selected: ReadonlySet<Permission>, s: SectionAccess): TickState => {
    const have = s.permissions.filter((p) => selected.has(p)).length;
    return have === 0 ? "off" : have === s.permissions.length ? "on" : "part";
};

/**
 * Switch one section on or off. On gives the whole section (and seeing projects, unless it's the diary-only tick).
 * Taking away the last section also takes away seeing projects.
 */
export const toggleSection = (selected: ReadonlySet<Permission>, s: SectionAccess): Set<Permission> => {
    const next = new Set(selected);
    if (sectionState(selected, s) === "on") {
        for (const p of s.permissions) next.delete(p);
        const anySection = SECTION_ACCESS.some((o) => !o.noProjects && o.permissions.some((p) => next.has(p)));
        if (!anySection) next.delete(BASE_PERMISSION);
    } else {
        for (const p of s.permissions) next.add(p);
        if (!s.noProjects) next.add(BASE_PERMISSION);
    }
    return next;
};

export type PersonKind = "admin" | "waiting" | "diaryOnly" | "engineer" | "staff";

export const personKind = (u: AdminUser): PersonKind => {
    if (u.isAdmin) return "admin";
    if (u.permissions.length === 0) return "waiting";
    if (!u.permissions.includes("diary.write")) return "staff";
    const other = SECTION_ACCESS.some((s) => !s.noProjects && s.permissions.some((p) => u.permissions.includes(p)));
    return other ? "engineer" : "diaryOnly";
};

export const KIND_LABEL: Record<PersonKind, string> = {
    admin: "Admin",
    waiting: "Waiting",
    diaryOnly: "Diary only",
    engineer: "Site engineer",
    staff: "Staff",
};

export const displayName = (u: Pick<AdminUser, "name" | "email">) => u.name?.trim() || u.email;

/** The short column headings of the access grid, in the same order as SECTION_ACCESS */
export const SHORT_LABEL: Record<SectionAccess["key"], string> = {
    overview: "Overview",
    boq: "BOQ",
    drawings: "Drawings",
    materials: "Materials",
    labour: "Labour",
    equipment: "Equipment",
    general: "General",
    diaryReview: "Engineer tab",
    diary: "Diary (phone)",
};

const asList = (value: unknown): Permission[] =>
    typeof value === "string" ? (value.split(",").map((p) => p.trim()).filter(Boolean) as Permission[]) : [];

/**
 * One access change in plain words, from the before/after the server logged:
 * "Made admin", "Gave Labour, BOQ", "Took away Materials".
 */
export const describeChange = (changes: Record<string, { from: unknown; to: unknown }> | null): string[] => {
    if (!changes) return [];
    const out: string[] = [];
    if (changes.admin) out.push(changes.admin.to ? "Made admin" : "Removed admin");
    if (changes.permissions) {
        const before = new Set(asList(changes.permissions.from));
        const after = new Set(asList(changes.permissions.to));
        const gave = SECTION_ACCESS.filter((s) => sectionState(after, s) === "on" && sectionState(before, s) !== "on");
        const took = SECTION_ACCESS.filter((s) => sectionState(after, s) === "off" && sectionState(before, s) !== "off");
        if (gave.length) out.push(`Gave ${gave.map((s) => SHORT_LABEL[s.key]).join(", ")}`);
        if (took.length) out.push(`Took away ${took.map((s) => SHORT_LABEL[s.key]).join(", ")}`);
        if (!gave.length && !took.length && !changes.admin) out.push(after.size === 0 ? "Took away all access" : "Changed access");
    }
    return out;
};