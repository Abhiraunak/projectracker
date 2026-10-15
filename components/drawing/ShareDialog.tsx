"use client";

import React, { useState } from "react";
import { describeError } from "@/lib/api";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { useShareDrawing } from "@/hooks/useDrawings";
import type { AppUser, Drawing } from "@/lib/drawings/types";
import { UserPicker } from "./UserPicker";
import { buttonPrimary, buttonSecondary } from "./styles";

/** Change who a drawing is shared with. Everyone not ticked loses access. */
export function ShareDialog({ drawing, onClose }: { drawing: Drawing | null; onClose: () => void }) {
  return (
    <ModalDialog open={!!drawing} onClose={onClose} label="Share drawing" size="md">
      {drawing && <ShareBody key={drawing.id} drawing={drawing} onClose={onClose} />}
    </ModalDialog>
  );
}

const idsOf = (users: AppUser[]) => users.map((user) => user.id).sort().join(",");

function ShareBody({ drawing, onClose }: { drawing: Drawing; onClose: () => void }) {
  const share = useShareDrawing();
  const [selected, setSelected] = useState<AppUser[]>(drawing.sharedWith);
  const changed = idsOf(selected) !== idsOf(drawing.sharedWith);

  const handleSave = async () => {
    try {
      await share.mutateAsync({ id: drawing.id, userIds: selected.map((user) => user.id) });
      onClose();
    } catch {
      /* the error is shown below from share.error */
    }
  };

  return (
    <div>
      <DialogHeader title="Share drawing" subtitle={drawing.title} onClose={onClose} locked={share.isPending} />
      <div className="space-y-4 p-4 sm:p-5">
        <UserPicker selected={selected} onChange={setSelected} disabled={share.isPending} />
        <p className="text-xs text-stone-500">People you share with can view and download this drawing. They can&rsquo;t change or delete it.</p>

        {share.isError && (
          <p role="alert" className="text-sm text-red-700">
            {describeError(share.error)}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={share.isPending} className={buttonSecondary}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={!changed || share.isPending} className={buttonPrimary}>
            {share.isPending ? "Saving…" : "Save sharing"}
          </button>
        </div>
      </div>
    </div>
  );
}
