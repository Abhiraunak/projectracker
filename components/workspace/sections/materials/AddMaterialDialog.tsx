"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { FiCheck, FiPlus, FiTrash2 } from "react-icons/fi";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { useMaterialCatalog } from "@/hooks/useMaterialCatalog";
import { useSaveEstimate } from "@/hooks/useMaterialEstimates";
import { describeError } from "@/lib/api";
import { barsFor, estimate, kgPerMetre, STEEL_DIAS, steelLine, unitFactor, volumeLine, type EstimateMethod, type SteelRow, type VolumeRow } from "@/lib/inventory/estimateCalc";
import type { MaterialEstimate } from "@/lib/inventory/estimates";

const field = "mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:outline-none";
const cellBase = "h-9 w-full min-w-0 rounded-md border border-stone-300 bg-white px-2 text-sm focus:border-stone-900 focus:outline-none";
const cellBox = `${cellBase} text-right tabular-nums`; // numbers
const nameBox = cellBase; // the row's name, left-aligned

const fmt = (n: number, places = 2) => n.toLocaleString("en-IN", { maximumFractionDigits: places });
const toNum = (s: string) => (s.trim() === "" ? null : Number(s));
const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

type SteelForm = { key: string; name: string; nos: string; dia: string; bars: string; span: string; spacing: string; cutLength: string };
type VolumeForm = { key: string; name: string; nos: string; l: string; b: string; d: string };
let seq = 0;
const key = () => `r${++seq}`;
const blankSteel = (dia = "10"): SteelForm => ({ key: key(), name: "", nos: "", dia, bars: "", span: "", spacing: "", cutLength: "" });
const blankVolume = (): VolumeForm => ({ key: key(), name: "", nos: "", l: "", b: "", d: "" });

const steelFrom = (r: SteelForm): SteelRow => ({
  name: r.name.trim(),
  nos: toNum(r.nos),
  dia: Number(r.dia) || 0,
  bars: toNum(r.bars),
  span: toNum(r.span),
  spacing: toNum(r.spacing),
  cutLength: Number(r.cutLength) || 0,
});
const volumeFrom = (r: VolumeForm): VolumeRow => ({ name: r.name.trim(), nos: toNum(r.nos), l: Number(r.l) || 0, b: Number(r.b) || 0, d: Number(r.d) || 0 });
const steelBlank = (r: SteelForm) => !r.name.trim() && !r.nos && !r.bars && !r.span && !r.spacing && !r.cutLength;
const volumeBlank = (r: VolumeForm) => !r.name.trim() && !r.nos && !r.l && !r.b && !r.d;

const METHODS: { key: EstimateMethod; label: string; hint: string }[] = [
  { key: "quantity", label: "Quantity", hint: "Bricks, sand, cement…" },
  { key: "steel", label: "Steel bars", hint: "Nos × bars × length" },
  { key: "volume", label: "Concrete", hint: "Nos × L × B × D" },
];

/**
 * Add a material the project needs, like starting a project: only the material and how much are needed. For bricks
 * or sand that's just the quantity. For steel or concrete the quantity can be worked out from rows like an estimate
 * sheet (F1…F10, C1…C9), with wastage on top. What it's for and notes are optional.
 * The total shown is worked out the same way the server saves it.
 */
export function AddMaterialDialog({ projectId, editing, onClose }: { projectId: string; editing?: MaterialEstimate | null; onClose: () => void }) {
  const catalog = useMaterialCatalog();
  const save = useSaveEstimate(projectId);
  // React Compiler memoizes these automatically, so no manual useMemo is needed.
  const materials = catalog.data?.materials ?? [];

  const [materialId, setMaterialId] = useState(editing?.material.id ?? "");
  const [query, setQuery] = useState(editing?.material.name ?? "");
  const [newUnit, setNewUnit] = useState("");
  const [method, setMethod] = useState<EstimateMethod>(editing?.method ?? "quantity");
  const [qty, setQty] = useState(editing && editing.method === "quantity" ? str(editing.quantity / (1 + editing.wastagePercent / 100)) : "");
  const [steel, setSteel] = useState<SteelForm[]>(() =>
    editing?.steel.length
      ? editing.steel.map((r) => ({ key: key(), name: r.name ?? "", nos: str(r.nos), dia: String(r.dia), bars: str(r.bars), span: str(r.span), spacing: str(r.spacing), cutLength: str(r.cutLength) }))
      : [blankSteel()]
  );
  const [volume, setVolume] = useState<VolumeForm[]>(() =>
    editing?.volume.length ? editing.volume.map((r) => ({ key: key(), name: r.name ?? "", nos: str(r.nos), l: str(r.l), b: str(r.b), d: str(r.d) })) : [blankVolume()]
  );
  const [wastage, setWastage] = useState(editing && editing.wastagePercent ? String(editing.wastagePercent) : "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [problem, setProblem] = useState<string | null>(null);

  const picked = materials.find((m) => m.id === materialId);
  const typed = query.trim();
  const exact = materials.find((m) => m.name.toLowerCase() === typed.toLowerCase());
  const isNew = !picked && typed.length > 0 && !exact;
  const unit = picked?.unit ?? (exact ? exact.unit : newUnit.trim());

  const q = typed.toLowerCase();
  const matches = (q
    ? materials.filter((m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
    : materials
  ).slice(0, 10);

  const input = {
    method,
    quantity: toNum(qty),
    steel: steel.filter((r) => !steelBlank(r)).map(steelFrom),
    volume: volume.filter((r) => !volumeBlank(r)).map(volumeFrom),
    wastagePercent: toNum(wastage) ?? 0,
  };
  const result = unit ? estimate(input, unit) : null;
  const unitFits = !unit || unitFactor(method, unit) !== null;

  const choose = (id: string, name: string) => {
    setMaterialId(id);
    setQuery(name);
    const m = materials.find((x) => x.id === id);
    // A material counted in kg or tonnes is usually steel; in m³ or cft, concrete. Only a suggestion, and only when nothing is typed yet.
    if (m && !editing && !qty && steel.every(steelBlank) && volume.every(volumeBlank)) {
      if (unitFactor("steel", m.unit) !== null && /steel|tmt|bar|rod/i.test(m.name)) setMethod("steel");
      else if (unitFactor("volume", m.unit) !== null && /rmc|concrete|pcc|rcc|cc\b/i.test(m.name)) setMethod("volume");
      else setMethod("quantity");
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setProblem(null);
    if (!picked && !exact && !typed) return setProblem("Choose a material, or type the name of a new one.");
    if (isNew && !newUnit.trim()) {
      setProblem(`Enter the unit ${typed} is counted in (kg, bag, nos, cft, cum…).`);
      document.getElementById("am-unit")?.focus();
      return;
    }
    if (!result || !result.ok) return setProblem(result && !result.ok ? result.message : "Enter how much is needed.");
    try {
      await save.mutateAsync({
        id: editing?.id,
        input: {
          ...(picked || exact ? { materialId: (picked ?? exact)!.id } : { newMaterial: { name: typed, unit: newUnit.trim() } }),
          title: title.trim(),
          method,
          quantity: method === "quantity" ? input.quantity : null,
          steel: method === "steel" ? input.steel : undefined,
          volume: method === "volume" ? input.volume : undefined,
          wastagePercent: input.wastagePercent,
          notes: notes.trim(),
        },
      });
      onClose();
    } catch {
      /* shown below */
    }
  };

  return (
    <ModalDialog open onClose={onClose} label={editing ? `Edit ${editing.material.name}` : "Add material"} size="xl" locked={save.isPending}>
      <form onSubmit={submit} className="space-y-5 p-5">
        <h2 className="text-lg font-semibold">{editing ? `Edit ${editing.material.name}` : "Add material"}</h2>

        {/* Material: pick one, or name a new one; what it is for */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
          <div className="min-w-0">
            <Field label="Material">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setMaterialId("");
                }}
                autoFocus={!editing}
                maxLength={80}
                placeholder="e.g. Bricks, Sand, TMT steel"
                className={field}
              />
            </Field>
            {!picked && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Materials on the list">
                {matches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => choose(m.id, m.name)}
                    className="min-h-8 rounded-full border border-stone-300 bg-white px-3 text-xs font-medium text-stone-700 hover:border-stone-500"
                  >
                    {m.name} <span className="text-stone-400">· {m.unit}</span>
                  </button>
                ))}
                {catalog.isPending && <span className="text-xs text-stone-400">Loading the material list…</span>}
              </div>
            )}
            {picked && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-600">
                <FiCheck aria-hidden className="text-green-700" /> {picked.name} · counted in <b className="font-semibold">{picked.unit}</b>
                {picked.category ? ` · ${picked.category}` : ""}
                <button type="button" onClick={() => { setMaterialId(""); setQuery(""); }} className="font-medium text-stone-700 underline underline-offset-2">
                  Change
                </button>
              </p>
            )}
            {isNew && (
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_8rem] items-end gap-3 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3">
                <p className="text-sm text-stone-700">
                  <b className="font-semibold">{typed}</b> isn&apos;t on the material list. It will be added with this unit.
                </p>
                <label className="text-sm">
                  <span className="font-medium text-stone-700">Unit</span>
                  <input id="am-unit" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} maxLength={20} placeholder="kg, nos, cft…" className={field} />
                </label>
              </div>
            )}
          </div>
          <Field label="What it's for" optional>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Footing reinforcement, Ground floor walls" className={field} />
          </Field>
        </div>

        {/* How much: a quantity, or rows to work it out from */}
        <fieldset className="min-w-0 rounded-lg border border-stone-200 p-3 sm:p-4">
          <legend className="px-1 text-sm font-medium text-stone-700">How much is needed</legend>
          <div role="group" aria-label="How to enter it" className="grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1">
            {METHODS.map((m) => {
              const on = method === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setMethod(m.key)}
                  className={`rounded-md px-2 py-1.5 text-left transition-colors ${on ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
                >
                  <span className="block text-sm font-semibold">{m.label}</span>
                  <span className="hidden text-xs text-stone-500 sm:block">{m.hint}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            {method === "quantity" && (
              <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                <Field label={`Quantity${unit ? ` (${unit})` : ""}`}>
                  <input type="number" inputMode="decimal" min={0} step="any" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" className={`${field} tabular-nums`} />
                </Field>
                <Field label="Wastage %" optional>
                  <input type="number" inputMode="decimal" min={0} max={100} step="any" value={wastage} onChange={(e) => setWastage(e.target.value)} placeholder="0" className={`${field} tabular-nums`} />
                </Field>
              </div>
            )}
            {method === "steel" && <SteelRows rows={steel} setRows={setSteel} />}
            {method === "volume" && <VolumeRows rows={volume} setRows={setVolume} />}
            {method !== "quantity" && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md">
                <Field label="Wastage %" optional>
                  <input type="number" inputMode="decimal" min={0} max={100} step="any" value={wastage} onChange={(e) => setWastage(e.target.value)} placeholder="e.g. 5" className={`${field} tabular-nums`} />
                </Field>
              </div>
            )}
          </div>

          {!unitFits && (
            <p className="mt-3 text-sm text-amber-800">
              {picked?.name ?? typed} is counted in {unit}. {method === "steel" ? "Steel rows work out kg" : "Concrete rows work out m³"}, so use Quantity, or pick a material counted in{" "}
              {method === "steel" ? "kg or tonnes" : "m³ or cft"}.
            </p>
          )}
          {result?.ok && (
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2.5 text-sm">
              <span className="text-stone-600">
                {method !== "quantity" && <>{fmt(result.base)} {result.baseUnit}</>}
                {input.wastagePercent > 0 && (
                  <>
                    {method === "quantity" ? `${fmt(result.base)} ${unit}` : ""} + {fmt(input.wastagePercent)}% wastage
                  </>
                )}
              </span>
              <span className="text-base font-semibold tabular-nums text-stone-900">
                Needed: {fmt(result.quantity, 3)} {unit}
              </span>
            </div>
          )}
        </fieldset>

        <Field label="Notes" optional>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="e.g. As per structural drawing S-02" className={field} />
        </Field>

        {(problem || save.isError) && (
          <p role="alert" className="text-sm text-red-700">
            {problem ?? describeError(save.error)}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={save.isPending} className="min-h-11 rounded-lg px-4 text-sm font-medium text-stone-600 hover:bg-stone-100">
            Cancel
          </button>
          <button type="submit" disabled={save.isPending} className="min-h-11 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
            {save.isPending ? "Saving…" : editing ? "Save changes" : "Add material"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-stone-700">
        {label} {optional && <span className="font-normal text-stone-400">(optional)</span>}
      </span>
      {children}
    </label>
  );
}

/* ----------------------------------- steel ----------------------------------- */

/**
 * One row per set of bars: F1 along L, F1 along B, C1 main bars, C1 stirrups… Bars can be typed, or worked out from
 * the span and spacing (span ÷ spacing, rounded up). Weight is dia² ÷ 162 kg a metre.
 */
function SteelRows({ rows, setRows }: { rows: SteelForm[]; setRows: (f: (r: SteelForm[]) => SteelForm[]) => void }) {
  const change = (k: string, patch: Partial<SteelForm>) => setRows((rs) => rs.map((r) => (r.key === k ? { ...r, ...patch } : r)));
  const add = () => setRows((rs) => [...rs, blankSteel(rs[rs.length - 1]?.dia ?? "10")]);
  const total = rows.reduce((s, r) => (steelBlank(r) ? s : s + steelLine(steelFrom(r)).weight), 0);
  const head = "px-1 pb-1 text-right text-xs font-medium text-stone-500";
  return (
    <div className="min-w-0">
      <div className="relative overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-184 border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr>
              <th scope="col" className={`${head} text-left`}>Name <span className="font-normal text-stone-400">(optional)</span></th>
              <th scope="col" className={`${head} w-16`}>Nos</th>
              <th scope="col" className={`${head} w-20`}>Dia mm</th>
              <th scope="col" className={`${head} w-20`}>Bars</th>
              <th scope="col" className={`${head} w-20`}>or span m</th>
              <th scope="col" className={`${head} w-20`}>spacing m</th>
              <th scope="col" className={`${head} w-24`}>Cut length m</th>
              <th scope="col" className={`${head} w-24`}>Weight kg</th>
              <th scope="col"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const row = steelFrom(r);
              const line = steelBlank(r) ? null : steelLine(row);
              const autoBars = r.bars === "" && r.span && r.spacing ? barsFor(row) : null;
              return (
                <tr key={r.key}>
                  <td className="pr-1">
                    <input aria-label={`Row ${i + 1} name`} value={r.name} onChange={(e) => change(r.key, { name: e.target.value })} maxLength={60} placeholder={`e.g. F${i + 1} along L`} className={nameBox} />
                  </td>
                  <td className="px-0.5">
                    <input aria-label={`Row ${i + 1} nos`} type="number" inputMode="decimal" min={0} step="any" value={r.nos} onChange={(e) => change(r.key, { nos: e.target.value })} placeholder="1" className={cellBox} />
                  </td>
                  <td className="px-0.5">
                    <select aria-label={`Row ${i + 1} dia`} value={r.dia} onChange={(e) => change(r.key, { dia: e.target.value })} className={cellBox}>
                      {STEEL_DIAS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-0.5">
                    <input aria-label={`Row ${i + 1} bars`} type="number" inputMode="numeric" min={0} step="1" value={r.bars} onChange={(e) => change(r.key, { bars: e.target.value })} placeholder={autoBars !== null ? String(autoBars) : "0"} className={`${cellBox} ${autoBars !== null ? "placeholder:text-stone-900" : ""}`} />
                  </td>
                  <td className="px-0.5">
                    <input aria-label={`Row ${i + 1} span in metres`} type="number" inputMode="decimal" min={0} step="any" value={r.span} onChange={(e) => change(r.key, { span: e.target.value })} disabled={r.bars !== ""} placeholder="–" className={`${cellBox} disabled:bg-stone-50`} />
                  </td>
                  <td className="px-0.5">
                    <input aria-label={`Row ${i + 1} spacing in metres`} type="number" inputMode="decimal" min={0} step="any" value={r.spacing} onChange={(e) => change(r.key, { spacing: e.target.value })} disabled={r.bars !== ""} placeholder="0.125" className={`${cellBox} disabled:bg-stone-50`} />
                  </td>
                  <td className="px-0.5">
                    <input aria-label={`Row ${i + 1} cut length in metres`} type="number" inputMode="decimal" min={0} step="any" value={r.cutLength} onChange={(e) => change(r.key, { cutLength: e.target.value })} placeholder="0" className={cellBox} />
                  </td>
                  <td className="px-1 text-right tabular-nums">
                    {line && line.weight > 0 ? (
                      <>
                        <span className="font-medium">{fmt(line.weight)}</span>
                        <span className="block text-xs text-stone-400">{fmt(line.length)} m</span>
                      </>
                    ) : (
                      <span className="text-stone-300">–</span>
                    )}
                  </td>
                  <td className="pl-1 text-right">
                    <button type="button" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [blankSteel(r.dia)]))} aria-label={`Remove row ${i + 1}`} className="rounded p-2 text-stone-400 hover:bg-red-50 hover:text-red-600">
                      <FiTrash2 aria-hidden />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
        <button type="button" onClick={add} className="flex min-h-9 items-center gap-1 text-sm font-medium text-stone-700 hover:text-stone-900">
          <FiPlus aria-hidden /> Add row
        </button>
        <span>
          Weight = nos × bars × cut length × dia²/162 (10 mm is {fmt(kgPerMetre(10), 3)} kg/m) · <b className="font-semibold text-stone-900">{fmt(total)} kg</b>
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------- concrete ---------------------------------- */

/** One row per member type: F1…F10, pedestals, beams… volume = nos × L × B × D, in m³ */
function VolumeRows({ rows, setRows }: { rows: VolumeForm[]; setRows: (f: (r: VolumeForm[]) => VolumeForm[]) => void }) {
  const change = (k: string, patch: Partial<VolumeForm>) => setRows((rs) => rs.map((r) => (r.key === k ? { ...r, ...patch } : r)));
  const total = rows.reduce((s, r) => (volumeBlank(r) ? s : s + volumeLine(volumeFrom(r)).volume), 0);
  const head = "px-1 pb-1 text-right text-xs font-medium text-stone-500";
  return (
    <div className="min-w-0">
      <div className="relative overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-lg border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr>
              <th scope="col" className={`${head} text-left`}>Name <span className="font-normal text-stone-400">(optional)</span></th>
              <th scope="col" className={`${head} w-16`}>Nos</th>
              <th scope="col" className={`${head} w-20`}>L m</th>
              <th scope="col" className={`${head} w-20`}>B m</th>
              <th scope="col" className={`${head} w-20`}>D m</th>
              <th scope="col" className={`${head} w-24`}>Volume m³</th>
              <th scope="col"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const v = volumeBlank(r) ? null : volumeLine(volumeFrom(r)).volume;
              const num = (f: "nos" | "l" | "b" | "d", label: string, placeholder: string) => (
                <td className="px-0.5">
                  <input aria-label={`Row ${i + 1} ${label}`} type="number" inputMode="decimal" min={0} step="any" value={r[f]} onChange={(e) => change(r.key, { [f]: e.target.value })} placeholder={placeholder} className={cellBox} />
                </td>
              );
              return (
                <tr key={r.key}>
                  <td className="pr-1">
                    <input aria-label={`Row ${i + 1} name`} value={r.name} onChange={(e) => change(r.key, { name: e.target.value })} maxLength={60} placeholder={`e.g. F${i + 1}`} className={nameBox} />
                  </td>
                  {num("nos", "nos", "1")}
                  {num("l", "length in metres", "0")}
                  {num("b", "breadth in metres", "0")}
                  {num("d", "depth in metres", "0")}
                  <td className="px-1 text-right font-medium tabular-nums">{v ? fmt(v, 3) : <span className="text-stone-300">–</span>}</td>
                  <td className="pl-1 text-right">
                    <button type="button" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [blankVolume()]))} aria-label={`Remove row ${i + 1}`} className="rounded p-2 text-stone-400 hover:bg-red-50 hover:text-red-600">
                      <FiTrash2 aria-hidden />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
        <button type="button" onClick={() => setRows((rs) => [...rs, blankVolume()])} className="flex min-h-9 items-center gap-1 text-sm font-medium text-stone-700 hover:text-stone-900">
          <FiPlus aria-hidden /> Add row
        </button>
        <span>
          Volume = nos × L × B × D · <b className="font-semibold text-stone-900">{fmt(total, 3)} m³</b>
        </span>
      </div>
    </div>
  );
}