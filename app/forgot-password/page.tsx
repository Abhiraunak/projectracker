"use client";

import React, { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiCheck, FiEye, FiEyeOff } from "react-icons/fi";
import { OtpInput } from "@/components/auth/OtpInput";
import { describeError } from "@/lib/api";
import { passwordApi, passwordOk, PASSWORD_RULES } from "@/lib/auth/passwordApi";
import { useAuth } from "@/hooks/useAuth";
import { SubHeading } from "@/components/utilites/Label";

// 16px text on phones so iOS doesn't zoom into the field; the sign-in page's look otherwise
const inputClass =
    "h-12 w-full rounded-lg border border-stone-300 bg-white px-3.5 text-base text-stone-900 placeholder:text-stone-400 sm:text-sm " +
    "transition-colors focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20 disabled:opacity-60";
const primary =
    "flex h-12 w-full items-center justify-center rounded-lg bg-stone-900 px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-stone-700 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm";
const textLink = "font-semibold text-stone-900 underline underline-offset-2 hover:text-stone-700";

type Step = "email" | "code" | "password" | "done";

/** "abhishek@gmail.com" → "a•••••••@gmail.com", so a shoulder-surfer can't read the whole address */
const masked = (email: string) => {
    const [name = "", domain = ""] = email.split("@");
    return `${name.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(8, name.length - 1)))}@${domain}`;
};

/**
 * Forgot password, in three short steps on one page: email → the 6-digit code from the email → a new password.
 * The reset ticket lives only in this page's memory (never in the address bar or storage), and when it's done the
 * person signs in again with the new password.
 */
export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ForgotPassword />
        </Suspense>
    );
}

function ForgotPassword() {
    const router = useRouter();
    const { user, isUserLoading } = useAuth();
    const [step, setStep] = useState<Step>("email");
    const params = useSearchParams();
    // ?email= from the sign-in page fills the box (read here, not set in an effect)
    const [email, setEmail] = useState(() => {
        const e = params.get("email") ?? "";
        return e.length <= 254 ? e : "";
    });
    const [code, setCode] = useState("");
    const [ticket, setTicket] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [wait, setWait] = useState(0); // seconds until "Resend code"
    const heading = useRef<HTMLHeadingElement>(null);

    // Signed in already: changing the password lives in the account menu instead
    useEffect(() => {
        if (!isUserLoading && user) router.replace("/dashboard");
    }, [isUserLoading, user, router]);


    // Each step moves focus to its heading, for screen readers and so the page starts at the top on phones
    useEffect(() => {
        heading.current?.focus();
    }, [step]);

    useEffect(() => {
        if (wait <= 0) return;
        const t = setTimeout(() => setWait((w) => w - 1), 1000);
        return () => clearTimeout(t);
    }, [wait]);

    const run = async (fn: () => Promise<void>) => {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            await fn();
        } catch (err) {
            setError(describeError(err) || "Something went wrong. Try again.");
        } finally {
            setBusy(false);
        }
    };

    const sendCode = (e?: FormEvent) => {
        e?.preventDefault();
        const clean = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setError("Enter a valid email.");
        void run(async () => {
            const r = await passwordApi.forgot(clean);
            setEmail(clean);
            setCode("");
            setWait(r.resendAfter ?? 60);
            setStep("code");
        });
    };

    const checkCode = (value = code) => {
        if (!/^\d{6}$/.test(value)) return setError("Enter the 6-digit code.");
        void run(async () => {
            const r = await passwordApi.verify(email, value);
            setTicket(r.ticket);
            setStep("password");
        });
    };

    const savePassword = (e: FormEvent) => {
        e.preventDefault();
        if (!passwordOk(password)) return setError("The password needs 8+ characters, a letter and a number.");
        if (password !== confirm) return setError("The two passwords don't match.");
        void run(async () => {
            await passwordApi.reset(ticket, password);
            setTicket("");
            setPassword("");
            setConfirm("");
            setStep("done");
        });
    };

    return (
        <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden p-4 sm:p-6">
            <Image src="/background.jpeg" alt="" aria-hidden fill priority sizes="100vw" quality={80} className="z-0 object-cover" />
            <div aria-hidden className="absolute inset-0 z-0 bg-stone-950/40" />

            <div className="relative z-10 w-full max-w-md rounded-2xl border border-stone-200 bg-white/95 p-6 shadow-xl shadow-stone-900/10 backdrop-blur-sm sm:p-10">
                {step !== "done" && (
                    <p className="mb-6 text-center text-xs font-medium uppercase tracking-wide text-stone-400" aria-live="polite">
                        Step {step === "email" ? 1 : step === "code" ? 2 : 3} of 3
                    </p>
                )}

                {step === "email" && (
                    <>
                        <div className="mb-7 flex flex-col items-center space-y-2 text-center">
                            <h1 ref={heading} tabIndex={-1} className="text-3xl font-extrabold tracking-tight text-stone-900 focus:outline-none">Reset your password</h1>
                            <SubHeading className="text-sm text-stone-500">Enter your account email. We&apos;ll send you a 6-digit code.</SubHeading>
                        </div>
                        <form onSubmit={sendCode} className="space-y-5" noValidate>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="reset-email" className="text-sm font-medium text-stone-700">
                                    Email
                                </label>
                                <input
                                    id="reset-email"
                                    type="email"
                                    name="email"
                                    inputMode="email"
                                    autoComplete="email"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    enterKeyHint="send"
                                    maxLength={254}
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={busy}
                                    aria-invalid={!!error || undefined}
                                    aria-describedby={error ? "reset-error" : undefined}
                                    className={inputClass}
                                    required
                                />
                            </div>
                            {error && <Problem text={error} />}
                            <button type="submit" disabled={busy} className={primary}>
                                {busy ? "Sending…" : "Send code"}
                            </button>
                        </form>
                    </>
                )}

                {step === "code" && (
                    <>
                        <div className="mb-7 flex flex-col items-center space-y-2 text-center">
                            <h1 ref={heading} tabIndex={-1} className="text-3xl font-extrabold tracking-tight text-stone-900 focus:outline-none">Check your email</h1>
                            <SubHeading className="text-sm text-stone-500">
                                If an account exists for <b className="font-semibold text-stone-800">{masked(email)}</b>, a code is on its way. It expires in 10 minutes.
                            </SubHeading>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                checkCode();
                            }}
                            className="space-y-5"
                        >
                            <OtpInput value={code} onChange={setCode} onComplete={(c) => checkCode(c)} disabled={busy} invalid={!!error} />
                            {error && <Problem text={error} />}
                            <button type="submit" disabled={busy || code.length !== 6} className={primary}>
                                {busy ? "Checking…" : "Verify"}
                            </button>
                        </form>
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-stone-500">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep("email");
                                    setError(null);
                                }}
                                className="inline-flex min-h-11 items-center gap-1.5 font-medium text-stone-700 hover:text-stone-900"
                            >
                                <FiArrowLeft aria-hidden /> Use another email
                            </button>
                            {wait > 0 ? (
                                <span aria-live="off">Resend code in {Math.floor(wait / 60)}:{String(wait % 60).padStart(2, "0")}</span>
                            ) : (
                                <button type="button" onClick={() => sendCode()} disabled={busy} className={`min-h-11 ${textLink}`}>
                                    Resend code
                                </button>
                            )}
                        </div>
                        <p className="mt-2 text-xs text-stone-400">No email? Check spam, or make sure this is the email you signed up with.</p>
                    </>
                )}

                {step === "password" && (
                    <>
                        <div className="mb-7 flex flex-col items-center space-y-2 text-center">
                            <h1 ref={heading} tabIndex={-1} className="text-3xl font-extrabold tracking-tight text-stone-900 focus:outline-none">Set a new password</h1>
                            <SubHeading className="text-sm text-stone-500">For {masked(email)}. You&apos;ll be signed out on every device.</SubHeading>
                        </div>
                        <form onSubmit={savePassword} className="space-y-5" noValidate>
                            {/* Lets password managers save the new password under the right account */}
                            <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="new-password" className="text-sm font-medium text-stone-700">
                                    New password
                                </label>
                                <div className="relative">
                                    <input
                                        id="new-password"
                                        type={show ? "text" : "password"}
                                        name="new-password"
                                        autoComplete="new-password"
                                        enterKeyHint="next"
                                        maxLength={128}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={busy}
                                        aria-describedby="password-rules"
                                        className={`${inputClass} pr-12`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShow((v) => !v)}
                                        aria-label={show ? "Hide password" : "Show password"}
                                        aria-pressed={show}
                                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-stone-500 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                                    >
                                        {show ? <FiEyeOff aria-hidden /> : <FiEye aria-hidden />}
                                    </button>
                                </div>
                                <ul id="password-rules" className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                    {PASSWORD_RULES.map((r) => {
                                        const ok = r.ok(password);
                                        return (
                                            <li key={r.label} className={`inline-flex items-center gap-1 ${ok ? "text-green-700" : "text-stone-400"}`}>
                                                <FiCheck aria-hidden className={ok ? "" : "opacity-40"} />
                                                {r.label}
                                                <span className="sr-only">{ok ? "(done)" : "(needed)"}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="confirm-password" className="text-sm font-medium text-stone-700">
                                    Confirm password
                                </label>
                                <input
                                    id="confirm-password"
                                    type={show ? "text" : "password"}
                                    name="confirm-password"
                                    autoComplete="new-password"
                                    enterKeyHint="done"
                                    maxLength={128}
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    disabled={busy}
                                    aria-invalid={(confirm.length > 0 && confirm !== password) || undefined}
                                    className={inputClass}
                                    required
                                />
                                {confirm.length > 0 && confirm !== password && <p className="text-xs text-red-700">The passwords don&apos;t match yet.</p>}
                            </div>
                            {error && <Problem text={error} />}
                            <button type="submit" disabled={busy} className={primary}>
                                {busy ? "Saving…" : "Save password"}
                            </button>
                        </form>
                    </>
                )}

                {step === "done" && (
                    <div className="flex flex-col items-center text-center">
                        <span aria-hidden className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl text-green-700">
                            <FiCheck />
                        </span>
                        <h1 ref={heading} tabIndex={-1} className="text-3xl font-extrabold tracking-tight text-stone-900 focus:outline-none">Password changed</h1>
                        <SubHeading className="mt-2 text-sm text-stone-500">Sign in with your new password. Every other device has been signed out.</SubHeading>
                        <Link href={`/signin?email=${encodeURIComponent(email)}`} className={`${primary} mt-7`}>
                            Sign in
                        </Link>
                    </div>
                )}

                {step !== "done" && (
                    <p className="mt-7 text-center text-sm text-stone-500">
                        Remembered it?{" "}
                        <Link href="/signin" className={textLink}>
                            Back to sign in
                        </Link>
                    </p>
                )}
            </div>
        </main>
    );
}

function Problem({ text }: { text: string }) {
    return (
        <p id="reset-error" role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            {text}
        </p>
    );
}