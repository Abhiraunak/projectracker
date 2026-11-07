"use client";

import { useRef, useState, type FormEvent } from "react";
import { FiFileText, FiImage, FiPaperclip, FiTruck, FiX } from "react-icons/fi";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { useAddDelivery, useRemoveDelivery } from "@/hooks/useMaterialPurchases";
import { describeError } from "@/lib/api";
import { amountOf, type Delivery, type Purchase } from "@/lib/inventory/purchases";
import { shortDate } from "@/lib/projects/hub";
import { mono } from "./mono";
import { money, qtyText } from "./purchaseFormat";
import { todayLocal } from "./PurchaseDialog";

/** What is left to arrive ("2,000 nos"), "All arrived" (green) or "500 extra": shared by the table and the log */
export function leftText(p: Purchase) {
  if (p.state === "extra") return { text: `${qtyText(p.extra)} extra`, cls: "text-[#111111]" };
  if (p.state === "all") return { text: "All arrived", cls: "text-[#1A6B3C]" };
  return { text: `${qtyText(p.toCome)} ${p.unit}`.trim(), cls: "text-[#111111]" };
}

/** How much of the order has arrived, as a thin bar (green once it has all come) */
export function ArrivalMeter({ p }: { p: Purchase }) {
  const pct = p.quantity > 0 ? Math.min(100, (p.arrived / p.quantity) * 100) : 0;
  return (
    <span aria-hidden className="mt-2 block h-1 overflow-hidden rounded-full bg-[#EFEFED]">
      <span className={`block h-full rounded-full ${p.state === "all" || p.state === "extra" ? "bg-[#1E7B45]" : "bg-[#111111]"}`} style={{ width: `${pct}%` }} />
    </span>
  );
}

/**
 * One material's deliveries: ordered (at the preset rate), arrived, left, the preset cost against what was actually
 * spent, and a line per delivery (date, how many, rate, amount, bill). "Log delivery" asks for the date (today), how
 * many arrived, the rate paid (the preset rate to start with) and, optionally, the bill.
 */
export function DeliveryLog({
  projectId,
  purchase: p,
  canEdit,
  startLogging = false,
  onClose,
}: {
  projectId: string;
  purchase: Purchase;
  canEdit: boolean;
  /** Open with the Log delivery form ready (the phone's Log delivery button) */
  startLogging?: boolean;
  onClose: () => void;
}) {
  const [logging, setLogging] = useState(canEdit && (startLogging || p.deliveries.length === 0));
  const over = p.spent > p.amount + 0.5;
  const left = leftText(p);
  const hasBills = p.deliveries.some((d) => d.billUrl); // the bill column shows only when there is a bill to open

  return (
    <ModalDialog open onClose={onClose} label={`Deliveries of ${p.name}`} size="lg">
      <div className="min-w-0 space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="wrap-break-word text-xl font-semibold tracking-[-0.01em] text-[#111111]">{p.name}</h2>
            <p className="mt-0.5 text-sm text-[#666666]">
              {qtyText(p.quantity)} {p.unit} ordered at {money(p.rate)}
              {p.unit && ` per ${p.unit}`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" title="Close" className={`${mono.icon} -mr-2 -mt-1 shrink-0`}>
            <FiX aria-hidden className="text-lg" />
          </button>
        </div>
        {canEdit && !logging && (
          <button type="button" onClick={() => setLogging(true)} className={`${mono.primary} w-full sm:w-auto`}>
            <FiTruck aria-hidden /> Log delivery
          </button>
        )}

        {/* the form first, so on a phone it is right under the name with the keypad open */}
        {logging && <LogForm projectId={projectId} purchase={p} onDone={() => setLogging(false)} />}

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Stat label="Ordered" value={qtyText(p.quantity)} unit={p.unit} />
          <Stat label="Arrived" value={qtyText(p.arrived)} unit={p.unit} />
          <Stat label={p.state === "extra" ? "Extra" : "Left"} value={p.state === "extra" ? qtyText(p.extra) : qtyText(p.toCome)} unit={p.unit} tone={left.cls} />
        </dl>
        <dl className="grid grid-cols-2 gap-2 sm:gap-3">
          <Stat label="Preset cost" value={money(p.amount)} note="ordered × preset rate" />
          <Stat label="Actual spend" value={money(p.spent)} note={over ? `${money(p.spent - p.amount)} over the preset` : "what the deliveries cost"} tone={over ? "text-[#B3261E]" : undefined} />
        </dl>

        {p.deliveries.length === 0 ? (
          !logging && <p className="rounded-2xl border border-dashed border-[#DADAD7] px-4 py-8 text-center text-sm text-[#666666]">Nothing has arrived yet.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#E8E8E6]">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[24%]" />
                <col />
                <col className="w-[22%]" />
                <col className="w-[28%]" />
                {hasBills && <col className="w-12" />}
              </colgroup>
              <thead>
                <tr className="border-b border-[#EFEFED] bg-[#F7F7F5]">
                  <th scope="col" className="py-2.5 pl-4 pr-2 text-left text-xs font-medium text-[#666666]">
                    Date
                  </th>
                  <th scope="col" className="px-2 py-2.5 text-right text-xs font-medium text-[#666666]">
                    Qty
                  </th>
                  <th scope="col" className="px-2 py-2.5 text-right text-xs font-medium text-[#666666]">
                    Rate
                  </th>
                  <th scope="col" className={`py-2.5 pl-2 text-right text-xs font-medium text-[#666666] ${hasBills ? "pr-2" : "pr-4"}`}>
                    Amount
                  </th>
                  {hasBills && (
                    <th scope="col" className="py-2.5 pr-2">
                      <span className="sr-only">Bill</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEFED]">
                {p.deliveries.map((d) => (
                  <DeliveryRow key={d.id} d={d} unit={p.unit} hasBills={hasBills} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModalDialog>
  );
}

function Stat({ label, value, unit, note, tone }: { label: string; value: string; unit?: string; note?: string; tone?: string }) {
  return (
    <div className={`min-w-0 ${mono.tile}`}>
      {/* the unit is said once, under the name ("5,000 nos ordered…"), so the figures stay whole on a phone */}
      <dt className={`${mono.label} truncate`} title={unit ? `${label} (${unit})` : undefined}>
        {label}
      </dt>
      <dd className={`mt-0.5 truncate text-lg font-semibold tabular-nums tracking-[-0.01em] ${tone ?? "text-[#111111]"}`}>{value}</dd>
      {note && <dd className="text-xs leading-snug text-[#666666]">{note}</dd>}
    </div>
  );
}

/**
 * Log one delivery: how many arrived and the rate paid (side by side, number keypad), the date (today unless
 * changed), the bill (optional). On a phone the Save button stays at the bottom of the screen.
 */
export function LogForm({ projectId, purchase: p, onDone, cancelLabel = "Cancel" }: { projectId: string; purchase: Purchase; onDone: () => void; cancelLabel?: string }) {
  const [date, setDate] = useState(todayLocal());
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState(String(p.rate)); // the preset rate to start with; change it to what was paid
  const [bill, setBill] = useState<File | null>(null);
  const [tried, setTried] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const add = useAddDelivery(projectId);
  const q = qty.trim() === "" ? NaN : Number(qty);
  const r = rate.trim() === "" ? NaN : Number(rate);
  const qtyOk = Number.isFinite(q) && q > 0;
  const rateOk = Number.isFinite(r) && r >= 0;
  const unit = p.unit || "units";
  const isToday = date === todayLocal();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!qtyOk || !rateOk || add.isPending) return;
    add.mutate({ purchaseId: p.id, date, quantity: q, rate: r, bill }, { onSuccess: onDone });
  };

  return (
    <form onSubmit={submit} noValidate className="min-w-0 space-y-4 rounded-2xl border border-[#E8E8E6] p-4 sm:p-5">
      <p className="text-[15px] font-semibold text-[#111111]">
        Log delivery
        {p.toCome > 0 && (
          <span className="font-normal text-[#666666]">
            {" "}
            · {qtyText(p.toCome)} {p.unit} left
          </span>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className={mono.fieldLabel}>
          How many arrived
          <input
            value={qty}
            onChange={(e) => {
              setQty(e.target.value);
              setTried(false);
            }}
            type="number"
            inputMode="decimal"
            enterKeyHint="next"
            min={0}
            step="any"
            autoFocus
            placeholder={p.toCome > 0 ? String(p.toCome) : "0"}
            aria-invalid={tried && !qtyOk}
            className={`${mono.field} h-12 text-lg tabular-nums sm:h-11 sm:text-[15px]`}
          />
          <span className="mt-1 block text-xs font-normal text-[#666666]">{unit}</span>
        </label>
        <label className={mono.fieldLabel}>
          Rate paid
          <span className="relative block">
            <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 mt-0.75 -translate-y-1/2 text-[15px] text-[#666666]">
              ₹
            </span>
            <input
              value={rate}
              onChange={(e) => {
                setRate(e.target.value);
                setTried(false);
              }}
              onFocus={(e) => e.target.select()}
              type="number"
              inputMode="decimal"
              enterKeyHint="done"
              min={0}
              step="any"
              aria-invalid={tried && !rateOk}
              className={`${mono.field} h-12 pl-7 text-lg tabular-nums sm:h-11 sm:text-[15px]`}
            />
          </span>
          <span className="mt-1 block truncate text-xs font-normal text-[#666666]">
            per {p.unit || "unit"} · preset {money(p.rate)}
          </span>
        </label>
      </div>

      {/* one tap for the usual cases */}
      {(p.toCome > 0 || Math.abs(r - p.rate) > 0.004) && (
        <div className="-mt-1 flex flex-wrap gap-2">
          {p.toCome > 0 && (
            <button type="button" onClick={() => setQty(String(p.toCome))} className={`min-h-10 rounded-full border border-[#DADAD7] bg-white px-3.5 text-sm font-medium text-[#111111] hover:bg-[#F7F7F5] ${mono.motion} ${mono.ring}`}>
              All the rest · {qtyText(p.toCome)}
            </button>
          )}
          {Number.isFinite(r) && Math.abs(r - p.rate) > 0.004 && (
            <button type="button" onClick={() => setRate(String(p.rate))} className={`min-h-10 rounded-full border border-[#DADAD7] bg-white px-3.5 text-sm font-medium text-[#111111] hover:bg-[#F7F7F5] ${mono.motion} ${mono.ring}`}>
              Use preset {money(p.rate)}
            </button>
          )}
        </div>
      )}

      {tried && (!qtyOk || !rateOk) && (
        <p role="alert" className="text-xs font-medium text-[#B3261E]">
          {!qtyOk ? "Enter how many arrived." : "Enter the rate paid (0 or more)."}
        </p>
      )}

      {qtyOk && rateOk && (
        <p className="rounded-xl bg-[#F7F7F5] px-3.5 py-2.5 text-sm text-[#333333]">
          This delivery: {qtyText(q)} × {money(r)} = <b className="font-semibold tabular-nums text-[#111111]">{money(amountOf(q, r))}</b>
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={mono.fieldLabel}>
          Date {isToday && <span className="font-normal text-[#8C8C8C]">(today)</span>}
          <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value || todayLocal())} className={mono.field} />
        </label>
        <div className="min-w-0">
          <span className={mono.fieldLabel}>
            Bill <span className="font-normal text-[#8C8C8C]">(optional)</span>
          </span>
          {/* on a phone this offers the camera or the gallery, so the bill can be photographed there and then */}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" tabIndex={-1} onChange={(e) => setBill(e.target.files?.[0] ?? null)} />
          {bill ? (
            <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#DADAD7] px-3.5 text-sm">
              {bill.type === "application/pdf" ? <FiFileText aria-hidden className="shrink-0" /> : <FiImage aria-hidden className="shrink-0" />}
              <span className="min-w-0 flex-1 truncate">{bill.name}</span>
              <button
                type="button"
                aria-label="Remove the bill"
                onClick={() => {
                  setBill(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className={`rounded-lg p-1.5 text-[#666666] hover:bg-[#F1F1EF] hover:text-[#111111] ${mono.ring}`}
              >
                <FiX aria-hidden />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`mt-1.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#DADAD7] px-3 text-sm text-[#666666] hover:border-[#111111] hover:text-[#111111] ${mono.motion} ${mono.ring}`}
            >
              <FiPaperclip aria-hidden /> Photo or PDF
            </button>
          )}
        </div>
      </div>

      {add.isError && (
        <p role="alert" className="text-sm text-[#B3261E]">
          {describeError(add.error)}
        </p>
      )}
      {/* On a phone: stuck to the bottom of the screen, Save full width, so it is always one thumb away */}
      <div className="sticky bottom-0 z-1 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-2xl border-t border-[#EFEFED] bg-white px-4 py-3 sm:static sm:mx-0 sm:mb-0 sm:flex-row sm:justify-end sm:rounded-none sm:border-0 sm:p-0">
        <button type="button" onClick={onDone} disabled={add.isPending} className={`${mono.quiet} w-full sm:w-auto`}>
          {cancelLabel}
        </button>
        <button type="submit" disabled={add.isPending} className={`${mono.primary} h-12 w-full sm:h-auto sm:w-auto`}>
          {add.isPending ? "Saving…" : "Save delivery"}
        </button>
      </div>
    </form>
  );
}

function DeliveryRow({ d, unit, hasBills }: { d: Delivery; unit: string; hasBills: boolean }) {
  return (
    <tr>
      <td className="whitespace-nowrap py-3 pl-4 pr-2 text-[#111111]">{shortDate(d.date)}</td>
      <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums text-[#111111]" title={`${qtyText(d.quantity)} ${unit}`.trim()}>
        {qtyText(d.quantity)}
      </td>
      <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums text-[#333333]">{money(d.rate)}</td>
      <td className={`whitespace-nowrap py-3 pl-2 text-right font-semibold tabular-nums text-[#111111] ${hasBills ? "pr-2" : "pr-4"}`}>{money(d.amount)}</td>
      {hasBills && (
        <td className="py-1 pr-2 text-right">
          {d.billUrl && (
            <a href={d.billUrl} target="_blank" rel="noreferrer" className={mono.icon} aria-label={`Open the bill of ${shortDate(d.date)}`} title="Open the bill">
              {d.billKind === "pdf" ? <FiFileText aria-hidden /> : <FiImage aria-hidden />}
            </a>
          )}
        </td>
      )}
    </tr>
  );
}

/** The bill link and one-step delete of a delivery: used here and in the Delivery log tab */
export function DeliveryActions({
  purchaseId,
  d,
  remove,
  confirming,
  setConfirming,
}: {
  projectId: string;
  purchaseId: string;
  d: Delivery;
  canEdit: boolean;
  remove: ReturnType<typeof useRemoveDelivery>;
  confirming: boolean;
  setConfirming: (v: boolean) => void;
}) {
  if (confirming)
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          disabled={remove.isPending}
          onClick={() => remove.mutate({ purchaseId, deliveryId: d.id }, { onSettled: () => setConfirming(false) })}
          className={`min-h-10 rounded-xl px-2.5 text-sm font-medium text-[#B3261E] hover:bg-[#FCEDEC] disabled:opacity-50 ${mono.ring}`}
        >
          {remove.isPending ? "…" : "Delete"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className={`min-h-10 rounded-xl px-2.5 text-sm font-medium text-[#333333] hover:bg-[#F1F1EF] ${mono.ring}`}>
          No
        </button>
      </span>
    );
  return (
    <span className="inline-flex items-center">
      {d.billUrl ? (
        <a href={d.billUrl} target="_blank" rel="noreferrer" className={mono.icon} aria-label={`Open the bill of ${shortDate(d.date)}`} title="Open the bill">
          {d.billKind === "pdf" ? <FiFileText aria-hidden /> : <FiImage aria-hidden />}
        </a>
      ) : (
        <span aria-hidden className="inline-block h-10 w-10" />
      )}

    </span>
  );
}