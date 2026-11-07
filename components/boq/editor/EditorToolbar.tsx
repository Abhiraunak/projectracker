"use client";

import React from "react";
import Link from "next/link";
import { FiAlertCircle, FiArrowLeft, FiCheck, FiCornerUpLeft, FiCornerUpRight, FiDownload, FiLock, FiPrinter, FiUnlock } from "react-icons/fi";
import type { BoqEditorState } from "@/hooks/useBoqEditor";
import { Pill } from "@/components/materials/Pill";
import { ProjectPicker } from "./ProjectPicker";
import { ShortcutsHelp } from "./ShortcutsHelp";

const BTN =
  "flex items-center gap-1.5 rounded border border-stone-300 px-2.5 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-40";

function SaveIndicator({ editor }: { editor: BoqEditorState }) {
  const text = {
    saved: "All changes saved",
    unsaved: "Unsaved changes…",
    saving: "Saving…",
    error: "Couldn't save",
    conflict: "Not saved: someone else changed this BOQ",
  }[editor.saveStatus];
  const bad = editor.saveStatus === "error" || editor.saveStatus === "conflict";

  return (
    <p aria-live="polite" className={`flex items-center gap-1.5 text-xs ${bad ? "text-red-700" : "text-stone-500"}`}>
      {editor.saveStatus === "saved" ? <FiCheck aria-hidden /> : bad ? <FiAlertCircle aria-hidden /> : null}
      {text}
      {editor.saveStatus === "error" && (
        <button type="button" onClick={editor.retrySave} className="font-medium underline">
          Retry
        </button>
      )}
    </p>
  );
}

interface Props {
  boqId: string;
  editor: BoqEditorState;
  onPrint: () => void;
  onExport: () => void;
  exporting: boolean;
  /** Inside a project workspace: back goes to its BOQ list, and the project is fixed (shown, not a picker) */
  embedded?: { onBack: () => void; projectTitle: string };
}

/** Above the page (never printed): back, title and save status, undo/redo, shortcuts, print, Excel, final/draft */
export function EditorToolbar({ boqId, editor, onPrint, onExport, exporting, embedded }: Props) {
  const title = editor.doc.title || "Untitled BOQ";
  const back = "rounded p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";

  return (
    <div
      className={
        embedded
          ? "rounded-[22px] border border-[#E8E8E6] bg-white px-4 py-3 sm:px-5"
          : "sticky top-14 z-20 -mx-4 border-b border-stone-200 bg-white px-4 py-3 sm:-mx-6 sm:px-6 lg:-top-6 lg:-mx-8 lg:px-8"
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {embedded ? (
            <button type="button" onClick={embedded.onBack} aria-label="Back to this project's BOQs" className={back}>
              <FiArrowLeft aria-hidden />
            </button>
          ) : (
            <Link href="/dashboard/boq" aria-label="Back to all BOQs" className={back}>
              <FiArrowLeft aria-hidden />
            </Link>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold">{title}</h1>
              {editor.status === "FINAL" ? <Pill tone="dark" icon={FiLock}>Final</Pill> : <Pill tone="neutral">Draft</Pill>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <SaveIndicator editor={editor} />
              {embedded ? <span className="truncate text-xs text-stone-500">Project: {embedded.projectTitle}</span> : <ProjectPicker boqId={boqId} />}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={editor.undo} disabled={!editor.canUndo} aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)" className={BTN}>
            <FiCornerUpLeft aria-hidden />
          </button>
          <button type="button" onClick={editor.redo} disabled={!editor.canRedo} aria-label="Redo (Ctrl+Y)" title="Redo (Ctrl+Y)" className={BTN}>
            <FiCornerUpRight aria-hidden />
          </button>
          <ShortcutsHelp />
          <button type="button" onClick={onPrint} className={BTN}>
            <FiPrinter aria-hidden /> Print
          </button>
          <button type="button" onClick={onExport} disabled={exporting} className={BTN}>
            <FiDownload aria-hidden /> {exporting ? "Preparing…" : "Excel"}
          </button>
          {editor.status === "DRAFT" ? (
            <button
              type="button"
              onClick={editor.markFinal}
              disabled={editor.conflict}
              className="flex items-center gap-1.5 rounded bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-40"
            >
              <FiLock aria-hidden /> Mark final
            </button>
          ) : (
            <button type="button" onClick={editor.reopen} className={BTN}>
              <FiUnlock aria-hidden /> Reopen as draft
            </button>
          )}
        </div>
      </div>
    </div>
  );
}