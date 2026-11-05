"use client";

import DrawingsBook from "./DrawingsBook";

/**
 * The project's Drawings tab: the folder grid (one dark folder per drawing, its revisions inside).
 * Kept so a sections.ts that still loads "./sections/DrawingsSection" shows the same thing as "./sections/DrawingsBook".
 */
export default function DrawingsSection({ projectId }: { projectId: string }) {
  return <DrawingsBook projectId={projectId} />;
}