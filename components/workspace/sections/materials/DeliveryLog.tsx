"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { FiArchive, FiChevronDown, FiPlus, FiCornerUpLeft, FiEdit2, FiFileText, FiImage, FiPaperclip, FiTrash2, FiX } from "react-icons/fi";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { ConfirmDeleteDialog } from "@/components/utilites/Confirmdeletedialog";
import { useAddDelivery, useArchiveDelivery, useRemoveDeliveries, useRemoveDelivery, useUpdateDelivery } from "@/hooks/useMaterialPurchases";
import { describeError } from "@/lib/api";
import { amountOf, type Delivery, type Purchase } from "@/lib/inventory/purchases";
import { shortDate } from "@/lib/projects/hub";
import { mono } from "./mono";
import { money, qtyText } from "./purchaseFormat";
import { todayLocal } from "./PurchaseDialog";

/** What is left to arrive ("2,000 nos"), "All arrived" (green) or "500 extra": shared by the table and the log */
export function leftText(p: Purchase) {
  if (p.state === "extra") return { text: `${qtyText(p.extra)} extra`, cls: "text-[#111111]" };
  if (p.state === "all") return { text: "All here", cls: "text-[#1A6B3C]" };
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
 * One material's deliveries in a dialog: how many are needed, how many came and are still to come, the planned cost
 * against what was spent, then the deliveries themselves (DeliveriesPanel).
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
  /** Open with the Add delivery form ready */
  startLogging?: boolean;
  onClose: () => void;
}) {
  const over = p.spent > p.amount + 0.5;
  const left = leftText(p);
  return (
    <ModalDialog open onClose={onClose} label={`Deliveries of ${p.name}`} size="lg">
      <div className="min-w-0 space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="wrap-break-word text-xl font-semibold tracking-[-0.01em] text-[#111111]">{p.name}</h2>
            <p className="mt-0.5 text-sm text-[#666666]">
              {qtyText(p.quantity)} {p.unit} at {money(p.rate)}
              {p.unit && ` per ${p.unit}`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" title="Close" className={`${mono.icon} -mr-2 -mt-1 shrink-0`}>
            <FiX aria-hidden className="text-lg" />
          </button>
        </div>
        <DeliveriesPanel projectId={projectId} purchase={p} canEdit={canEdit} startLogging={startLogging}>
          <dl className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="Quantity" value={qtyText(p.quantity)} unit={p.unit} />
            <Stat label="Ordered" value={qtyText(p.arrived)} unit={p.unit} />
            <Stat label={p.state === "extra" ? "Extra" : "Still to come"} value={p.state === "extra" ? qtyText(p.extra) : qtyText(p.toCome)} unit={p.unit} tone={left.cls} />
          </dl>
          <dl className="grid grid-cols-2 gap-2 sm:gap-3">
            <Stat label="Planned cost" value={money(p.amount)} note="quantity × rate" />
            <Stat label="Spent so far" value={money(p.spent)} note={over ? `${money(p.spent - p.amount)} over the plan` : "what the deliveries cost"} tone={over ? "text-[#B3261E]" : undefined} />
          </dl>
        </DeliveriesPanel>
      </div>
    </ModalDialog>
  );
}

/**
 * The deliveries of one material, on their own: Add delivery (a small form right here), a line per delivery (date,
 * how many, rate, amount, bill) with Edit and Archive, and "Archived" at the bottom (not counted), where deliveries
 * can be restored or deleted for good, one or several at once. Used inside a material's row and in the dialog.
 */
export function DeliveriesPanel({
  projectId,
  purchase: p,
  canEdit,
  startLogging = false,
  children,
}: {
  projectId: string;
  purchase: Purchase;
  canEdit: boolean;
  /** Open with the Add delivery form ready */
  startLogging?: boolean;
  /** Shown between the form and the list (the dialog's figures) */
  children?: ReactNode;
}) {
  const [logging, setLogging] = useState(canEdit && (startLogging || p.deliveries.length === 0));
  const [editing, setEditing] = useState<Delivery | null>(null);
  // Archived deliveries ticked for deleting, and those the delete dialog is asking about
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Delivery[] | null>(null);
  const archive = useArchiveDelivery(projectId);
  const remove = useRemoveDeliveries(projectId);
  const archived = p.archived ?? [];
  const picked = archived.filter((d) => ticked.has(d.id)); // ticks of deliveries no longer archived drop out
  const allTicked = archived.length > 0 && picked.length === archived.length;
  const tick = (id: string) =>
    setTicked((t) => {
      const next = new Set(t);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const hasBills = p.deliveries.some((d) => d.billUrl); // the bill column shows only when there is a bill to open
  const unit = p.unit ? ` ${p.unit}` : "";

  return (
    <>
      <div className="min-w-0 space-y-4">
        {canEdit && !logging && !editing && (
          <button type="button" onClick={() => setLogging(true)} className={`${mono.primary} w-full sm:w-auto`}>
            <FiPlus aria-hidden /> Add delivery
          </button>
        )}

        {/* the form first, so on a phone it is right under the name with the keypad open */}
        {editing ? (
          <LogForm key={editing.id} projectId={projectId} purchase={p} delivery={editing} onDone={() => setEditing(null)} />
        ) : (
          logging && <LogForm projectId={projectId} purchase={p} onDone={() => setLogging(false)} />
        )}

        {children}

        {p.deliveries.length === 0 ? (
          !logging && <p className="rounded-2xl border border-dashed border-[#DADAD7] px-4 py-6 text-center text-sm text-[#666666]">Nothing has come yet.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#E8E8E6]">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[20%]" />
                <col />
                <col className="w-[18%]" />
                <col className="w-[24%]" />
                {(hasBills || canEdit) && <col className={canEdit ? (hasBills ? "w-30" : "w-21") : "w-12"} />}
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
                  <th scope="col" className="px-2 py-2.5 text-right text-xs font-medium text-[#666666]">
                    Amount
                  </th>
                  {(hasBills || canEdit) && (
                    <th scope="col" className="py-2.5 pr-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEFED]">
                {p.deliveries.map((d) => (
                  <DeliveryRow
                    key={d.id}
                    d={d}
                    unit={p.unit}
                    showActions={hasBills || canEdit}
                    onEdit={
                      canEdit
                        ? () => {
                          setLogging(false);
                          setEditing(d);
                        }
                        : undefined
                    }
                    onArchive={canEdit ? () => archive.mutate({ purchaseId: p.id, deliveryId: d.id, archived: true }) : undefined}
                    busy={archive.isPending && archive.variables?.deliveryId === d.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {archive.isError && (
          <p role="alert" className="text-sm text-[#B3261E]">
            {describeError(archive.error)}
          </p>
        )}

        {archived.length > 0 && (
          <details className="group rounded-2xl border border-[#E8E8E6]">
            <summary className={`flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium text-[#333333] ${mono.ring}`}>
              <FiChevronDown aria-hidden className="transition-transform group-open:rotate-180" />
              Archived ({archived.length})<span className="ml-auto text-xs font-normal text-[#8C8C8C]">not counted</span>
            </summary>
            {canEdit && (
              <div className="flex flex-wrap items-center gap-3 border-t border-[#EFEFED] bg-[#F7F7F5] px-4 py-2">
                <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-[#333333]">
                  <input
                    type="checkbox"
                    checked={allTicked}
                    ref={(el) => {
                      if (el) el.indeterminate = picked.length > 0 && !allTicked;
                    }}
                    onChange={() => setTicked(allTicked ? new Set() : new Set(archived.map((d) => d.id)))}
                    className="h-4 w-4 accent-[#111111]"
                  />
                  Select all
                </label>
                {picked.length > 0 && (
                  <button type="button" onClick={() => setDeleting(picked)} className={`${mono.secondary} ml-auto min-h-10 px-3 text-sm text-[#B3261E] hover:bg-[#FCEDEC]`}>
                    <FiTrash2 aria-hidden /> Delete selected ({picked.length})
                  </button>
                )}
              </div>
            )}
            <ul className="divide-y divide-[#EFEFED] border-t border-[#EFEFED]">
              {archived.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                  {canEdit && (
                    <input
                      type="checkbox"
                      checked={ticked.has(d.id)}
                      onChange={() => tick(d.id)}
                      aria-label={`Select the delivery of ${shortDate(d.date)}`}
                      className="h-4 w-4 shrink-0 accent-[#111111]"
                    />
                  )}
                  <span className="min-w-0 flex-1 text-[#666666] line-through">
                    {shortDate(d.date)} · {qtyText(d.quantity)}
                    {unit} · {d.ratePending ? "not set" : money(d.amount)}
                  </span>
                  {canEdit && (
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => archive.mutate({ purchaseId: p.id, deliveryId: d.id, archived: false })}
                        disabled={archive.isPending}
                        className={`${mono.secondary} min-h-10 px-3 text-sm`}
                      >
                        <FiCornerUpLeft aria-hidden /> Restore
                      </button>
                      <button type="button" onClick={() => setDeleting([d])} className={`${mono.secondary} min-h-10 px-3 text-sm text-[#B3261E] hover:bg-[#FCEDEC]`}>
                        <FiTrash2 aria-hidden /> Delete
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* Delete for good: only from Archived (one, or all ticked), with the app's usual delete dialog */}
      <ConfirmDeleteDialog
        open={deleting !== null}
        onClose={() => {
          setDeleting(null);
          remove.reset();
        }}
        title={deleting && deleting.length > 1 ? `Delete ${deleting.length} deliveries?` : "Delete delivery?"}
        itemName={deleting?.length === 1 ? `${qtyText(deleting[0]!.quantity)}${unit} on ${shortDate(deleting[0]!.date)}` : undefined}
        description={
          deleting && deleting.length > 1 ? (
            <>
              Are you sure you want to delete these <strong className="font-semibold text-stone-900">{deleting.length} archived deliveries</strong>?
              <br />
              You can&rsquo;t undo this action.
            </>
          ) : undefined
        }
        pending={remove.isPending}
        error={remove.error ? describeError(remove.error) : null}
        onConfirm={() =>
          deleting &&
          remove.mutate(
            { purchaseId: p.id, deliveryIds: deleting.map((d) => d.id) },
            {
              onSuccess: () => {
                setDeleting(null);
                setTicked(new Set());
              },
            },
          )
        }
      />
    </>
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

/** A number typed in a field: "" is not given, anything else must be a number of 0 or more */
const parse = (v: string) => (v.trim() === "" ? null : Number(v));
const fmt = (n: number) => String(Math.round(n * 100) / 100);

/**
 * Log one delivery, or (with `delivery`) correct one: how many arrived, the rate (optional) and the amount, the date
 * (today unless changed) and the bill (new deliveries). Type the rate and the amount fills itself in; type the amount
 * and the rate works itself out. Both left empty: saved as "Not set", counting nothing until edited.
 * On a phone the Save button stays at the bottom of the screen.
 */
export function LogForm({
  projectId,
  purchase: p,
  delivery,
  onDone,
  cancelLabel = "Cancel",
}: {
  projectId: string;
  purchase: Purchase;
  delivery?: Delivery;
  onDone: () => void;
  cancelLabel?: string;
}) {
  const priced = delivery && !delivery.ratePending;
  const [date, setDate] = useState(delivery?.date ?? todayLocal());
  const [qty, setQty] = useState(delivery ? String(delivery.quantity) : "");
  const [rate, setRate] = useState(delivery ? (priced ? fmt(delivery.rate) : "") : String(p.rate)); // new: the preset rate to start with
  const [amount, setAmount] = useState(priced && delivery ? fmt(delivery.amount) : "");
  // Which of the two was typed last: that one is sent, the other follows from it
  const [lead, setLead] = useState<"rate" | "amount">(priced ? "amount" : "rate");
  const [bill, setBill] = useState<File | null>(null);
  const [tried, setTried] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const add = useAddDelivery(projectId);
  const update = useUpdateDelivery(projectId);
  const save = delivery ? update : add;

  const q = parse(qty);
  const r = parse(rate);
  const a = parse(amount);
  const qtyOk = q !== null && Number.isFinite(q) && q > 0;
  const qn = qtyOk ? q : 0; // how many, once valid
  const rateOk = r === null || (Number.isFinite(r) && r >= 0);
  const amountOk = a === null || (Number.isFinite(a) && a >= 0);
  const unit = p.unit || "units";
  const isToday = date === todayLocal();

  // The other field follows the one typed last
  const follow = (nextQty: number | null, nextRate: number | null, nextAmount: number | null, by: "rate" | "amount") => {
    if (by === "rate") setAmount(nextQty && nextQty > 0 && nextRate !== null && Number.isFinite(nextRate) ? fmt(amountOf(nextQty, nextRate)) : "");
    else setRate(nextQty && nextQty > 0 && nextAmount !== null && Number.isFinite(nextAmount) ? fmt(nextAmount / nextQty) : "");
  };
  const onQty = (v: string) => {
    setQty(v);
    setTried(false);
    follow(parse(v), r, a, lead);
  };
  const onRate = (v: string) => {
    setRate(v);
    setLead("rate");
    setTried(false);
    follow(q, parse(v), a, "rate");
  };
  const onAmount = (v: string) => {
    setAmount(v);
    setLead("amount");
    setTried(false);
    follow(q, r, parse(v), "amount");
  };

  const sentRate = lead === "rate" ? r : null;
  const sentAmount = lead === "amount" ? a : null;
  const notSet = (lead === "rate" ? r : a) === null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!qtyOk || !rateOk || !amountOk || save.isPending) return;
    const body = { date, quantity: qn, rate: sentRate, amount: sentAmount };
    if (delivery) update.mutate({ purchaseId: p.id, deliveryId: delivery.id, ...body }, { onSuccess: onDone });
    else add.mutate({ purchaseId: p.id, ...body, bill }, { onSuccess: onDone });
  };

  const chip = `min-h-10 rounded-full border border-[#DADAD7] bg-white px-3.5 text-sm font-medium text-[#111111] hover:bg-[#F7F7F5] ${mono.motion} ${mono.ring}`;
  const big = `${mono.field} h-12 text-lg tabular-nums sm:h-11 sm:text-[15px]`;
  const rupee = (
    <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 mt-0.75 -translate-y-1/2 text-[15px] text-[#666666]">
      ₹
    </span>
  );

  return (
    <form onSubmit={submit} noValidate className="min-w-0 space-y-4 rounded-2xl border border-[#E8E8E6] p-4 sm:p-5">
      <p className="text-[15px] font-semibold text-[#111111]">
        {delivery ? `Edit delivery of ${shortDate(delivery.date)}` : "Add delivery"}
        {!delivery && p.toCome > 0 && (
          <span className="font-normal text-[#666666]">
            {" "}
            · {qtyText(p.toCome)} {p.unit} left
          </span>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className={`${mono.fieldLabel} col-span-2 sm:col-span-1`}>
          How many came
          <input
            value={qty}
            onChange={(e) => onQty(e.target.value)}
            type="number"
            inputMode="decimal"
            enterKeyHint="next"
            min={0}
            step="any"
            autoFocus
            placeholder={p.toCome > 0 ? String(p.toCome) : "0"}
            aria-invalid={tried && !qtyOk}
            className={big}
          />
          <span className="mt-1 block text-xs font-normal text-[#666666]">{unit}</span>
        </label>
        <label className={mono.fieldLabel}>
          Rate <span className="font-normal text-[#8C8C8C]">(optional)</span>
          <span className="relative block">
            {rupee}
            <input
              value={rate}
              onChange={(e) => onRate(e.target.value)}
              onFocus={(e) => e.target.select()}
              type="number"
              inputMode="decimal"
              enterKeyHint="next"
              min={0}
              step="any"
              aria-invalid={tried && !rateOk}
              className={`${big} pl-7`}
            />
          </span>
          <span className="mt-1 block truncate text-xs font-normal text-[#666666]">
            per {p.unit || "unit"} · planned {money(p.rate)}
          </span>
        </label>
        <label className={mono.fieldLabel}>
          Amount
          <span className="relative block">
            {rupee}
            <input
              value={amount}
              onChange={(e) => onAmount(e.target.value)}
              onFocus={(e) => e.target.select()}
              type="number"
              inputMode="decimal"
              enterKeyHint="done"
              min={0}
              step="any"
              aria-invalid={tried && !amountOk}
              className={`${big} pl-7`}
            />
          </span>
          <span className="mt-1 block truncate text-xs font-normal text-[#666666]">fills itself, or type it</span>
        </label>
      </div>

      {/* one tap for the usual cases */}
      {((!delivery && p.toCome > 0) || r === null || Math.abs((r ?? 0) - p.rate) > 0.004) && (
        <div className="-mt-1 flex flex-wrap gap-2">
          {!delivery && p.toCome > 0 && (
            <button type="button" onClick={() => onQty(String(p.toCome))} className={chip}>
              All the rest · {qtyText(p.toCome)}
            </button>
          )}
          {(r === null || Math.abs(r - p.rate) > 0.004) && (
            <button type="button" onClick={() => onRate(String(p.rate))} className={chip}>
              Use rate {money(p.rate)}
            </button>
          )}
        </div>
      )}

      {tried && (!qtyOk || !rateOk || !amountOk) && (
        <p role="alert" className="text-xs font-medium text-[#B3261E]">
          {!qtyOk ? "Enter how many came." : !rateOk ? "The rate can't be negative." : "The amount can't be negative."}
        </p>
      )}
      {qtyOk && rateOk && amountOk && (
        <p className="rounded-xl bg-[#F7F7F5] px-3.5 py-2.5 text-sm text-[#333333]">
          {notSet ? (
            <>No rate or amount yet: saved as “Not set”, counting nothing until you edit it.</>
          ) : lead === "rate" && r !== null ? (
            <>
              This delivery: {qtyText(qn)} × {money(r)} = <b className="font-semibold tabular-nums text-[#111111]">{money(amountOf(qn, r))}</b>
            </>
          ) : (
            a !== null && (
              <>
                This delivery: <b className="font-semibold tabular-nums text-[#111111]">{money(a)}</b> for {qtyText(qn)} {p.unit} ({money(a / qn)} each)
              </>
            )
          )}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={mono.fieldLabel}>
          Date {isToday && <span className="font-normal text-[#8C8C8C]">(today)</span>}
          <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value || todayLocal())} className={mono.field} />
        </label>
        {!delivery && (
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
        )}
      </div>

      {save.isError && (
        <p role="alert" className="text-sm text-[#B3261E]">
          {describeError(save.error)}
        </p>
      )}

      {/* On a phone: stuck to the bottom of the screen, Save full width, so it is always one thumb away */}
      <div className="sticky bottom-0 z-1 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-2xl border-t border-[#EFEFED] bg-white px-4 py-3 sm:static sm:mx-0 sm:mb-0 sm:flex-row sm:justify-end sm:rounded-none sm:border-0 sm:p-0">
        <button type="button" onClick={onDone} disabled={save.isPending} className={`${mono.quiet} w-full sm:w-auto`}>
          {cancelLabel}
        </button>
        <button type="submit" disabled={save.isPending} className={`${mono.primary} h-12 w-full sm:h-auto sm:w-auto`}>
          {save.isPending ? "Saving…" : delivery ? "Save changes" : "Save"}
        </button>
      </div>
    </form>
  );
}

function DeliveryRow({
  d,
  unit,
  showActions,
  onEdit,
  onArchive,
  busy,
}: {
  d: Delivery;
  unit: string;
  showActions: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
  busy: boolean;
}) {
  return (
    <tr>
      <td className="whitespace-nowrap py-3 pl-4 pr-2 text-[#111111]">{shortDate(d.date)}</td>
      <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums text-[#111111]" title={`${qtyText(d.quantity)} ${unit}`.trim()}>
        {qtyText(d.quantity)}
      </td>
      <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums text-[#333333]">{d.ratePending ? <span className="text-[#8C8C8C]">—</span> : money(d.rate)}</td>
      <td className="whitespace-nowrap px-2 py-3 text-right font-semibold tabular-nums text-[#111111]">
        {d.ratePending ? <span className="font-medium text-[#8C8C8C]">Not set</span> : money(d.amount)}
      </td>
      {showActions && (
        <td className="py-1 pr-2 text-right">
          <span className="inline-flex items-center">
            {d.billUrl && (
              <a href={d.billUrl} target="_blank" rel="noreferrer" className={mono.icon} aria-label={`Open the bill of ${shortDate(d.date)}`} title="Open the bill">
                {d.billKind === "pdf" ? <FiFileText aria-hidden /> : <FiImage aria-hidden />}
              </a>
            )}
            {onEdit && (
              <button type="button" onClick={onEdit} className={mono.icon} aria-label={`Edit the delivery of ${shortDate(d.date)}`} title="Edit">
                <FiEdit2 aria-hidden />
              </button>
            )}
            {onArchive && (
              <button type="button" onClick={onArchive} disabled={busy} className={mono.icon} aria-label={`Archive the delivery of ${shortDate(d.date)}`} title="Archive (stops counting)">
                <FiArchive aria-hidden />
              </button>
            )}
          </span>
        </td>
      )}
    </tr>
  );
}

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