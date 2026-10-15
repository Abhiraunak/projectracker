/** The few class strings shared by every drawings component, so the look changes in one place */

export const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900";

export const inputBase =
  "w-full rounded border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 " +
  "focus:border-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20 disabled:opacity-60";

const button = `flex items-center justify-center gap-2 rounded px-4 py-2.5 text-sm font-medium transition-colors ${focusRing} disabled:cursor-not-allowed disabled:opacity-50`;

export const buttonPrimary = `${button} bg-stone-900 font-semibold text-white hover:bg-stone-700`;
export const buttonSecondary = `${button} border border-stone-300 text-stone-700 hover:bg-stone-50`;

// 40px tall on phones (easy to tap), a bit tighter on larger screens
export const iconButton = `rounded p-2.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 sm:p-2 ${focusRing} disabled:cursor-not-allowed disabled:opacity-40`;
