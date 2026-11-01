"use client";

import { useMemo, useState } from "react";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { useUploadProjectDrawing } from "@/hooks/useProjectDrawings";
import { goTo } from "@/hooks/useWorkspacePlace";
import { describeError } from "@/lib/api";
import { titleFromFilename } from "@/lib/drawings/format";
import { normalizeNumber } from "@/lib/drawings/numbers";
import type { ProjectDrawing } from "@/lib/drawings/projectApi";

const ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.dwg,.dxf,.dwf";
const field = "mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none";

/**
 * Upload a drawing under a number. Typing a number that already exists says, before anything is sent, that this
 * will be its next revision and the current one stays in the history.
 */
export default function UploadDrawingDialog({
  projectId,
  existing,
  initialNumber,
  onClose,
}: {
  projectId: string;
  existing: ProjectDrawing[];
  initialNumber: string;
  onClose: () => void;
}) {
  const [number, setNumber] = useState(initialNumber);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);
  const upload = useUploadProjectDrawing(projectId);

  const byNumber = useMemo(() => new Map(existing.map((d) => [d.number, d])), [existing]);
  const clean = normalizeNumber(number);
  const match = clean ? byNumber.get(clean) : undefined;
  // The title follows the existing drawing (a revision) or the file name, until the person types their own
  const shownTitle = titleTouched ? title : (match?.title ?? (file ? titleFromFilename(file.name) : ""));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !clean || !shownTitle.trim()) return;
    upload.mutate(
      { input: { file, number: clean, title: shownTitle.trim(), description: description.trim() }, onProgress: setProgress },
      {
        onSuccess: ({ drawing }) => {
          onClose();
          goTo({ projectId, section: "drawings", item: drawing.id }); // straight to what was uploaded
        },
      }
    );
  };

  return (
    <ModalDialog open onClose={onClose} label={match ? `New revision of ${match.number}` : "Upload drawing"} locked={upload.isPending}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">{initialNumber ? `New revision of ${initialNumber}` : "Upload drawing"}</h2>

        <label className="block text-sm">
          <span className="font-medium text-stone-700">Drawing number</span>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            required
            maxLength={24}
            placeholder="e.g. A-1.00"
            list="drawing-numbers"
            autoCapitalize="characters"
            autoFocus={!initialNumber}
            className={`${field} font-semibold uppercase tabular-nums placeholder:font-normal placeholder:normal-case`}
          />
          <datalist id="drawing-numbers">
            {existing.map((d) => (
              <option key={d.id} value={d.number}>
                {d.title}
              </option>
            ))}
          </datalist>
          <span aria-live="polite" className={`mt-1 block text-xs ${number && !clean ? "text-red-700" : match ? "text-amber-700" : "text-stone-500"}`}>
            {number && !clean
              ? "Use letters, numbers and - . / only, like A-1.00."
              : match
                ? `${match.number} exists (R${match.revision}). This upload becomes R${match.revision + 1}; R${match.revision} stays in its history.`
                : "Uploading a number that exists makes a new revision."}
          </span>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-stone-700">File</span>
          <input
            type="file"
            accept={ACCEPT}
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-stone-100 file:px-4 file:font-medium"
          />
          <span className="mt-1 block text-xs text-stone-500">PDF, image or AutoCAD (DWG, DXF, DWF)</span>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-stone-700">Title</span>
          <input
            value={shownTitle}
            onChange={(e) => {
              setTitleTouched(true);
              setTitle(e.target.value);
            }}
            required
            maxLength={120}
            placeholder="Ground floor plan"
            className={field}
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-stone-700">
            What changed <span className="font-normal text-stone-400">(optional)</span>
          </span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} className={`${field} py-2`} />
        </label>

        {upload.isPending && (
          <div aria-label="Uploading" className="h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full bg-orange-500 transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {upload.isError && (
          <p role="alert" className="text-sm text-red-700">
            {describeError(upload.error)}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={upload.isPending} className="min-h-11 rounded-lg px-4 text-sm font-medium text-stone-600 hover:bg-stone-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={upload.isPending || !file || !clean || !shownTitle.trim()}
            className="min-h-11 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {upload.isPending ? `Uploading ${Math.round(progress * 100)}%` : match ? `Upload as R${match.revision + 1}` : "Upload"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
