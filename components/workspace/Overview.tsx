"use client";

import { Fragment, memo, useState } from "react";
import { FiChevronDown, FiChevronRight, FiEdit2 } from "react-icons/fi";
import { useCan } from "@/hooks/useProjectAccess";
import { useWorkItems } from "@/hooks/useAttendance";
import { useMaterialPurchases } from "@/hooks/useMaterialPurchases";
import { useEstimates } from "@/hooks/useMaterialEstimates";
import { hrefFor, onPlaceClick } from "@/hooks/useWorkspacePlace";
import { plural, rupees, rupeesShort, shortDate, type ProjectHub } from "@/lib/projects/hub";
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
  // The two breakdowns under the money table, each only for people who may see that section
  const workItems = useWorkItems(projectId, useCan("attendance.view"));
  const purchases = useMaterialPurchases(projectId, useCan("materials.view"));
  // The Material estimate card: the estimates of the Material estimate section (the old BOQs are no longer used here)
  const estimateList = useEstimates(projectId, useCan("boq.use")).data?.estimates;
  const estimate = estimateList ? { count: estimateList.length, total: estimateList.reduce((s, e) => s + e.total, 0) } : null;

  // Labour by work item: attendance marked under each (General last), then contract work on its own line
  const byWork = workItems.data
    ? [
      ...workItems.data.items.filter((w) => w.total > 0).map((w) => ({ label: w.work, value: w.total })),
      ...(workItems.data.general.total > 0 ? [{ label: "General", value: workItems.data.general.total }] : []),
    ]
    : null;
  // Materials against what was ordered (from the estimate or added by hand): value arrived at the planned rate
  const items = purchases.data?.items ?? null;
  const procurement =
    items && items.length > 0
      ? {
        count: items.length,
        full: items.filter((i) => i.state === "all" || i.state === "extra").length,
        ordered: items.reduce((s, i) => s + i.amount, 0),
        arrived: items.reduce((s, i) => s + Math.min(i.arrived, i.quantity) * i.rate, 0),
      }
      : null;
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
      {money ? (
        <MoneyAtAGlance m={money} estimate={estimate} byWork={byWork} procurement={procurement} onEditCost={canEdit ? () => setSettingCost(true) : undefined} />
      ) : <div aria-busy="true" className="h-64 animate-pulse rounded-[22px] bg-[#EFEFED] motion-reduce:animate-none" />}

      {settingCost && money && (
        <EditDetailsDialog
          project={{ id: projectId, title: hub.project.title, firmName: hub.project.firmName, projectCost: money.projectCost, startDate: hub.project.startDate ?? null, endDate: hub.project.endDate ?? null }}
          onClose={() => setSettingCost(false)}
        />
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

/** One colour per money head, the same on the bar, the dot and the share pill */
const HEAD_COLORS = {
  labour: { color: "#D85A30", tint: "#FAECE7", ink: "#712B13" },
  material: { color: "#1D9E75", tint: "#E1F5EE", ink: "#085041" },
  equipment: { color: "#378ADD", tint: "#E6F1FB", ink: "#0C447C" },
  general: { color: "#7F77DD", tint: "#EEEDFE", ink: "#3C3489" },
} as const;

/** How much of the project cost is used: the "Remaining" card and the small meter under "Spent so far" */
const HEALTH = {
  none: { bg: "#111111", ink: "#FFFFFF", soft: "rgba(255,255,255,0.7)", meter: "#8C8C8C" },
  good: { bg: "#EAF3DE", ink: "#27500A", soft: "#3B6D11", meter: "#1D9E75" },
  near: { bg: "#FAEEDA", ink: "#633806", soft: "#854F0B", meter: "#EF9F27" },
  over: { bg: "#FCEBEB", ink: "#791F1F", soft: "#A32D2D", meter: "#E24B4A" },
} as const;

/**
 * The money, plainly: what the client pays (BOQ), our budget (project cost, editable), what has actually been spent
 * and what remains of the budget. Then where the spending went: one bar and a small table, actual spending only.
 * Built from useSpend (GET /spend: attendance, contract work, deliveries, equipment hire, General expenses), the same figures as the
 * Expenditure tab and the project cards; saving attendance, a payment, a delivery or an expense refreshes it.
 */
interface Procurement {
  count: number; // materials on the list
  full: number; // all of it arrived
  ordered: number; // quantity × planned rate, all materials
  arrived: number; // what has arrived, at the planned rate
}

function MoneyAtAGlance({
  m,
  estimate,
  byWork,
  procurement,
  onEditCost,
}: {
  m: Spend;
  /** The Material estimate section's estimates: how many and their total (null: not known or no access) */
  estimate: { count: number; total: number } | null;
  /** Labour attendance by work item, for the Labour row's breakdown (null: not loaded or no access) */
  byWork: { label: string; value: number }[] | null;
  /** Materials arrived against ordered, for the Materials row (null: none yet or no access) */
  procurement: Procurement | null;
  onEditCost?: () => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({ Labour: true, Materials: true });
  const over = m.left !== null && m.left < 0;
  const { labour: L, material: M } = m.parts;
  // Each head says where its figure comes from, in the section's own words, so it can be checked section by section
  const join = (bits: (string | false)[]) => bits.filter(Boolean).join(" + ") || "Nothing yet";
  const heads = [
    {
      label: "Labour",
      hint: join([
        L.attendance > 0 && `Attendance ${rupeesShort(L.attendance)}`,
        L.contract > 0 && `Contract work ${rupeesShort(L.contract)}`,
      ]),
      note: m.labourToPay > 0 ? `${rupeesShort(m.labourToPay)} of it still to pay` : L.paid > 0 ? "All paid" : null,
      value: m.labour,
      ...HEAD_COLORS.labour,
    },
    {
      label: "Materials",
      hint: M.deliveries > 0 ? "Deliveries" : "Nothing yet",
      note: procurement ? `${procurement.full} of ${plural(procurement.count, "material")} fully arrived` : null,
      value: m.material,
      ...HEAD_COLORS.material,
    },
    { label: "Equipment", hint: m.equipment > 0 ? "Hire so far" : "Nothing yet", note: null, value: m.equipment, ...HEAD_COLORS.equipment },
    { label: "General", hint: m.general > 0 ? "General expenses" : "Nothing yet", note: null, value: m.general, ...HEAD_COLORS.general },
  ];
  // Under Labour: each work item's attendance, then contract work
  const labourRows = [...(byWork ?? []), ...(L.contract > 0 ? [{ label: "Contract work", value: L.contract }] : [])];
  // Rows under a head: no lines between them, only one under the last (the table's lines separate the heads)
  const sub = (label: string, value: number, last = false) => (
    <tr key={label} className={last ? "" : "border-0"}>
      <th scope="row" className="py-1 pl-11.5 text-left text-[13px] font-normal text-[#666666]">
        {label}
      </th>
      <td className="py-1 text-right text-[13px] tabular-nums text-[#333333]" title={rupees(value)}>
        {rupeesShort(value)}
      </td>
      <td />
    </tr>
  );
  const labourDetail = byWork && labourRows.length > 0 ? <>{labourRows.map((r, i) => sub(r.label, r.value, i === labourRows.length - 1))}</> : null;
  const arrivedPct = procurement && procurement.ordered > 0 ? Math.min(100, (procurement.arrived / procurement.ordered) * 100) : null;
  const materialsDetail = procurement ? (
    <>
      {sub("Arrived so far", m.material)}
      {sub("Ordered (estimate and added)", procurement.ordered, arrivedPct === null)}
      {arrivedPct !== null && (
        <tr>
          <td colSpan={3} className="pb-2.5 pl-11.5 pt-1">
            <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-[#F1F1EF]">
              <span className="block h-full rounded-full" style={{ width: `${arrivedPct}%`, background: HEAD_COLORS.material.color }} />
            </span>
            <span className="mt-1 block text-xs text-[#666666]">{Math.round(arrivedPct)}% of the ordered materials have arrived</span>
          </td>
        </tr>
      )}
    </>
  ) : null;

  // The bar is the project cost when set (so what remains shows as empty space), otherwise just the spending
  const whole = Math.max(m.projectCost ?? 0, m.spent, 1);
  const share = (v: number) => (m.spent > 0 ? Math.round((v / m.spent) * 100) : 0);
  const ofCost = (v: number) => (m.projectCost ? `${Math.round((v / m.projectCost) * 100)}% of project cost` : "");
  // Budget health: green below 80% of the project cost, amber from 80%, red once over it; grey when no cost is set
  const usedPct = m.projectCost ? (m.spent / m.projectCost) * 100 : null;
  const health = usedPct === null ? HEALTH.none : over ? HEALTH.over : usedPct >= 80 ? HEALTH.near : HEALTH.good;

  return (
    <section aria-label="Money" className="space-y-3">
      <dl className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Box
          label="Material estimate"
          value={estimate && estimate.count > 0 ? rupeesShort(estimate.total) : "No estimate"}
          note={estimate && estimate.count > 0 ? `From ${plural(estimate.count, "estimate")}` : "Make one in Material estimate"}
          muted={!estimate || estimate.count === 0}
        />
        <CostBox cost={m.projectCost} onEdit={onEditCost} />
        <div className="min-w-0 rounded-2xl border border-[#E8E8E6] bg-white px-4 py-3">
          <dt className="text-xs text-[#666666]">Spent so far</dt>
          <dd title={rupees(m.spent)} className="mt-0.5 truncate text-xl font-semibold tabular-nums tracking-[-0.01em] text-[#111111]">
            {rupeesShort(m.spent)}
          </dd>
          {usedPct !== null && (
            <dd aria-hidden className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#F1F1EF]">
              <span className="block h-full rounded-full" style={{ width: `${Math.min(100, usedPct)}%`, background: health.meter }} />
            </dd>
          )}
          <dd className="mt-0.5 truncate text-xs text-[#666666]">{ofCost(m.spent) || "Labour + materials + equipment + general"}</dd>
        </div>
        <div className="min-w-0 rounded-2xl px-4 py-3" style={{ background: health.bg, color: health.ink }}>
          <dt className="text-xs" style={{ color: health.soft }}>
            {over ? "Over the project cost" : "Remaining project amount"}
          </dt>
          <dd className="mt-0.5 truncate text-xl font-semibold tabular-nums tracking-[-0.01em]">{m.left !== null ? rupeesShort(Math.abs(m.left)) : "–"}</dd>
          <dd className="truncate text-xs" style={{ color: health.soft }}>
            {m.left === null ? "Set the project cost first" : over ? "spent above the budget" : `${ofCost(m.left)} left`}
          </dd>
        </div>
      </dl>

      <div className="rounded-[22px] border border-[#E8E8E6] bg-white p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-[#111111]">Where the money went</h2>
          <span className="text-sm tabular-nums text-[#666666]">{rupeesShort(m.spent)} spent</span>
        </div>
        <div aria-hidden className="mt-3 flex h-3 overflow-hidden rounded-full bg-[#F1F1EF]">
          {heads.map((h) => (
            <span
              key={h.label}
              className="border-r-2 border-white last:border-r-0"
              style={{ width: `${(h.value / whole) * 100}%`, minWidth: h.value > 0 ? 4 : 0, background: h.color, display: h.value > 0 ? undefined : "none" }}
            />
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
            {heads.map((h) => {
              // Labour opens to its work items, Materials to arrived vs ordered; the others have nothing under them
              const detail = h.label === "Labour" ? labourDetail : h.label === "Materials" ? materialsDetail : null;
              const isOpen = !!detail && !!open[h.label];
              const name = (
                <span className="flex items-center gap-2">
                  {detail ? (
                    isOpen ? <FiChevronDown aria-hidden className="shrink-0 text-[#8C8C8C]" /> : <FiChevronRight aria-hidden className="shrink-0 text-[#8C8C8C]" />
                  ) : (
                    <span aria-hidden className="w-3.5 shrink-0" />
                  )}
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: h.value > 0 ? h.color : "#D3D1C7" }} />
                  <span className="min-w-0">
                    <span className="block font-medium text-[#111111]">{h.label}</span>
                    <span className="block text-xs text-[#8C8C8C]">{h.hint}</span>
                    {h.note && <span className="block text-xs font-medium text-[#666666]">{h.note}</span>}
                  </span>
                </span>
              );
              return (
                <Fragment key={h.label}>
                  <tr className={isOpen ? "border-0" : ""}>
                    <th scope="row" className="py-2.5 text-left font-normal">
                      {detail ? (
                        <button
                          type="button"
                          onClick={() => setOpen((o) => ({ ...o, [h.label]: !isOpen }))}
                          aria-expanded={isOpen}
                          className="w-full rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
                        >
                          {name}
                        </button>
                      ) : (
                        name
                      )}
                    </th>
                    <td className="py-2.5 text-right align-top font-semibold tabular-nums text-[#111111]" title={rupees(h.value)}>
                      {rupeesShort(h.value)}
                    </td>
                    <td className="py-2.5 text-right align-top">
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-xs font-medium tabular-nums"
                        style={h.value > 0 ? { background: h.tint, color: h.ink } : { background: "#F1F1EF", color: "#8C8C8C" }}
                      >
                        {share(h.value)}%
                      </span>
                    </td>
                  </tr>
                  {isOpen && detail}
                </Fragment>
              );
            })}
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

function Box({ label, value, note, muted, title }: { label: string; value: string; note?: string; muted?: boolean; title?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#E8E8E6] bg-white px-4 py-3">
      <dt className="text-xs text-[#666666]">{label}</dt>
      <dd title={title} className={`mt-0.5 truncate text-xl font-semibold tabular-nums tracking-[-0.01em] ${muted ? "text-[#8C8C8C]" : "text-[#111111]"}`}>{value}</dd>
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