"use client";

import { useCallback, useState } from "react";

/** Which drawing (if any) is open in the viewer, the share dialog and the delete confirmation */
export function useDrawingDialogs() {
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const closeViewer = useCallback(() => setViewingId(null), []);
  const closeShare = useCallback(() => setSharingId(null), []);
  const closeDelete = useCallback(() => setDeletingId(null), []);

  return {
    viewingId,
    sharingId,
    deletingId,
    openViewer: setViewingId,
    openShare: setSharingId,
    askDelete: setDeletingId,
    closeViewer,
    closeShare,
    closeDelete,
  };
}
