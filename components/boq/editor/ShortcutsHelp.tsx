import { FiCommand } from "react-icons/fi";

const SHORTCUTS: [string, string][] = [
  ["Arrow keys", "Move between cells"],
  ["Enter / Shift+Enter", "Cell below / above"],
  ["Ctrl+Enter", "New measurement line below"],
  ["Ctrl+Shift+Enter", "New heading line below"],
  ["Ctrl+Delete", "Delete the line"],
  ["Ctrl+Z / Ctrl+Y", "Undo / redo"],
  ["Ctrl+S", "Save now"],
  ["Paste from Excel", "Copied rows become lines"],
];

/** A small panel listing the keyboard shortcuts (Cmd instead of Ctrl on a Mac) */
export function ShortcutsHelp() {
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded border border-stone-300 px-2.5 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 [&::-webkit-details-marker]:hidden">
        <FiCommand aria-hidden /> <span className="hidden sm:inline">Shortcuts</span>
      </summary>
      <dl className="absolute right-0 z-30 mt-1 w-72 space-y-1.5 rounded border border-stone-300 bg-white p-3 text-xs shadow-lg">
        {SHORTCUTS.map(([keys, action]) => (
          <div key={keys} className="flex justify-between gap-3">
            <dt className="font-medium text-stone-800">{keys}</dt>
            <dd className="text-right text-stone-500">{action}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
