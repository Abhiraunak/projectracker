import type { IconType } from "react-icons";

const TONES = {
  good: "bg-green-100 text-green-700",
  warn: "bg-yellow-100 text-yellow-800",
  bad: "bg-red-100 text-red-700",
  info: "bg-amber-100 text-amber-800",
  neutral: "bg-stone-100 text-stone-600",
  dark: "bg-stone-800 text-white",
} as const;

export type Tone = keyof typeof TONES;

/** The small coloured label used for every status */
export function Pill({ tone, icon: Icon, children }: { tone: Tone; icon?: IconType; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${TONES[tone]}`}>
      {Icon && <Icon aria-hidden />}
      {children}
    </span>
  );
}
