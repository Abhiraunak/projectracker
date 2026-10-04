"use client"
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Group, Heading, Input, Label, SubHeading } from "@/components/utilites/Label";
// Import the custom hook we created earlier
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function Page() {
    const router = useRouter();
    const { login } = useAuth(); // Destructure the login mutation

    // Add state for form inputs
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSignIn = (e: React.FormEvent) => {
        e.preventDefault(); // Prevent page reload

        // Trigger the TanStack Query mutation
        login.mutate(
            { email, password },
            {
                onSuccess: () => {
                    // Redirect to dashboard ONLY if login is successful
                    router.push("/dashboard");
                }
            }
        );
    };

    return (
        <div className='w-full min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6'>
            <div className='w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10'>

                <div className='mb-8 flex flex-col items-center text-center space-y-2'>
                    <Heading className="text-3xl font-extrabold tracking-tight text-slate-900">
                        Welcome back
                    </Heading>
                    <SubHeading className="text-sm text-slate-500">
                        Please enter your credentials to sign in
                    </SubHeading>
                </div>

                {/* Attach onSubmit to the form instead of onClick on the button */}
                <form onSubmit={handleSignIn} className='space-y-4 sm:space-y-5'>
                    <Group className="flex flex-col gap-1.5">
                        <Label className="text-sm font-medium text-stone-700 after:content-['*'] after:ml-0.5 after:text-amber-600">
                            Email
                        </Label>
                        <Input
                            type='email'
                            name='email'
                            placeholder='name@company.com'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-800 focus:ring-1 focus:ring-stone-800 transition-all outline-none text-sm"
                            required
                        />
                    </Group>

                    <Group className="flex flex-col gap-1.5">
                        <Label className="text-sm font-medium text-stone-700 after:content-['*'] after:ml-0.5 after:text-amber-600">
                            Password
                        </Label>
                        <Input
                            type='password'
                            name='password'
                            placeholder='••••••••'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-800 focus:ring-1 focus:ring-stone-800 transition-all outline-none text-sm"
                            required
                        />
                    </Group>

                    {/* Display error message if the mutation fails */}
                    {login.isError && (
                        <div className="text-sm font-medium text-red-500 text-center">
                            {login.error?.message || "Failed to sign in. Please try again."}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={login.isPending} // Disable while loading
                        className="mt-6 w-full flex justify-center items-center py-3 px-6 rounded-xl text-sm font-semibold text-stone-50 bg-stone-900 hover:bg-stone-800 active:bg-stone-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-900 active:scale-[0.99] transition-all duration-150 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {login.isPending ? "Signing in..." : "Sign In"}
                    </button>
                </form>
                <div className="mt-6 text-center text-xs text-stone-500">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="font-semibold text-stone-900 underline hover:text-stone-700">
                        Sign up
                    </Link>
                </div>
            </div>
            <div className="py-2" />
        </div>
    );
}