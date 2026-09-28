import { Group, Heading, Input, Label, SubHeading } from "@/components/utilites/Label";

export default function Page() {
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

                 <form className='space-y-4 sm:space-y-5'>
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
                        Sign In
                    </button>
                    
                </form>
            </div>
        </div>
    );
}