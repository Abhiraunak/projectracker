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

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The next free plain number for a drawing uploaded without one: D-01, D-02… */
function nextFreeNumber(existing: ProjectDrawing[]) {
  const used = new Set(existing.map((d) => d.number));
  for (let i = 1; i < 1000; i++) {
    const n = `D-${String(i).padStart(2, "0")}`;
    if (!used.has(n)) return n;
  }
  return `D-${Date.now() % 100000}`;
}

/**
 * Upload a drawing. The name comes first: the name (or the number) of a drawing that already exists makes this
 * upload its next revision, and the current one stays in the history; that is said before anything is sent.
 * The number is optional: a new drawing without one gets the next free number (D-01, D-02…).
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
  const clean = number.trim() ? normalizeNumber(number) : null;
  const badNumber = !!number.trim() && !clean;
  const numberMatch = clean ? byNumber.get(clean) : undefined;
  // The name follows the existing drawing (a revision) or the file name, until the person types their own
  const shownTitle = titleTouched ? title : (numberMatch?.title ?? (file ? titleFromFilename(file.name) : ""));
  // Same name as a drawing already here (and no other number typed): a new revision of it
  const nameMatch = !clean && shownTitle.trim() ? existing.find((d) => sameName(d.title, shownTitle)) : undefined;
  const match = numberMatch ?? nameMatch;
  const finalNumber = match?.number ?? clean ?? nextFreeNumber(existing);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || badNumber || !shownTitle.trim()) return;
    upload.mutate(
      // A revision found by its name keeps the name as it is written on the drawing
      { input: { file, number: finalNumber, title: nameMatch ? nameMatch.title : shownTitle.trim(), description: description.trim() }, onProgress: setProgress },
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
          <span className="font-medium text-stone-700">Drawing name</span>
          <input
            value={shownTitle}
            onChange={(e) => {
              setTitleTouched(true);
              setTitle(e.target.value);
            }}
            required
            maxLength={120}
            list="drawing-names"
            autoFocus={!initialNumber}
            placeholder="Ground floor plan"
            className={field}
          />
          <datalist id="drawing-names">
            {existing.map((d) => (
              <option key={d.id} value={d.title}>
                {d.number}
              </option>
            ))}
          </datalist>
          <span aria-live="polite" className={`mt-1 block text-xs ${match ? "text-amber-700" : "text-stone-500"}`}>
            {match
              ? `${match.title} exists (${match.number}, R${match.revision}). This upload becomes R${match.revision + 1}; R${match.revision} stays in its history.`
              : "Using the name of a drawing that's already here adds a new revision of it."}
          </span>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-stone-700">
            Drawing number <span className="font-normal text-stone-400">(optional)</span>
          </span>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            maxLength={24}
            placeholder={match ? match.number : `e.g. A-1.00 (or leave empty: ${nextFreeNumber(existing)})`}
            list="drawing-numbers"
            autoCapitalize="characters"
            className={`${field} font-semibold uppercase tabular-nums placeholder:font-normal placeholder:normal-case`}
          />
          <datalist id="drawing-numbers">
            {existing.map((d) => (
              <option key={d.id} value={d.number}>
                {d.title}
              </option>
            ))}
          </datalist>
          {badNumber && <span className="mt-1 block text-xs text-red-700">Use letters, numbers and - . / only, like A-1.00.</span>}
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
            disabled={upload.isPending || !file || badNumber || !shownTitle.trim()}
            className="min-h-11 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {upload.isPending ? `Uploading ${Math.round(progress * 100)}%` : match ? `Upload as R${match.revision + 1}` : "Upload"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}