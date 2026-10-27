"use client";

import React, { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { describeError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Heading, SubHeading } from "@/components/utilites/Label";

const MIN_PASSWORD = 8;

const inputClass =
    "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 " +
    "transition-colors focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20 disabled:opacity-60 " +
    "aria-[invalid=true]:border-red-400";

export default function SignUpPage() {
    const router = useRouter();
    const { user, isUserLoading, register } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [problem, setProblem] = useState<string | null>(null); // a mistake caught before sending

    // Already signed in: nothing to sign up for
    useEffect(() => {
        if (!isUserLoading && user) router.replace("/dashboard");
    }, [isUserLoading, user, router]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (register.isPending) return;
        const cleanName = name.trim().replace(/\s+/g, " ");
        if (cleanName.length < 2) return setProblem("Enter your name.");
        if (password.length < MIN_PASSWORD) return setProblem(`Use a password of at least ${MIN_PASSWORD} characters.`);
        setProblem(null);

        register.mutate(
            { name: cleanName, email: email.trim().toLowerCase(), password },
            // replace, not push: Back shouldn't return to a filled-in sign-up form
            { onSuccess: () => router.replace("/signin?created=1") }
        );
    };

    const error = problem ?? (register.isError ? describeError(register.error) || "Couldn't create the account. Please try again." : null);
    const passwordShort = password.length > 0 && password.length < MIN_PASSWORD;

    return (
        <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden p-4 sm:p-6">
            <Image src="/background.jpeg" alt="" aria-hidden fill priority sizes="100vw" quality={80} className="z-0 object-cover" />
            {/* Darkens the photo so the card reads well on any image */}
            <div aria-hidden className="absolute inset-0 z-0 bg-stone-950/40" />

            <div className="relative z-10 w-full max-w-md rounded-2xl border border-stone-200 bg-white/95 p-8 shadow-xl shadow-stone-900/10 backdrop-blur-sm sm:p-10">
                <div className="mb-8 flex flex-col items-center space-y-1.5 text-center">
                    <Heading className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">Create an account</Heading>
                    <SubHeading className="text-sm text-stone-500">Enter your details to get started</SubHeading>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="signup-name" className="text-sm font-medium text-stone-700">
                            Name
                        </label>
                        <input
                            id="signup-name"
                            type="text"
                            name="name"
                            autoComplete="name"
                            placeholder="Your full name"
                            maxLength={100}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={register.isPending}
                            className={inputClass}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="signup-email" className="text-sm font-medium text-stone-700">
                            Email
                        </label>
                        <input
                            id="signup-email"
                            type="email"
                            name="email"
                            inputMode="email"
                            autoComplete="email"
                            autoCapitalize="none"
                            spellCheck={false}
                            placeholder="name@company.com"
                            maxLength={200}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={register.isPending}
                            className={inputClass}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="signup-password" className="text-sm font-medium text-stone-700">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="signup-password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                autoComplete="new-password"
                                placeholder="••••••••"
                                minLength={MIN_PASSWORD}
                                maxLength={128}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={register.isPending}
                                aria-invalid={passwordShort || undefined}
                                aria-describedby="signup-password-hint"
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
                        <p id="signup-password-hint" className={`text-xs ${passwordShort ? "text-red-700" : "text-stone-500"}`}>
                            At least {MIN_PASSWORD} characters.
                        </p>
                    </div>

                    {error && (
                        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={register.isPending}
                        className="flex w-full items-center justify-center rounded-lg bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {register.isPending ? "Creating account…" : "Create account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-stone-500">
                    Already have an account?{" "}
                    <Link href="/signin" className="font-semibold text-stone-900 underline underline-offset-2 hover:text-stone-700">
                        Sign in
                    </Link>
                </p>
            </div>
        </main>
    );
}