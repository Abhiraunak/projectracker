"use client";

import { DrawingsPage } from "@/components/drawing/DrawingsPage";


/**
 * Drawings. Until Phase 4 links each drawing to a project and numbers it (A-1.00), this shows every drawing the
 * person can see, the same as the Drawing page.
 */
export default function DrawingsSection(_props: { projectId: string }) {
  return <DrawingsPage />;
}
