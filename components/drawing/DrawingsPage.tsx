"use client";

import React, { useCallback, useEffect } from "react";
import { Heading } from "@/components/utilites/Label";
import { ConfirmDeleteDialog } from "@/components/utilites/Confirmdeletedialog"; // match your actual file name
import { describeError } from "@/lib/api";
import { useDeleteDrawing, useDrawingList } from "@/hooks/useDrawings";
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
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <Heading>Drawings</Heading>
        <p className="mt-1 text-sm text-stone-500">Upload drawings and share them with the people on your project.</p>
      </header>

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
  );
}
