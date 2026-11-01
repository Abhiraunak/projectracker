"use client";

import { memo } from "react";
import { FiChevronRight } from "react-icons/fi";
import { hrefFor, onPlaceClick } from "@/hooks/useWorkspacePlace";
import { plural, rupeesShort, shortDate, type ProjectHub } from "@/lib/projects/hub";
import type { SectionDef } from "./sections";
import { ProgressRing } from "./ui";

/** The project at a glance: four figures, then one tile per section with a single line of news */
export const Overview = memo(function Overview({ projectId, hub, sections }: { projectId: string; hub: ProjectHub; sections: SectionDef[] }) {
  const { money: m, progress: p } = hub;
  const over = m.left < 0;

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-stone-200 sm:grid-cols-4">
        <Figure label={m.budgetIsSet ? "Budget" : "Agreed work"} value={rupeesShort(m.budget)} note={m.budgetIsSet ? undefined : "No project budget set"} />
        <Figure label="Spent" value={rupeesShort(m.spent)} note={`${m.usedPct}% · labour ${rupeesShort(m.labourPaid)}, materials ${rupeesShort(m.materialSpent)}`} />
        <Figure label={over ? "Over budget" : "Left"} value={rupeesShort(Math.abs(m.left))} tone={over ? "text-red-700" : undefined} />
        <div className="flex items-center gap-3 border-t border-l border-stone-200 px-4 py-3 sm:border-t-0 sm:px-5 sm:py-4">
          <ProgressRing percent={p.percent} size={52} />
          <div className="min-w-0">
            <dt className="text-xs text-stone-500">Progress</dt>
            <dd className={`text-sm font-medium ${p.late ? "text-red-700" : "text-stone-900"}`}>
              {p.daysLeft === null ? plural(p.items, "work item") : p.late ? `${-p.daysLeft} days late` : `${plural(p.daysLeft, "day")} left`}
            </dd>
            {p.end && <dd className="text-xs text-stone-500">ends {shortDate(p.end)}</dd>}
          </div>
        </div>
      </dl>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {sections.map((s) => (
          <SectionTile key={s.key} projectId={projectId} def={s} hub={hub} />
        ))}
      </ul>
    </div>
  );
});

function Figure({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: string }) {
  return (
    <div className="min-w-0 border-stone-200 px-4 py-3 even:border-l [&:nth-child(n+3)]:border-t sm:px-5 sm:py-4 sm:[&:nth-child(n+2)]:border-l sm:[&:nth-child(n+3)]:border-t-0">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className={`mt-0.5 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl ${tone ?? "text-stone-900"}`}>{value}</dd>
      {note && <dd className="mt-0.5 truncate text-xs text-stone-500">{note}</dd>}
    </div>
  );
}

function SectionTile({ projectId, def, hub }: { projectId: string; def: SectionDef; hub: ProjectHub }) {
  const place = { projectId, section: def.key };
  const { text, tone } = def.summary(hub);
  const warm = () => void def.load();
  return (
    <li>
      <a
        href={hrefFor(place)}
        onClick={onPlaceClick(place)}
        onPointerEnter={warm}
        onTouchStart={warm}
        onFocus={warm}
        className="group flex h-full min-h-28 flex-col justify-between gap-3 rounded-xl border border-stone-200 p-4 transition-colors hover:border-stone-400 focus-visible:border-stone-900 focus-visible:outline-none active:bg-stone-50"
      >
        <span className="flex items-center justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-xl text-orange-600">
            <def.Icon aria-hidden />
          </span>
          <FiChevronRight aria-hidden className="text-stone-300 transition-colors group-hover:text-stone-500" />
        </span>
        <span>
          <span className="block font-medium text-stone-900">{def.label}</span>
          <span className={`mt-0.5 block text-xs leading-snug ${tone === "warn" ? "text-amber-700" : tone === "good" ? "text-emerald-700" : "text-stone-500"}`}>
            {text || " "}
          </span>
        </span>
      </a>
    </li>
  );
}
