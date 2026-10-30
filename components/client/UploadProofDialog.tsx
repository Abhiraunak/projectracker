"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FiUploadCloud } from "react-icons/fi";
import { ModalDialog, DialogHeader } from "@/components/utilites/ModalDialog";
import { describeError } from "@/lib/api";
import type { Instalment } from "@/lib/client/types";
import { useSendProof } from "@/hooks/useClientPortal";
import { PaymentFields, emptyDraft, readDraft, type PaymentDraft } from "./PaymentFields";
import { ErrorBox, inr, primaryButton, secondaryButton } from "./ui";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf";

/** The client sends a screenshot (or PDF) of a payment against one invoice */
export function UploadProofDialog({ projectId, instalment, onClose }: { projectId: string; instalment: Instalment | null; onClose: () => void }) {
  return (
    <ModalDialog open={!!instalment} onClose={onClose} label="Send payment proof" size="lg">
      {instalment && <UploadForm projectId={projectId} instalment={instalment} onClose={onClose} />}
    </ModalDialog>
  );
}

function UploadForm({ projectId, instalment, onClose }: { projectId: string; instalment: Instalment; onClose: () => void }) {
  const left = Math.max(0, instalment.remaining - instalment.checking);
  const [draft, setDraft] = useState<PaymentDraft>(() => emptyDraft(left));
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const send = useSendProof(projectId);

  // A small preview of the screenshot, so the client can see they picked the right one
  const preview = useMemo(() => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const pick = (f: File | null) => {
    setProblem(null);
    if (f && f.size > MAX_BYTES) {
      setProblem("That file is over 10 MB. Send a smaller screenshot.");
      return;
    }
    setFile(f);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (send.isPending) return;
    const read = readDraft(draft, left);
    if ("error" in read) return setProblem(read.error);
    if (!file) return setProblem("Attach the payment screenshot or PDF.");
    setProblem(null);
    send.mutate({ instalmentId: instalment.id, input: read.input, file }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={submit}>
      <DialogHeader title="Send payment proof" subtitle={`${instalment.invoiceNo} · ${instalment.label} · ${inr(left)} left to pay`} onClose={onClose} locked={send.isPending} />
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <label
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-5 text-center text-sm hover:border-stone-500 focus-within:border-orange-500"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files[0] ?? null);
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob preview, nothing for next/image to optimise
            <img src={preview} alt="The screenshot you picked" className="max-h-48 rounded-lg border border-stone-200 object-contain" />
          ) : (
            <FiUploadCloud aria-hidden className="text-3xl text-stone-500" />
          )}
          <span className="font-semibold">{file ? file.name : "Choose the payment screenshot"}</span>
          <span className="text-xs text-stone-500">{file ? "Tap to pick a different file" : "PNG, JPG or PDF, up to 10 MB. You can also drop it here."}</span>
          <input type="file" accept={ACCEPT} className="sr-only" disabled={send.isPending} onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </label>

        <PaymentFields value={draft} onChange={setDraft} disabled={send.isPending} />

        <p className="text-xs text-stone-500">We&apos;ll check the payment against our account. It shows as paid once it&apos;s confirmed, usually within a working day.</p>
        {(problem || send.isError) && <ErrorBox>{problem ?? describeError(send.error)}</ErrorBox>}
      </div>
      <div className="flex justify-end gap-2 border-t border-stone-200 px-4 py-3 sm:px-5">
        <button type="button" onClick={onClose} disabled={send.isPending} className={secondaryButton}>
          Cancel
        </button>
        <button type="submit" disabled={send.isPending} className={primaryButton}>
          {send.isPending ? "Sending…" : "Send for checking"}
        </button>
      </div>
    </form>
  );
}
