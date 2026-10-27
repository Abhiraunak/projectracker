"use client";

import React, { useCallback, useEffect } from "react";
import { Heading } from "@/components/utilites/Label";
import { ConfirmDeleteDialog } from "@/components/utilites/Confirmdeletedialog"; // match your actual file name
import { describeError } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteDrawing, useDrawingList } from "@/hooks/useDrawings";
import { NotificationsPrompt } from "@/components/notifications/NotificationsPrompt";
import { useDrawingDialogs } from "@/hooks/useDrawingDialogs";
import { useGalleryFilters } from "@/hooks/useGalleryFilters";
import { DrawingGallery } from "./DrawingGallery";
import { DrawingUploader } from "./DrawingUploader";
import { DrawingViewer } from "./DrawingViewer";
import { GalleryToolbar } from "./GalleryToolbar";
import { ShareDialog } from "./ShareDialog";

/** The page: uploader on top, gallery below. It only decides which dialog is open. */
export function DrawingsPage() {
  const filters = useGalleryFilters();
  const list = useDrawingList(filters.params);
  const dialogs = useDrawingDialogs();
  const remove = useDeleteDrawing();
  const queryClient = useQueryClient();

  // Opened from a notification (/dashboard/drawing?tab=shared&q=<title>): show that drawing straight away.
  // Read once on arrival; window.location avoids Next's useSearchParams, which needs a Suspense boundary.
  const { setScope, setSearch } = filters;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const q = params.get("q");
    if (tab === "all" || tab === "mine" || tab === "shared") setScope(tab);
    if (q) setSearch(q.slice(0, 100));
  }, [setScope, setSearch]);

  // A notification arrived while this page is open: refresh the gallery so the new drawing shows
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "push") void queryClient.invalidateQueries({ queryKey: ["drawings"] });
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [queryClient]);

  const items = list.data?.items ?? [];
  const find = (id: string | null) => items.find((drawing) => drawing.id === id) ?? null;
  const viewing = find(dialogs.viewingId);
  const sharing = find(dialogs.sharingId);
  const deleting = find(dialogs.deletingId);
  const viewingIndex = items.findIndex((drawing) => drawing.id === dialogs.viewingId);

  // If the last drawing on the last page goes away, step back instead of showing an empty page
  const { setPage } = filters;
  const totalPages = list.data?.totalPages;
  const currentPage = filters.params.page;
  useEffect(() => {
    if (totalPages && currentPage > totalPages) setPage(totalPages);
  }, [totalPages, currentPage, setPage]);

  const showPrev = useCallback(() => {
    const previous = items[viewingIndex - 1];
    if (previous) dialogs.openViewer(previous.id);
  }, [items, viewingIndex, dialogs]);

  const showNext = useCallback(() => {
    const next = items[viewingIndex + 1];
    if (next) dialogs.openViewer(next.id);
  }, [items, viewingIndex, dialogs]);

  const shareFromViewer = (id: string) => {
    dialogs.closeViewer();
    dialogs.openShare(id);
  };

  const askToDelete = (id: string) => {
    remove.reset();
    dialogs.askDelete(id);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      dialogs.closeDelete();
    } catch {
      /* shown in the dialog from remove.error */
    }
  };

  return (
    <div className="min-w-0 text-stone-900">
      {/*
        Stays at the top while the page scrolls, the same as the Labour page header. On phones and tablets it sits
        just under the layout's 56px top bar (top-14). On large screens the white card scrolls, and a sticky element
        sticks inside the card's 24px padding, so lg:-top-6 lifts it flush to the card's edge; the negative margins
        with matching padding stretch its white background over the card's padding.
      */}
      <header className="sticky top-14 z-20 -mx-4 -mt-5 border-b border-stone-200 bg-white px-4 pt-3 sm:-mx-6 sm:-mt-6 sm:px-6 lg:-top-6 lg:-mx-8 lg:px-8 lg:pt-4">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 min-w-0 space-y-0.5 sm:mb-4">
            <Heading>Drawings</Heading>
            <p className="text-sm text-stone-500">Upload images, PDFs and AutoCAD drawings, and share them with the people on your project.</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 py-5 sm:py-8">
        <NotificationsPrompt />

        <DrawingUploader />

        <section aria-label="Gallery" className="space-y-4">
          <h2 className="text-base font-semibold">Gallery</h2>
          <GalleryToolbar scope={filters.scope} search={filters.search} onScopeChange={filters.setScope} onSearchChange={filters.setSearch} />
          <DrawingGallery
            list={list}
            scope={filters.scope}
            isSearching={filters.search.trim() !== ""}
            onOpen={dialogs.openViewer}
            onShare={dialogs.openShare}
            onDelete={askToDelete}
            onPageChange={filters.setPage}
          />
        </section>

        <DrawingViewer
          drawing={viewing}
          hasPrev={viewingIndex > 0}
          hasNext={viewingIndex >= 0 && viewingIndex < items.length - 1}
          onPrev={showPrev}
          onNext={showNext}
          onClose={dialogs.closeViewer}
          onShare={shareFromViewer}
        />

        <ShareDialog drawing={sharing} onClose={dialogs.closeShare} />

        <ConfirmDeleteDialog
          open={!!deleting}
          onClose={dialogs.closeDelete}
          onConfirm={confirmDelete}
          title="Delete drawing?"
          itemName={deleting?.title}
          warning={
            deleting && deleting.sharedWith.length > 0
              ? `${deleting.sharedWith.length} ${deleting.sharedWith.length === 1 ? "person" : "people"} will lose access to this drawing.`
              : undefined
          }
          confirmLabel="Delete drawing"
          pending={remove.isPending}
          error={remove.isError ? describeError(remove.error) : null}
        />
      </div>
    </div>
  );
}