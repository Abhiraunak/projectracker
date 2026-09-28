import Image from "next/image";
import React from "react";

interface AccountProps {
    user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
}

export const Account = ({ user }: AccountProps) => {
    const name = user?.name || "Guest User";
    const email = user?.email || "Sign in to your account";
    const avatar =
        user?.image ||
        `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}`;

    return (
        <div className="border-b mb-4 mt-2 pb-4 border-stone-300">
            <button className="flex p-0.5 hover:bg-stone-200 rounded transition-colors relative gap-2 w-full items-center">
                <Image
                    src={avatar}
                    alt={name}
                    width={32}
                    height={32}
                    unoptimized
                    className="size-8 rounded shrink-0 bg-violet-500 shadow object-cover"
                />
                <div className="text-start overflow-hidden">
                    <span className="text-sm font-bold block truncate">{name}</span>
                    <span className="text-xs block text-stone-500 truncate">{email}</span>
                </div>
            </button>
        </div>
    );
};