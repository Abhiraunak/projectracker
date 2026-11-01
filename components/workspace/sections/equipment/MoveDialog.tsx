"use client";

import { useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { describeError } from "@/lib/api";
import { qty, type Condition, type MoveKind, type Register, type SitePlace } from "@/lib/equipment/api";
import { useMoveEquipment } from "@/hooks/useEquipment";
import { CONDITIONS, Choice, field, Label, primaryBtn, quietBtn, todayLocal } from "./shared";

/** What a move needs to know about the item: its name and where it is now */
export interface Movable {
  id: string;
  name: string;
  unit: string;
  yard: number;
  sites: SitePlace[];
}

const TITLE: Record<MoveKind, string> = { move: "Move", add: "Add more", write_off: "Write off" };

/**
 * One form for every change of quantity: move between the yard and sites, add more (bought or hired in), or write
 * some off (lost, scrapped, handed back to the hirer). The server checks again that the numbers can't go below zero,
 * even for a back-dated move.
 */
export function MoveDialog({
  item,
  kind,
  projects,
  from: presetFrom,
  to: presetTo,
  onClose,
}: {
  item: Movable;
  kind: MoveKind;
  projects: { id: string; title: string }[];
  /** "" = the yard */
  from?: string;
  to?: string;
  onClose: () => void;
}) {
  const move = useMoveEquipment();
  const sources = useMemo(() => [...(item.yard > 0 ? [{ value: "", label: "Yard", qty: item.yard }] : []), ...item.sites.map((s) => ({ value: s.projectId, label: s.title, qty: s.qty }))], [item]);

  const [from, setFrom] = useState(presetFrom ?? sources[0]?.value ?? "");
  const [to, setTo] = useState(presetTo ?? (from === "" ? (projects[0]?.id ?? "") : ""));
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [condition, setCondition] = useState<Condition>("good");
  const [note, setNote] = useState("");

  const available = sources.find((s) => s.value === from)?.qty ?? 0;
  const n = Number(amount);
  const needsFrom = kind !== "add";
  const needsTo = kind !== "write_off";
  const destinations = [{ id: "", title: "Yard (our store)" }, ...projects].filter((p) => !(kind === "move" && p.id === from));
  const tooMany = needsFrom && n > available;
  const valid = n > 0 && !tooMany && (kind !== "move" || from !== to) && (!needsFrom || sources.some((s) => s.value === from));
  const placeName = (id: string) => (id === "" ? "the yard" : (projects.find((p) => p.id === id)?.title ?? item.sites.find((s) => s.projectId === id)?.title ?? "that site"));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || move.isPending) return;
    try {
      await move.mutateAsync({
        id: item.id,
        body: { kind, from: needsFrom ? from || null : null, to: needsTo ? to || null : null, quantity: n, date, condition, note: note.trim() },
      });
      onClose();
    } catch {
      /* shown below */
    }
  };

  return (
    <ModalDialog open onClose={onClose} label={`${TITLE[kind]}: ${item.name}`} locked={move.isPending}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">{TITLE[kind]}</h2>
          <p className="text-sm text-stone-500">{item.name}</p>
        </div>

        {needsFrom &&
          (sources.length === 0 ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">There are none of these anywhere now. Use Add more first.</p>
          ) : (
            <Label text={kind === "write_off" ? "From where" : "From"}>
              <select
                value={from}
                onChange={(e) => {
                  const v = e.target.value;
                  setFrom(v);
                  if (kind === "move" && v === to) setTo(v === "" ? (projects[0]?.id ?? "") : ""); // can't move to where it already is
                }}
                className={field}
              >
                {sources.map((s) => (
                  <option key={s.value || "yard"} value={s.value}>
                    {s.label} · {qty(s.qty)} {item.unit}
                  </option>
                ))}
              </select>
            </Label>
          ))}

        {needsTo && (
          <Label text={kind === "add" ? "Where they arrive" : "To"}>
            <select value={to} onChange={(e) => setTo(e.target.value)} className={field}>
              {destinations.map((p) => (
                <option key={p.id || "yard"} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </Label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Label text={`How many (${item.unit})`}>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              required
              autoFocus
              aria-invalid={tooMany}
              className={`${field} tabular-nums ${tooMany ? "border-red-400" : ""}`}
            />
          </Label>
          <Label text="Date">
            <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} required className={field} />
          </Label>
        </div>
        {needsFrom && available > 0 && (
          <p className={`-mt-2 text-xs ${tooMany ? "text-red-700" : "text-stone-500"}`}>
            {tooMany ? `Only ${qty(available)} at ${placeName(from)}. ` : `${qty(available)} at ${placeName(from)}. `}
            <button type="button" onClick={() => setAmount(String(available))} className="font-medium text-stone-900 underline">
              All {qty(available)}
            </button>
          </p>
        )}

        {kind === "move" && <Choice label="Condition on arrival" value={condition} options={CONDITIONS} onChange={setCondition} />}

        <Label text={kind === "write_off" ? "Why" : "Note"} optional={kind !== "write_off"}>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            required={kind === "write_off"}
            placeholder={kind === "write_off" ? "Lost, scrapped, returned to the hirer…" : kind === "add" ? "Bill no., supplier…" : "Vehicle, challan no.…"}
            className={field}
          />
        </Label>

        {move.isError && (
          <p role="alert" className="text-sm text-red-700">
            {describeError(move.error)}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={move.isPending} className={quietBtn}>
            Cancel
          </button>
          <button type="submit" disabled={!valid || move.isPending} className={primaryBtn}>
            {move.isPending ? "Saving…" : kind === "write_off" ? "Write off" : kind === "add" ? "Add" : "Move"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

/** "Bring equipment here": pick an item that is in the yard or at another site, then say how many */
export function BringDialog({ projectId, register, onClose }: { projectId: string; register: Register; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Movable | null>(null);
  const elsewhere = (i: Register["items"][number]) => i.yard + i.sites.filter((s) => s.projectId !== projectId).reduce((t, s) => t + s.qty, 0);
  const list = useMemo(() => {
    const words = q.trim().toLowerCase();
    return register.items.filter((i) => !i.retired && elsewhere(i) > 0 && (!words || `${i.name} ${i.code ?? ""}`.toLowerCase().includes(words)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register, q, projectId]);

  if (picked) {
    const sources: Movable = { ...picked, sites: picked.sites.filter((s) => s.projectId !== projectId) };
    return <MoveDialog item={sources} kind="move" projects={register.projects} from={sources.yard > 0 ? "" : sources.sites[0]?.projectId} to={projectId} onClose={onClose} />;
  }

  return (
    <ModalDialog open onClose={onClose} label="Bring equipment here">
      <div className="space-y-3 p-5">
        <h2 className="text-lg font-semibold">Bring equipment here</h2>
        <div className="relative">
          <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" autoFocus aria-label="Find equipment" placeholder="Find equipment" className={`${field} mt-0 pl-9`} />
        </div>
        {list.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">{register.items.length ? "Nothing free in the yard or at other sites matches." : "The register is empty. Add equipment first."}</p>
        ) : (
          <ul className="max-h-[50vh] divide-y divide-stone-100 overflow-y-auto rounded-lg border border-stone-200">
            {list.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => setPicked(i)} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left hover:bg-stone-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-stone-900">{i.name}</span>
                    <span className="block truncate text-xs text-stone-500">
                      {[i.yard > 0 && `Yard ${qty(i.yard)}`, ...i.sites.filter((s) => s.projectId !== projectId).map((s) => `${s.title} ${qty(s.qty)}`)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-stone-600">
                    {qty(elsewhere(i))} {i.unit}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={quietBtn}>
            Cancel
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
