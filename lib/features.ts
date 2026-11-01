/**
 * Feature switches for the web app: the same names as the API's FEATURES setting.
 *
 *   NEXT_PUBLIC_FEATURES=projectHub,progress   only these are on
 *   NEXT_PUBLIC_FEATURES=all                   everything is on
 *
 * Next.js writes the value into the build, so changing it on Vercel needs a redeploy (about a minute); turning the
 * API's FEATURES off is the instant switch, since a switched-off feature's routes answer 404.
 */
export const FEATURE_NAMES = ["projectHub", "progress", "materialSheet", "drawingsByProject", "labourTeams", "equipment"] as const;
export type Feature = (typeof FEATURE_NAMES)[number];

// Written out in full: Next.js only replaces process.env.NEXT_PUBLIC_* when it appears exactly like this
const names = (process.env.NEXT_PUBLIC_FEATURES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const ON: ReadonlySet<string> = new Set(names.includes("all") ? FEATURE_NAMES : names);

export const isFeatureOn = (feature: Feature) => ON.has(feature);
