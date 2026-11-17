"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

/**
 * Six boxes for a 6-digit code, made for phones:
 *  - the number keypad opens (inputMode="numeric"), and the phone offers the code from the email or SMS
 *    (autoComplete="one-time-code" on the first box)
 *  - typing a digit moves to the next box; Backspace on an empty box goes back; arrows move
 *  - pasting (or the phone filling) the whole code fills every box, and onComplete runs
 */
export function OtpInput({
    value,
    onChange,
    onComplete,
    disabled,
    invalid,
    label = "6-digit code",
}: {
    value: string;
    onChange: (code: string) => void;
    onComplete?: (code: string) => void;
    disabled?: boolean;
    invalid?: boolean;
    label?: string;
}) {
    const boxes = useRef<(HTMLInputElement | null)[]>([]);
    const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");
    const focus = (i: number) => boxes.current[Math.max(0, Math.min(5, i))]?.focus();

    const set = (next: string, cursor: number) => {
        const clean = next.replace(/\D/g, "").slice(0, 6);
        onChange(clean);
        if (clean.length === 6) {
            boxes.current[5]?.blur();
            onComplete?.(clean);
        } else focus(cursor);
    };

    const type = (i: number, raw: string) => {
        let typed = raw.replace(/\D/g, "");
        if (!typed) return;
        if (typed.length >= 4) return set(typed, typed.length); // the phone filled the whole code into one box
        typed = typed.slice(-1); // typed over a digit already there: keep the new one
        const at = Math.min(i, value.length); // no gaps: a digit typed past the end goes at the end
        set(value.slice(0, at) + typed + value.slice(at + 1), at + 1);
    };

    const key = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
            e.preventDefault();
            // The code is kept without gaps: remove this box's digit, or the one before when this box is empty
            if (digits[i]) onChange(value.slice(0, i) + value.slice(i + 1));
            else if (i > 0) {
                onChange(value.slice(0, i - 1) + value.slice(i));
                focus(i - 1);
            }
        } else if (e.key === "ArrowLeft") focus(i - 1);
        else if (e.key === "ArrowRight") focus(i + 1);
    };

    const paste = (e: ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData("text").replace(/\D/g, "");
        if (!text) return;
        e.preventDefault();
        set(text, text.length);
    };

    return (
        <div role="group" aria-label={label} className="flex justify-between gap-2">
            {digits.map((d, i) => (
                <input
                    key={i}
                    ref={(el) => {
                        boxes.current[i] = el;
                    }}
                    value={d}
                    onChange={(e) => type(i, e.target.value)}
                    onKeyDown={(e) => key(i, e)}
                    onPaste={paste}
                    onFocus={(e) => e.target.select()}
                    disabled={disabled}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    enterKeyHint={i === 5 ? "done" : "next"}
                    maxLength={i === 0 ? 6 : 1}
                    aria-label={`Digit ${i + 1} of 6`}
                    aria-invalid={invalid || undefined}
                    className={`h-14 w-full min-w-0 rounded-xl border bg-white text-center text-2xl font-semibold tabular-nums text-stone-900 transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 ${invalid ? "border-red-400 focus:border-red-600 focus:ring-red-600/20" : "border-stone-300 focus:border-stone-900 focus:ring-stone-900/20"
                        }`}
                />
            ))}
        </div>
    );
}