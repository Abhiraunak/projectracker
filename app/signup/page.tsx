"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Group, Heading, Input, Label, SubHeading } from "@/components/utilites/Label";

export default function Page() {
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        // Add your authentication / sign-up logic here...

        // Redirect to the main page (or dashboard)
        router.push("/");
    };

    return (
        <div className='w-full min-h-screen flex flex-col justify-between bg-stone-100/70 p-4 sm:p-6 font-sans antialiased'>
            
            <div className='w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200/80 p-8 sm:p-10 my-auto'>

                <div className='mb-8 flex flex-col items-center text-center space-y-1.5'>
                    <Heading className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
                        Create an account
                    </Heading>
                    <SubHeading className="text-sm text-stone-500">
                        Enter your details below to get started
                    </SubHeading>
                </div>

                <form onSubmit={handleSubmit} className='space-y-4 sm:space-y-5'>

                    <Group className="flex flex-col gap-1.5">
                        <Label className="text-sm font-medium text-stone-700 after:content-['*'] after:ml-0.5 after:text-amber-600">
                            Name
                        </Label>
                        <Input
                            type='text'
                            name='name'
                            placeholder='Enter your name'
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-800 focus:ring-1 focus:ring-stone-800 transition-all outline-none text-sm"
                            required
                        />
                    </Group>

                    <Group className="flex flex-col gap-1.5">
                        <Label className="text-sm font-medium text-stone-700 after:content-['*'] after:ml-0.5 after:text-amber-600">
                            Email
                        </Label>
                        <Input
                            type='email'
                            name='email'
                            placeholder='name@company.com'
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
                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-800 focus:ring-1 focus:ring-stone-800 transition-all outline-none text-sm"
                            required
                        />
                    </Group>

                    <button
                        type="submit"
                        className="mt-6 w-full flex justify-center items-center py-3 px-6 rounded-xl text-sm font-semibold text-stone-50 bg-stone-900 hover:bg-stone-800 active:bg-stone-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-900 active:scale-[0.99] transition-all duration-150 cursor-pointer"
                    >
                        Sign Up
                    </button>

                </form>

                <div className="mt-6 text-center text-xs text-stone-500">
                    Already have an account?{" "}
                    <Link href="/signin" className="font-semibold text-stone-900 underline hover:text-stone-700">
                        Sign in
                    </Link>
                </div>

            </div>

            <div className="py-2" />
        </div>
    );
}