import { FiLock } from "react-icons/fi";

/** Someone opened a page their permissions don't include (for example by typing its address) */
export function NoAccess() {
  return (
    <div className="mx-auto max-w-md px-2 py-12 text-center sm:py-20">
      <span aria-hidden className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-500">
        <FiLock className="h-5 w-5" />
      </span>
      <p className="font-semibold">You don&rsquo;t have access to this page</p>
      <p className="mt-1 text-sm text-stone-500">Ask an admin if you need it. The pages you can use are in the menu.</p>
    </div>
  );
}
