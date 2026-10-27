"use client";

import React, { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { describeError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Heading, SubHeading } from "@/components/utilites/Label";

const inputClass =
    "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 " +
    "transition-colors focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20 disabled:opacity-60";

/** Where to go after signing in: ?next=/dashboard/boq if it is a page of this app, else the dashboard */
function nextPath(): string {
    if (typeof window === "undefined") return "/dashboard";
    const next = new URLSearchParams(window.location.search).get("next");
    // Only paths on this site: "/x" yes, "//evil.com" or "https://..." no
    return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default function LoginPage() {
    const router = useRouter();
    const { user, isUserLoading, login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Already signed in: skip the form
    useEffect(() => {
        if (!isUserLoading && user) router.replace(nextPath());
    }, [isUserLoading, user, router]);

    const handleSignIn = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (login.isPending) return;
        login.mutate(
            { email: email.trim(), password },
            // replace, not push: Back shouldn't return to the sign-in form
            { onSuccess: () => router.replace(nextPath()) }
        );
    };

    return (
        <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden p-4 sm:p-6">
            <Image src="/background.jpeg" alt="" aria-hidden fill priority sizes="100vw" quality={80} className="z-0 object-cover" />
            {/* Darkens the photo so the card reads well on any image */}
            <div aria-hidden className="absolute inset-0 z-0 bg-stone-950/40" />

            <div className="relative z-10 w-full max-w-md rounded-2xl border border-stone-200 bg-white/95 p-8 shadow-xl shadow-stone-900/10 backdrop-blur-sm sm:p-10">
                <div className="mb-8 flex flex-col items-center space-y-2 text-center">
                    <Heading className="text-3xl font-extrabold tracking-tight text-stone-900">Welcome back</Heading>
                    <SubHeading className="text-sm text-stone-500">Enter your email and password to sign in</SubHeading>
                </div>

                <form onSubmit={handleSignIn} className="space-y-5">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="login-email" className="text-sm font-medium text-stone-700">
                            Email
                        </label>
                        <input
                            id="login-email"
                            type="email"
                            name="email"
                            inputMode="email"
                            autoComplete="email"
                            autoCapitalize="none"
                            spellCheck={false}
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={login.isPending}
                            aria-invalid={login.isError || undefined}
                            aria-describedby={login.isError ? "login-error" : undefined}
                            className={inputClass}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="login-password" className="text-sm font-medium text-stone-700">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={login.isPending}
                                aria-invalid={login.isError || undefined}
                                aria-describedby={login.isError ? "login-error" : undefined}
                                className={`${inputClass} pr-11`}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                aria-pressed={showPassword}
                                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-stone-500 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                            >
                                {showPassword ? <FiEyeOff aria-hidden /> : <FiEye aria-hidden />}
                            </button>
                        </div>
                    </div>

                    {login.isError && (
                        <p id="login-error" role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700">
                            {describeError(login.error) || "Sign-in failed. Check your email and password and try again."}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={login.isPending}
                        className="flex w-full items-center justify-center rounded-lg bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {login.isPending ? "Signing in…" : "Sign in"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-stone-500">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="font-semibold text-stone-900 underline underline-offset-2 hover:text-stone-700">
                        Sign up
                    </Link>
                </p>
            </div>
        </main>
    );
}