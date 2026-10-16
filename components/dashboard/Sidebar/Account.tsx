"use client";
import Image from "next/image";
import React from "react";
import { useAuth } from "@/hooks/useAuth";

export const Account = () => {
  const { user, isUserLoading } = useAuth();

  if (isUserLoading) {
    return (
      <div className="border-b mb-4 mt-2 pb-4 border-stone-300">
        <div className="flex p-0.5 gap-2 w-full items-center animate-pulse">
          <div className="size-8 rounded bg-stone-200 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-stone-200" />
            <div className="h-2.5 w-32 rounded bg-stone-200" />
          </div>
        </div>
      </div>
    );
  }

  const name = user?.name ?? user?.email?.split("@")[0] ?? "Guest User";
  const email = user?.email ?? "Sign in to your account";
  const avatar =
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
          className="size-8 rounded shrink-0 bg-stone-300 shadow object-cover"
        />
        <div className="text-start overflow-hidden">
          <span className="text-sm font-bold block truncate text-stone-900">{name}</span>
          <span className="text-xs block text-stone-500 truncate">{email}</span>
        </div>
      </button>
    </div>
  );
};