"use client";

import { useState, type FormEvent } from "react";
import { ModalDialog } from "@/components/utilites/ModalDialog";
import { useAddHireChange } from "@/hooks/useEquipment";
import { describeError } from "@/lib/api";
import type { EquipmentDetail } from "@/lib/equipment/api";
import { rupees } from "@/lib/projects/hub";
import { Choice, field, Label, primaryBtn, quietBtn, todayLocal } from "./shared";

type Kind = "rate" | "amount";

/**
 * Log a change to what a hired item costs, like Log delivery in Materials:
 *  - New rate: from the date on, every day is charged at the new rate (the days before keep the old one);
 *  - Add or take off: a one-off amount on a date (+ extra, − credit), charged to one site.
 */
export function HireChangeDialog({ item, projectId, onClose }: { item: EquipmentDetail; projectId: string; onClose: () => void }) {
    const add = useAddHireChange();
    const per = item.hirePer === "month" ? "month" : "day";
    const unitWord = item.unit === "nos" ? "piece" : item.unit;
    const current = item.rateNow ?? item.hireRate;

    // Sites it is at or has been at: the one-off amount is charged to one of them (this site first)
    const sites = [
        ...item.sites.map((s) => ({ id: s.projectId, title: s.title })),
        ...item.use.filter((u) => u.projectId).map((u) => ({ id: u.projectId!, title: u.title })),
    ].filter((s, i, all) => all.findIndex((x) => x.id === s.id) === i);

    const [kind, setKind] = useState<Kind>("rate");
    const [date, setDate] = useState(todayLocal());
    const [value, setValue] = useState("");
    const [site, setSite] = useState(sites.some((s) => s.id === projectId) ? projectId : (sites[0]?.id ?? ""));
    const [note, setNote] = useState("");
    const [error, setError] = useState<string | null>(null);

    const n = Number(value);
    const diff = kind === "rate" && current && n > 0 ? n - current : null;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!value.trim() || !Number.isFinite(n)) return setError(kind === "rate" ? "Enter the new rate." : "Enter an amount, like 2000 or -500.");
        if (kind === "rate" && n <= 0) return setError("The new rate must be above zero.");
        if (kind === "amount" && n === 0) return setError("Enter an amount, like 2000 or -500.");
        if (kind === "amount" && !site) return setError("Pick the site it is charged to.");
        if (date > todayLocal()) return setError("The date can't be in the future.");
        setError(null);
        try {
            await add.mutateAsync({
                id: item.id,
                body: kind === "rate" ? { kind, date, rate: n, note: note.trim() } : { kind, date, amount: n, projectId: site, note: note.trim() },
            });
            onClose();
        } catch (err) {
            setError(describeError(err));
        }
    };

    return (
        <ModalDialog open onClose={onClose} label={`Log a hire change: ${item.name}`} locked={add.isPending}>
            <form onSubmit={submit} className="space-y-4 p-5" noValidate>
                <div>
                    <h2 className="text-lg font-semibold">Log hire change</h2>
                    <p className="text-sm text-stone-500">
                        {item.name}
                        {current ? ` · now ${rupees(current)} per ${unitWord} a ${per}` : ""}
                    </p>
                </div>

                <Choice<Kind>
                    label="What changed"
                    value={kind}
                    onChange={(k) => {
                        setKind(k);
                        setError(null);
                    }}
                    options={[
                        { value: "rate", label: "New rate from a date" },
                        { value: "amount", label: "Add or take off an amount" },
                    ]}
                />

                <div className="grid grid-cols-2 gap-3">
                    <Label text={kind === "rate" ? "From" : "Date"}>
                        <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} className={field} />
                    </Label>
                    <Label text={kind === "rate" ? `New rate (₹ per ${unitWord} a ${per})` : "Amount (₹, − to take off)"}>
                        <input
                            inputMode="decimal"
                            value={value}
                            onChange={(e) => {
                                setValue(e.target.value);
                                setError(null);
                            }}
                            placeholder={kind === "rate" ? String(current ?? 1000) : "2000 or -500"}
                            aria-invalid={!!error}
                            className={`${field} tabular-nums`}
                        />
                    </Label>
                </div>

                {kind === "rate" && diff !== null && diff !== 0 && (
                    <p className={`text-sm ${diff > 0 ? "text-red-700" : "text-green-700"}`}>
                        {diff > 0 ? "Up" : "Down"} {rupees(Math.abs(diff))} from {rupees(current!)}. Days from {date} on are charged at the new rate.
                    </p>
                )}

                {kind === "amount" &&
                    (sites.length === 0 ? (
                        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This item hasn&apos;t been at any site yet, so there is no site to charge it to.</p>
                    ) : (
                        <Label text="Charged to">
                            <select value={site} onChange={(e) => setSite(e.target.value)} className={field}>
                                {sites.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.title}
                                    </option>
                                ))}
                            </select>
                        </Label>
                    ))}

                <Label text="Note" optional>
                    <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={kind === "rate" ? "Diesel price went up" : "Extra operator for the night pour"} className={field} />
                </Label>

                {error && (
                    <p role="alert" className="text-sm text-red-700">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={add.isPending} className={quietBtn}>
                        Cancel
                    </button>
                    <button type="submit" disabled={add.isPending} className={primaryBtn}>
                        {add.isPending ? "Saving…" : "Save"}
                    </button>
                </div>
            </form>
        </ModalDialog>
    );
}