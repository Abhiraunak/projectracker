"use client";

import { memo, useState } from "react";
import { FiChevronRight, FiEdit2 } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { hrefFor, onPlaceClick } from "@/hooks/useWorkspacePlace";
import { plural, rupeesShort, shortDate, type ProjectHub } from "@/lib/projects/hub";
import { EditDetailsDialog } from "./EditDetailsDialog";
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
  const canEdit = useCan("project.manage");
  const [settingCost, setSettingCost] = useState(false);

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
      {money ? <MoneyAtAGlance m={money} onEditCost={canEdit ? () => setSettingCost(true) : undefined} /> : <div aria-busy="true" className="h-32 animate-pulse rounded-xl bg-stone-100 motion-reduce:animate-none" />}

      {settingCost && money && (
        <EditDetailsDialog project={{ id: projectId, title: hub.project.title, firmName: hub.project.firmName, projectCost: money.projectCost }} onClose={() => setSettingCost(false)} />
      )}

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

function MoneyAtAGlance({ m, onEditCost }: { m: Spend; onEditCost?: () => void }) {
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
        <CostBox cost={m.projectCost} onEdit={onEditCost} />
        <Box label="Spent" value={rupeesShort(m.spent)} note={m.pct !== null ? `${m.pct}% of the project cost` : "Labour + material + general"} />
        <Box label={over ? "Over by" : "Left"} value={m.left !== null ? rupeesShort(Math.abs(m.left)) : "–"} note={m.left === null ? "Needs the project cost" : over ? "over the project cost" : "of the project cost"} tone={m.left === null ? undefined : over ? "text-red-700" : "text-emerald-700"} />
        <Box label="BOQ amount" value={m.boqTotal !== null ? rupeesShort(m.boqTotal) : "No BOQ"} note="What the client sees" tone={m.boqTotal === null ? "text-stone-400" : undefined} />
      </dl>

      {/* Where it went, as one bar: labour, material, general, and what's left */}
      <div aria-hidden className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-stone-100">
        {parts.map((p) => (
          <span key={p.label} style={{ width: `${(p.value / whole) * 100}%`, background: p.color }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            {p.label} <b className="font-semibold tabular-nums text-stone-900">{rupeesShort(p.value)}</b>
          </li>
        ))}
        {m.labourToPay > 0.5 && (
          <li className="font-medium text-amber-700 sm:ml-auto">
            {rupeesShort(m.labourToPay)} still to pay to labour contractors
          </li>
        )}
      </ul>
    </section>
  );
}

/** The project cost: our own cost for the job. Tap it (or "Set project cost") to set or change it. */
function CostBox({ cost, onEdit }: { cost: number | null; onEdit?: () => void }) {
  if (!onEdit) return <Box label="Project cost" value={cost !== null ? rupeesShort(cost) : "Not set"} note="Our cost for the job" tone={cost === null ? "text-stone-400" : undefined} />;
  if (cost === null)
    return (
      <div className="min-w-0">
        <dt className="sr-only">Project cost</dt>
        <dd className="h-full">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-full min-h-21 w-full flex-col items-start justify-center rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 px-3 py-2.5 text-left hover:border-orange-400"
          >
            <span className="text-sm font-semibold text-orange-800">+ Set project cost</span>
            <span className="text-xs text-orange-700">Our cost for the job</span>
          </button>
        </dd>
      </div>
    );
  return (
    <div className="min-w-0">
      <dt className="sr-only">Project cost</dt>
      <dd className="h-full">
        <button type="button" onClick={onEdit} aria-label={`Project cost ${rupeesShort(cost)}. Change it`} className="group h-full w-full rounded-lg bg-stone-50 px-3 py-2.5 text-left hover:bg-stone-100">
          <span className="flex items-center justify-between gap-2 text-xs text-stone-500">
            Project cost <FiEdit2 aria-hidden className="shrink-0 text-stone-400 group-hover:text-stone-700" />
          </span>
          <span className="mt-0.5 block truncate text-xl font-semibold tabular-nums text-stone-900">{rupeesShort(cost)}</span>
          <span className="block truncate text-xs text-stone-500">Our cost for the job</span>
        </button>
      </dd>
    </div>
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