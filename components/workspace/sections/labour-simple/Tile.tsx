import type { ReactNode } from "react";
import { TONE, type Tone } from "./shared";

/** A coloured figure: label, big number, a small note */
export function Tile({ tone, label, value, note }: { tone: Tone; label: string; value: string; note?: ReactNode }) {
    const t = TONE[tone];
    return (
        <div className={`min-w-0 rounded-[18px] border px-4 py-3 ${t.box}`}>
            <p className={`text-xs ${t.label}`}>{label}</p>
            <p className={`mt-0.5 truncate text-xl font-semibold tabular-nums tracking-[-0.01em] ${t.value}`}>{value}</p>
            {note && <p className={`mt-0.5 truncate text-xs ${t.label}`}>{note}</p>}
        </div>
    );
}