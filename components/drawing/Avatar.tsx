import { initialOf } from "@/lib/drawings/format";
import type { AppUser } from "@/lib/drawings/types";

export function Avatar({ user, size = "md" }: { user: AppUser; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-stone-200 font-semibold text-stone-700 ${
        size === "sm" ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm"
      }`}
    >
      {initialOf(user.email)}
    </span>
  );
}
