"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, describeError } from "@/lib/api";
import { boqApi } from "@/lib/boq/api";
import type { BoqDocument, BoqRecord, BoqStatus } from "@/lib/boq/types";
import { boqKeys, useSaveBoq } from "./useBoqs";
import { useAutosave } from "./useAutosave";
import { useEditHistory } from "./useEditHistory";
import { useEditorShortcuts } from "./useEditorShortcuts";
import { useUnsavedWarning } from "./useUnsavedWarning";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict";

/**
 * Everything the BOQ editor needs: the document with undo/redo, automatic saving, the final/draft switch,
 * and what to do when someone else saved the same BOQ meanwhile.
 * `record` is only the starting point: from then on this hook's copy is the one being edited.
 */
export function useBoqEditor(record: BoqRecord) {
  const history = useEditHistory<BoqDocument>(record.document);
  const [status, setStatus] = useState<BoqStatus>(record.status);
  const [conflict, setConflict] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const versionRef = useRef(record.version);
  const queryClient = useQueryClient();
  const { mutateAsync } = useSaveBoq(record.id);

  const statusRef = useRef(status);
  statusRef.current = status;
  const readOnly = status === "FINAL" || conflict;
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;

  /** One save to the server, with the version it was loaded at */
  const persist = useCallback(
    async (document: BoqDocument, nextStatus: BoqStatus) => {
      try {
        const saved = await mutateAsync({ document, version: versionRef.current, status: nextStatus });
        versionRef.current = saved.version;
        setStatus(saved.status);
      } catch (error) {
        if (error instanceof ApiError && error.status === 409 && statusRef.current === "DRAFT") setConflict(true);
        throw error;
      }
    },
    [mutateAsync]
  );

  const autosave = useAutosave({
    value: history.present,
    save: (document) => persist(document, "DRAFT"),
    enabled: status === "DRAFT" && !conflict,
  });

  /** Edits do nothing while the BOQ is final or in conflict */
  const apply = useCallback(
    (update: (doc: BoqDocument) => BoqDocument, key?: string) => {
      if (!readOnlyRef.current) history.apply(update, key);
    },
    [history.apply]
  );

  const runAction = useCallback(async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(describeError(error));
    }
  }, []);

  /** Final: save anything pending first, then lock */
  const markFinal = () =>
    runAction(async () => {
      await autosave.flush();
      await persist(history.present, "FINAL");
      autosave.markSaved(history.present);
    });

  const reopen = () => runAction(() => persist(history.present, "DRAFT"));

  /** Someone else saved first: take their version, or save mine over it */
  const resolveConflict = (choice: "theirs" | "mine") =>
    runAction(async () => {
      const fresh = await boqApi.get(record.id);
      queryClient.setQueryData(boqKeys.one(record.id), fresh);
      versionRef.current = fresh.version;
      setStatus(fresh.status);
      if (choice === "theirs" || fresh.status === "FINAL") {
        history.reset(fresh.document);
        autosave.markSaved(fresh.document);
        setConflict(false);
        return;
      }
      setConflict(false);
      await autosave.retry(); // saves this copy over theirs, now with their version number
    });

  const saveStatus: SaveStatus = conflict
    ? "conflict"
    : autosave.state === "pending"
      ? "unsaved"
      : autosave.state === "saving"
        ? "saving"
        : autosave.state === "error"
          ? "error"
          : "saved";

  useUnsavedWarning(saveStatus !== "saved");
  useEditorShortcuts({ undo: history.undo, redo: history.redo, save: () => void autosave.flush(), enabled: !readOnly });

  return {
    doc: history.present,
    apply,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo && !readOnly,
    canRedo: history.canRedo && !readOnly,
    status,
    readOnly,
    conflict,
    saveStatus,
    saveError: autosave.error ? describeError(autosave.error) : null,
    actionError,
    retrySave: () => void autosave.retry(),
    markFinal,
    reopen,
    resolveConflict,
  };
}

export type BoqEditorState = ReturnType<typeof useBoqEditor>;
