"use client";

import { memo, useState } from "react";
import { FiChevronRight, FiEdit2 } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { hrefFor, onPlaceClick } from "@/hooks/useWorkspacePlace";
import { plural, rupeesShort, shortDate, type ProjectHub } from "@/lib/projects/hub";
import { EditDetailsDialog } from "./EditDetailsDialog";
import { useSpend, type Spend } from "./sections/expenditure/useSpend";
import type { SectionDef } from "./sections";


/**
 * The project at a glance, so someone who knows nothing about it gets the whole picture on one screen:
 *  1. when it runs and whether it is on time;
 *  2. money: what it should cost, what's spent, what's left, what's still to pay, and where it went;
 *  3. a tile for each of the other sections. (Work items are added and their rates compared in Labour › Rate comparison.)
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
        {p.end && p.daysLeft !== null && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.late ? "bg-[#FCEDEC] text-[#B3261E]" : "bg-[#F1F1EF] text-[#333333]"}`}>
            {p.late ? `${monthsDays(p.end)} late` : `${monthsDays(p.end)} left`}
          </span>
        )}
      </p>

      {/* 2 · money */}
      {money ? <MoneyAtAGlance m={money} onEditCost={canEdit ? () => setSettingCost(true) : undefined} /> : <div aria-busy="true" className="h-64 animate-pulse rounded-[22px] bg-[#EFEFED] motion-reduce:animate-none" />}

      {settingCost && money && (
        <EditDetailsDialog project={{ id: projectId, title: hub.project.title, firmName: hub.project.firmName, projectCost: money.projectCost }} onClose={() => setSettingCost(false)} />
      )}

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

/**
 * The money, plainly: what the client pays (BOQ), our budget (project cost, editable), what has actually been spent
 * and what remains of the budget. Then where the spending went: one bar and a small table, actual spending only.
 * Built from useSpend, the same figures as the Expenditure tab; saving a payment, delivery or expense refreshes it.
 */
function MoneyAtAGlance({ m, onEditCost }: { m: Spend; onEditCost?: () => void }) {
  const over = m.left !== null && m.left < 0;
  const heads = [
    { label: "Labour", hint: "Attendance, contract work, labour payments", value: m.labour, color: "#111111" },
    { label: "Materials", hint: "Deliveries and material expenses", value: m.material, color: "#8C8C8C" },
    { label: "General", hint: "General expenses", value: m.general, color: "#D3D1C7" },
  ];
  // The bar is the project cost when set (so what remains shows as empty space), otherwise just the spending
  const whole = Math.max(m.projectCost ?? 0, m.spent, 1);
  const share = (v: number) => (m.spent > 0 ? Math.round((v / m.spent) * 100) : 0);
  const ofCost = (v: number) => (m.projectCost ? `${Math.round((v / m.projectCost) * 100)}% of project cost` : "");

  return (
    <section aria-label="Money" className="space-y-3">
      <dl className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Box label="BOQ amount" value={m.boqTotal !== null ? rupeesShort(m.boqTotal) : "No BOQ"} note="What the client pays" muted={m.boqTotal === null} />
        <CostBox cost={m.projectCost} onEdit={onEditCost} />
        <Box label="Spent so far" value={rupeesShort(m.spent)} note={ofCost(m.spent) || "Labour + materials + general"} />
        <div className={`min-w-0 rounded-2xl px-4 py-3 text-white ${over ? "bg-[#B3261E]" : "bg-[#111111]"}`}>
          <dt className="text-xs text-white/70">{over ? "Over the project cost" : "Remaining project amount"}</dt>
          <dd className="mt-0.5 truncate text-xl font-semibold tabular-nums tracking-[-0.01em]">{m.left !== null ? rupeesShort(Math.abs(m.left)) : "–"}</dd>
          <dd className="truncate text-xs text-white/70">{m.left === null ? "Set the project cost first" : over ? "spent above the budget" : ofCost(m.left)}</dd>
        </div>
      </dl>

      <div className="rounded-[22px] border border-[#E8E8E6] bg-white p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-[#111111]">Where the money went</h2>
          <span className="text-sm tabular-nums text-[#666666]">{rupeesShort(m.spent)} spent</span>
        </div>
        <div aria-hidden className="mt-3 flex h-3 overflow-hidden rounded-full bg-[#F1F1EF]">
          {heads.map((h) => (
            <span key={h.label} style={{ width: `${(h.value / whole) * 100}%`, background: h.color }} />
          ))}
        </div>
        {m.projectCost !== null && !over && <p className="mt-1.5 text-right text-xs text-[#8C8C8C]">Empty part: {rupeesShort(m.left ?? 0)} of the project cost not spent yet</p>}

        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-[#EFEFED] text-xs text-[#666666]">
              <th scope="col" className="py-2 text-left font-medium">
                Head
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Spent
              </th>
              <th scope="col" className="w-20 py-2 text-right font-medium">
                Share
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFEFED]">
            {heads.map((h) => (
              <tr key={h.label}>
                <th scope="row" className="py-2.5 text-left font-normal">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm border border-[#E8E8E6]" style={{ background: h.color }} />
                    <span className="min-w-0">
                      <span className="block font-medium text-[#111111]">{h.label}</span>
                      <span className="block truncate text-xs text-[#8C8C8C]">{h.hint}</span>
                    </span>
                  </span>
                </th>
                <td className="py-2.5 text-right font-semibold tabular-nums text-[#111111]">{rupeesShort(h.value)}</td>
                <td className="py-2.5 text-right tabular-nums text-[#666666]">{share(h.value)}%</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="py-2.5 text-left font-semibold text-[#111111]">
                Total
              </th>
              <td className="py-2.5 text-right font-semibold tabular-nums text-[#111111]">{rupeesShort(m.spent)}</td>
              <td className="py-2.5 text-right tabular-nums text-[#666666]">{m.spent > 0 ? "100%" : "–"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** "4 months 12 days" from today to the end date (or since it, when late) */
function monthsDays(end: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, mo, d] = end.split("-").map(Number);
  let a = today;
  let b = new Date(y!, mo! - 1, d!);
  if (b < a) [a, b] = [b, a];
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (new Date(a.getFullYear(), a.getMonth() + months, a.getDate()) > b) months--;
  const from = new Date(a.getFullYear(), a.getMonth() + months, a.getDate());
  const days = Math.round((b.getTime() - from.getTime()) / 86_400_000);
  return [months ? plural(months, "month") : "", days || !months ? plural(days, "day") : ""].filter(Boolean).join(" ");
}

/** The project cost: our own budget for the job. Tap it to set or change it. */
function CostBox({ cost, onEdit }: { cost: number | null; onEdit?: () => void }) {
  if (!onEdit) return <Box label="Project cost" value={cost !== null ? rupeesShort(cost) : "Not set"} note="Our budget for the job" muted={cost === null} />;
  return (
    <div className="min-w-0">
      <dt className="sr-only">Project cost</dt>
      <dd className="h-full">
        <button
          type="button"
          onClick={onEdit}
          aria-label={cost !== null ? `Project cost ${rupeesShort(cost)}. Change it` : "Set the project cost"}
          className={`group h-full w-full rounded-2xl bg-white px-4 py-3 text-left transition-colors hover:border-[#111111] ${cost === null ? "border-2 border-dashed border-[#DADAD7]" : "border border-[#E8E8E6]"}`}
        >
          <span className="flex items-center justify-between gap-2 text-xs text-[#666666]">
            Project cost <FiEdit2 aria-hidden className="shrink-0 text-[#8C8C8C] group-hover:text-[#111111]" />
          </span>
          <span className={`mt-0.5 block truncate text-xl font-semibold tabular-nums tracking-[-0.01em] ${cost === null ? "text-[#8C8C8C]" : "text-[#111111]"}`}>{cost !== null ? rupeesShort(cost) : "+ Set"}</span>
          <span className="block truncate text-xs text-[#666666]">Our budget for the job</span>
        </button>
      </dd>
    </div>
  );
}

function Box({ label, value, note, muted }: { label: string; value: string; note?: string; muted?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#E8E8E6] bg-white px-4 py-3">
      <dt className="text-xs text-[#666666]">{label}</dt>
      <dd className={`mt-0.5 truncate text-xl font-semibold tabular-nums tracking-[-0.01em] ${muted ? "text-[#8C8C8C]" : "text-[#111111]"}`}>{value}</dd>
      {note && <dd className="truncate text-xs text-[#666666]">{note}</dd>}
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
        className="group flex h-full min-h-28 flex-col justify-between gap-3 rounded-[22px] border border-[#E8E8E6] bg-white p-4 shadow-[0_1px_2px_rgba(17,17,17,0.04)] transition-colors duration-180 hover:border-[#111111] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#111111] active:bg-[#FAFAF9] motion-reduce:transition-none sm:p-5"
      >
        <span className="flex items-center justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1F1EF] text-xl text-[#111111]">
            <def.Icon aria-hidden />
          </span>
          <FiChevronRight aria-hidden className="text-[#B5B5B2] transition-colors group-hover:text-[#111111]" />
        </span>
        <span>
          <span className="block text-[15px] font-semibold text-[#111111]">{def.label}</span>
          <span className={`mt-0.5 block text-xs leading-snug ${tone === "warn" ? "text-[#8A5A00]" : tone === "bad" ? "text-[#B3261E]" : tone === "good" ? "text-[#1A6B3C]" : "text-[#666666]"}`}>
            {text || " "}
          </span>
        </span>
      </a>
    </li>
  );
}