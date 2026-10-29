"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronDown, FiChevronRight, FiSearch } from "react-icons/fi";
import { describeError } from "@/lib/api";
import { fmtQty } from "@/lib/inventory/figures";
import type { ImportableBoq, ImportOutline, ImportPart, ImportResult } from "@/lib/inventory/types";
import { useImportableBoqs, useImportFromBoq, useImportOutline } from "@/hooks/useInventory";
import { DialogHeader, ModalDialog } from "@/components/utilites/ModalDialog";
import { buttonPrimary, buttonSecondary, inputBase } from "../utilites/Label";

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onImported: (result: ImportResult["imported"], boqTitle: string) => void;
}

/**
 * Import from BOQ: choose one of the company's BOQs, then tick whole sections or single items (or single parts of an
 * item) to add to this project's inventory. Items already in it are shown ticked and can't be added twice.
 */
export function ImportFromBoqDialog(props: Props) {
  const [locked, setLocked] = useState(false);
  return (
    <ModalDialog open={props.open} onClose={props.onClose} label="Import items from a BOQ" size="xl" locked={locked}>
      {props.open && <Body {...props} setLocked={setLocked} />}
    </ModalDialog>
  );
}

function Body({ projectId, onClose, onImported, setLocked }: Props & { setLocked: (v: boolean) => void }) {
  const [boqId, setBoqId] = useState<string | null>(null);
  const boqs = useImportableBoqs(projectId, true);

  return boqId ? (
    <PickItems projectId={projectId} boqId={boqId} onBack={() => setBoqId(null)} onClose={onClose} onImported={onImported} setLocked={setLocked} />
  ) : (
    <PickBoq boqs={boqs.data} pending={boqs.isPending} error={boqs.isError ? describeError(boqs.error) : null} onPick={setBoqId} onClose={onClose} />
  );
}

/* --------------------------------- step 1: the BOQ -------------------------------- */

const LINK_TEXT = {
  this: "This project",
  free: "No project yet: importing links it to this project",
  other: "",
} as const;

function PickBoq({ boqs, pending, error, onPick, onClose }: { boqs: ImportableBoq[] | undefined; pending: boolean; error: string | null; onPick: (id: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (boqs ?? []).filter((b) => !q || [b.title, b.subtitle, b.boqNumber, b.project?.title ?? ""].some((t) => t.toLowerCase().includes(q)));
  }, [boqs, search]);

  return (
    <>
      <DialogHeader title="Import from BOQ" subtitle="Step 1 of 2: choose the BOQ" onClose={onClose} />
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <div className="relative">
          <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <label htmlFor="import-boq-search" className="sr-only">
            Search BOQs
          </label>
          <input id="import-boq-search" className={`${inputBase} pl-9`} placeholder="Search by title, number or project" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {pending && <div aria-busy="true" className="h-48 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />}
        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {boqs && shown.length === 0 && (
          <p className="rounded border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">{boqs.length === 0 ? "There are no BOQs yet. Create one on the BOQ page first." : "No BOQ matches that search."}</p>
        )}

        <ul className="divide-y divide-stone-200 rounded border border-stone-300">
          {shown.map((b) => {
            const blocked = b.link === "other";
            return (
              <li key={b.id}>
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => onPick(b.id)}
                  className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{b.title || "Untitled BOQ"}</span>
                    <span className="block truncate text-xs text-stone-500">
                      {[b.subtitle, b.boqNumber && `No. ${b.boqNumber}`, `${b.itemCount} ${b.itemCount === 1 ? "item" : "items"}`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
                    {b.importedCount > 0 && <span className="text-stone-600">{b.importedCount} in inventory</span>}
                    <span className={`rounded px-2 py-0.5 ${b.link === "this" ? "bg-amber-100 text-amber-900" : b.link === "free" ? "bg-stone-100 text-stone-700" : "bg-stone-100 text-stone-500"}`}>
                      {blocked ? `Belongs to ${b.project?.title ?? "another project"}` : LINK_TEXT[b.link]}
                    </span>
                    {b.status === "FINAL" && <span className="rounded border border-stone-300 px-2 py-0.5 text-stone-600">Final</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {boqs?.some((b) => b.link === "other") && (
          <p className="text-xs text-stone-500">A BOQ that belongs to another project can&rsquo;t be imported here, because its items are already counted there. Change its project in the BOQ editor to use it here.</p>
        )}
      </div>
      <div className="flex justify-end border-t border-stone-200 px-4 py-3 sm:px-5">
        <button type="button" className={buttonSecondary} onClick={onClose}>
          Cancel
        </button>
      </div>
    </>
  );
}

/* ------------------------------ step 2: tick the items ------------------------------ */

type Outline = ImportOutline;
type OutlineItem = Outline["sheets"][number]["sections"][number]["items"][number];

const canTick = (p: ImportPart) => p.state !== "in";
const matches = (item: OutlineItem, q: string) =>
  !q || [item.code, item.description, ...item.parts.map((p) => `${p.code} ${p.title}`)].some((t) => t.toLowerCase().includes(q));

function PickItems({ projectId, boqId, onBack, onClose, onImported, setLocked }: { projectId: string; boqId: string; onBack: () => void; onClose: () => void; onImported: Props["onImported"]; setLocked: (v: boolean) => void }) {
  const outline = useImportOutline(projectId, boqId);
  const save = useImportFromBoq(projectId);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [closed, setClosed] = useState<Set<string>>(new Set()); // folded sections
  const q = search.trim().toLowerCase();
  const data = outline.data;

  useEffect(() => setLocked(save.isPending), [save.isPending, setLocked]);

  const allParts = useMemo(() => data?.sheets.flatMap((s) => s.sections.flatMap((sec) => sec.items.flatMap((i) => i.parts))) ?? [], [data]);
  const tickable = allParts.filter(canTick);
  const already = allParts.length - tickable.length;
  const visibleTickable = useMemo(
    () => (data?.sheets.flatMap((s) => s.sections.flatMap((sec) => sec.items.filter((i) => matches(i, q)).flatMap((i) => i.parts))) ?? []).filter(canTick),
    [data, q]
  );

  const setMany = (keys: string[], on: boolean) =>
    setPicked((current) => {
      const next = new Set(current);
      for (const k of keys) (on ? next.add(k) : next.delete(k));
      return next;
    });

  const submit = async () => {
    try {
      const result = await save.mutateAsync({ boqId, partKeys: [...picked] });
      onImported(result.imported, data?.boq.title || "Untitled BOQ");
      onClose();
    } catch {
      /* shown below */
    }
  };

  return (
    <>
      <DialogHeader title="Import from BOQ" subtitle={data ? `Step 2 of 2: tick what to add · ${data.boq.title || "Untitled BOQ"}` : "Step 2 of 2: tick what to add"} onClose={onClose} locked={save.isPending} />
      <div className="space-y-3 px-4 py-4 sm:px-5">
        {outline.isPending && <div aria-busy="true" className="h-64 animate-pulse rounded bg-stone-200/60 motion-reduce:animate-none" />}
        {outline.isError && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{describeError(outline.error)}</p>}

        {data && (
          <>
            {data.boq.link === "free" && (
              <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                This BOQ isn&rsquo;t linked to a project yet. Importing links it to this project, so later changes to these items in the BOQ can be brought in with <span className="font-medium">Sync from BOQ</span>.
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <label htmlFor="import-item-search" className="sr-only">
                  Search items
                </label>
                <input id="import-item-search" className={`${inputBase} pl-9`} placeholder="Search items: code or words" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button type="button" className={buttonSecondary} onClick={() => setMany(visibleTickable.map((p) => p.partKey), true)} disabled={visibleTickable.length === 0}>
                  Tick all{q ? " shown" : ""}
                </button>
                <button type="button" className={buttonSecondary} onClick={() => setPicked(new Set())} disabled={picked.size === 0}>
                  Clear
                </button>
              </div>
            </div>

            {allParts.length === 0 && (
              <div className="rounded border border-dashed border-stone-300 p-6 text-center text-sm text-stone-600">
                <p className="font-semibold text-stone-900">This BOQ has no items yet</p>
                <p className="mt-1">Open the BOQ and add its items (with a description, and a quantity or unit), then come back to import them.</p>
              </div>
            )}

            <p className="text-sm text-stone-600" aria-live="polite">
              {allParts.length === 0
                ? ""
                : tickable.length === 0
                ? "Every item of this BOQ is already in this project's inventory."
                : `${picked.size} of ${tickable.length} ticked${already ? ` · ${already} already in inventory` : ""}`}
            </p>

            <div className="max-h-[52dvh] space-y-3 overflow-y-auto">
              {data.sheets.map((sheet, si) => (
                <div key={si} className="space-y-3">
                  {data.sheets.length > 1 && <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{sheet.name}</h3>}
                  {sheet.sections.map((section, ci) => {
                    const id = `${si}:${ci}`;
                    const items = section.items.filter((i) => matches(i, q));
                    if (items.length === 0) return null;
                    const keys = items.flatMap((i) => i.parts).filter(canTick).map((p) => p.partKey);
                    const on = keys.filter((k) => picked.has(k)).length;
                    const folded = closed.has(id) && !q;
                    const name = [section.code, section.title].filter(Boolean).join(" ") || "Items";
                    return (
                      <section key={id} className="rounded border border-stone-300">
                        <div className="flex items-center gap-3 border-b border-stone-200 bg-stone-50 px-3 py-2">
                          <TriCheckbox
                            label={`Tick every item in ${name}`}
                            checked={keys.length > 0 && on === keys.length}
                            mixed={on > 0 && on < keys.length}
                            disabled={keys.length === 0}
                            onChange={(v) => setMany(keys, v)}
                          />
                          <button
                            type="button"
                            onClick={() => setClosed((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                            aria-expanded={!folded}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                          >
                            {folded ? <FiChevronRight aria-hidden /> : <FiChevronDown aria-hidden />}
                            <span className="truncate">{name}</span>
                            <span className="shrink-0 font-normal text-stone-500">
                              · {items.length} {items.length === 1 ? "item" : "items"}
                              {keys.length === 0 ? " · all in inventory" : ""}
                            </span>
                          </button>
                        </div>
                        {!folded && (
                          <ul className="divide-y divide-stone-200">
                            {items.map((item, ii) => (
                              <ItemRow key={ii} item={item} picked={picked} setMany={setMany} />
                            ))}
                          </ul>
                        )}
                      </section>
                    );
                  })}
                </div>
              ))}
              {q && !data.sheets.some((sh) => sh.sections.some((sec) => sec.items.some((i) => matches(i, q)))) && (
                <p className="rounded border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">No item matches that search.</p>
              )}
            </div>

            <p className="text-xs text-stone-500">Each item gets the best-fitting recipe&rsquo;s materials, marked &ldquo;Suggested: check&rdquo;. Items without a recipe are added for you to set their materials.</p>
          </>
        )}
        {save.isError && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{describeError(save.error)}</p>}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-stone-200 px-4 py-3 sm:flex-row sm:justify-between sm:px-5">
        <button type="button" className={buttonSecondary} onClick={onBack} disabled={save.isPending}>
          Choose another BOQ
        </button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" className={buttonSecondary} onClick={onClose} disabled={save.isPending}>
            Cancel
          </button>
          <button type="button" className={buttonPrimary} onClick={submit} disabled={picked.size === 0 || save.isPending}>
            {save.isPending ? "Adding…" : picked.size > 0 ? `Add ${picked.size} to inventory` : "Add to inventory"}
          </button>
        </div>
      </div>
    </>
  );
}

function ItemRow({ item, picked, setMany }: { item: OutlineItem; picked: Set<string>; setMany: (keys: string[], on: boolean) => void }) {
  const keys = item.parts.filter(canTick).map((p) => p.partKey);
  const on = keys.filter((k) => picked.has(k)).length;
  const single = item.parts.length === 1 ? item.parts[0]! : null;
  const label = [item.code, item.description].filter(Boolean).join(" ");

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start gap-3">
        <TriCheckbox
          label={`Tick ${label}`}
          checked={keys.length === 0 || on === keys.length}
          mixed={on > 0 && on < keys.length}
          disabled={keys.length === 0}
          onChange={(v) => setMany(keys, v)}
        />
        <div className="min-w-0 flex-1 text-sm">
          <p className={keys.length === 0 ? "text-stone-500" : ""}>
            {item.code && <span className="mr-1.5 font-semibold">{item.code}</span>}
            <span className="line-clamp-2">{item.description || "Untitled item"}</span>
          </p>
          {single && <PartFacts part={single} />}
        </div>
      </div>

      {!single && (
        <ul className="mt-2 space-y-1.5 pl-7">
          {item.parts.map((part) => (
            <li key={part.partKey} className="flex items-start gap-3">
              <TriCheckbox label={`Tick ${part.code} ${part.title}`} checked={!canTick(part) || picked.has(part.partKey)} disabled={!canTick(part)} onChange={(v) => setMany([part.partKey], v)} />
              <div className="min-w-0 flex-1 text-sm">
                <p className={canTick(part) ? "" : "text-stone-500"}>
                  <span className="mr-1.5 font-medium">{part.code}</span>
                  {part.title.split(" · ").slice(1).join(" · ") || part.title}
                </p>
                <PartFacts part={part} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function PartFacts({ part }: { part: ImportPart }) {
  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
      <span className="tabular-nums">
        {part.quantity === 0 && !part.unit ? "No quantity yet" : `${fmtQty(part.quantity)} ${part.unit}`}
      </span>
      {part.state === "in" && <span className="rounded bg-stone-100 px-1.5 py-0.5 text-stone-700">In inventory</span>}
      {part.state === "removed" && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">Removed earlier: ticking brings it back</span>}
      {part.state !== "in" && <span>{part.suggestion ? `Recipe: ${part.suggestion}` : "No recipe: set materials after"}</span>}
    </p>
  );
}

/** A checkbox that can also show "some ticked" (a dash), for sections and items with several parts */
function TriCheckbox({ label, checked, mixed = false, disabled = false, onChange }: { label: string; checked: boolean; mixed?: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = mixed;
  }, [mixed]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      aria-checked={mixed ? "mixed" : checked}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked || mixed)}
      className="mt-0.5 h-5 w-5 shrink-0 accent-stone-900 disabled:opacity-50"
    />
  );
}
