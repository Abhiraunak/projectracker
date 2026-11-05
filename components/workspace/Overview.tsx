"use client";

import { memo } from "react";
import { FiChevronRight } from "react-icons/fi";
import { hrefFor, onPlaceClick } from "@/hooks/useWorkspacePlace";
import { plural, rupeesShort, shortDate, type ProjectHub } from "@/lib/projects/hub";
import { WorkItems } from "./sections/WorkItems";
import { useSpend, type Spend } from "./sections/expenditure/useSpend";
import type { SectionDef } from "./sections";

const COLORS = { labour: "#378ADD", material: "#BA7517", general: "#888780" };

/**
 * The project at a glance, so someone who knows nothing about it gets the whole picture on one screen:
 *  1. when it runs and whether it is on time;
 *  2. money: what it should cost, what's spent, what's left, what's still to pay, and where it went;
 *  3. work items, in one card: work done against time used, then each item's dates, progress, cost, paid and
 *     left, with Add work item, Update progress and Edit (late items get a red tag);
 *  4. a tile for each of the other sections.
 * Everything comes from what the project already loads; nothing new is saved.
 */
export const Overview = memo(function Overview({
  projectId,
  hub,
  sections,
  onWarm,
}: {
  projectId: string;
  hub: ProjectHub;
  sections: SectionDef[];
  onWarm: (def: SectionDef) => void;
}) {
  const money = useSpend(projectId);
  const p = hub.progress;

  return (
    <div className="space-y-5">
      {/* 1 · when, and is it on time */}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
        <span>{p.start && p.end ? `${shortDate(p.start)} to ${shortDate(p.end)}` : "No dates set yet"}</span>
        {p.daysLeft !== null && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.late ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-700"}`}>
            {p.late ? `${plural(-p.daysLeft, "day")} late` : `${plural(p.daysLeft, "day")} left`}
          </span>
        )}
      </p>

      {/* 2 · money */}
      {money ? <MoneyAtAGlance m={money} /> : <div aria-busy="true" className="h-32 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />}

      {/* 3 · work items: progress and payment together */}
      <WorkItems projectId={projectId} />

      {/* 4 · the other sections */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {sections.map((s) => (
          <SectionTile key={s.key} projectId={projectId} def={s} hub={hub} onWarm={onWarm} />
        ))}
      </ul>
    </div>
  );
});

/* ---------------------------------------- money ---------------------------------------- */

function MoneyAtAGlance({ m }: { m: Spend }) {
  const over = m.left !== null && m.left < 0;
  const parts = [
    { label: "Labour", value: m.labour, color: COLORS.labour },
    { label: "Material", value: m.material, color: COLORS.material },
    { label: "General", value: m.general, color: COLORS.general },
  ];
  const whole = Math.max(m.against ?? 0, m.spent, 1);

  return (
    <section aria-label="Money" className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Box
          label={m.projectCost !== null ? "Project cost" : "BOQ amount"}
          value={m.against !== null ? rupeesShort(m.against) : "Not set"}
          note={m.projectCost !== null ? (m.boqTotal !== null ? `BOQ ${rupeesShort(m.boqTotal)}` : "No BOQ linked") : m.boqTotal !== null ? "No project cost set" : "Set it with Edit"}
        />
        <Box label="Spent" value={rupeesShort(m.spent)} note={m.pct !== null ? `${m.pct}% of ${m.againstName}` : "Labour + material + general"} />
        <Box label={over ? "Over by" : "Left"} value={m.left !== null ? rupeesShort(Math.abs(m.left)) : "–"} tone={m.left === null ? undefined : over ? "text-red-700" : "text-emerald-700"} />
        <Box label="Still to pay" value={rupeesShort(m.labourToPay)} note="to labour contractors" tone={m.labourToPay > 0.5 ? "text-amber-700" : undefined} />
      </dl>

      {/* Where it went, as one bar: labour, material, general, and what's left */}
      <div aria-hidden className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-stone-100">
        {parts.map((p) => (
          <span key={p.label} style={{ width: `${(p.value / whole) * 100}%`, background: p.color }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            {p.label} <b className="font-semibold tabular-nums text-stone-900">{rupeesShort(p.value)}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Box({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-stone-50 px-3 py-2.5">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className={`mt-0.5 truncate text-xl font-semibold tabular-nums ${tone ?? "text-stone-900"}`}>{value}</dd>
      {note && <dd className="truncate text-xs text-stone-500">{note}</dd>}
    </div>
  );
}

/* ------------------------------------- section tiles ------------------------------------- */

function SectionTile({ projectId, def, hub, onWarm }: { projectId: string; def: SectionDef; hub: ProjectHub; onWarm: (def: SectionDef) => void }) {
  const place = { projectId, section: def.key };
  const { text, tone } = def.summary(hub);
  const warm = () => onWarm(def);
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
          <span className={`mt-0.5 block text-xs leading-snug ${tone === "warn" ? "text-amber-700" : tone === "bad" ? "text-red-700" : tone === "good" ? "text-green-700" : "text-stone-500"}`}>
            {text || " "}
          </span>
        </span>
      </a>
    </li>
  );
}