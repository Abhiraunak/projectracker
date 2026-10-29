"use client";

import { memo, useMemo, useState } from "react";
import type { AdminOverview } from "@/lib/dashboard/types";
import { inrShort, shortDate } from "@/lib/dashboard/format";

const W = 640;
const H = 210;
const LEFT = 48;
const BOTTOM = 184;
const TOP = 14;

/** A round axis top (1, 2, 2.5, 5 × 10ⁿ) just above the highest value */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value) ?? 10;
  return step * power;
}

/** Materials received and labour paid per week / month / quarter, with the total and a hover read-out */
export const SpendChart = memo(function SpendChart({ data }: { data: AdminOverview }) {
  const points = data.trend;
  const [hover, setHover] = useState<number | null>(null);

  const chart = useMemo(() => {
    const max = niceMax(Math.max(...points.map((p) => Math.max(p.materials, p.labour)), 0));
    const x = (i: number) => LEFT + (points.length > 1 ? (i * (W - LEFT - 4)) / (points.length - 1) : 0);
    const y = (v: number) => BOTTOM - (v / max) * (BOTTOM - TOP);
    const line = (key: "materials" | "labour") => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(" ");
    const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: y(max * f), label: inrShort(max * f) }));
    return { x, y, materials: line("materials"), labour: line("labour"), area: `${line("materials")} L${x(points.length - 1)} ${BOTTOM} L${LEFT} ${BOTTOM} Z`, grid };
  }, [points]);

  const totalMaterials = points.reduce((s, p) => s + p.materials, 0);
  const totalLabour = points.reduce((s, p) => s + p.labour, 0);
  const active = hover ?? points.length - 1;
  const point = points[active];
  const unit = data.period === "week" ? "weeks" : data.period === "month" ? "months" : "quarters";

  if (points.length === 0) return null;

  return (
    <section aria-label="Spending trend" className="flex min-w-0 flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-xs text-stone-500">Spending, last {points.length} {unit}</p>
          <p className="text-2xl font-semibold tabular-nums">{inrShort(totalMaterials + totalLabour)}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-stone-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-stone-900" /> Materials {inrShort(totalMaterials)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-600" /> Labour {inrShort(totalLabour)}
          </span>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden onMouseLeave={() => setHover(null)}>
          {chart.grid.map((g) => (
            <g key={g.y}>
              <line x1={LEFT} x2={W - 4} y1={g.y} y2={g.y} stroke="#efeee9" />
              <text x={0} y={g.y + 4} fontSize={11} fill="#78716c">
                {g.label}
              </text>
            </g>
          ))}
          <path d={chart.area} fill="#1c1917" fillOpacity={0.05} />
          <path d={chart.materials} fill="none" stroke="#1c1917" strokeWidth={2.2} />
          <path d={chart.labour} fill="none" stroke="#ea580c" strokeWidth={2.2} />
          <line x1={chart.x(active)} x2={chart.x(active)} y1={TOP} y2={BOTTOM} stroke="#a8a29e" strokeDasharray="3 3" />
          <circle cx={chart.x(active)} cy={chart.y(point!.materials)} r={4.5} fill="#fff" stroke="#1c1917" strokeWidth={2} />
          <circle cx={chart.x(active)} cy={chart.y(point!.labour)} r={4.5} fill="#fff" stroke="#ea580c" strokeWidth={2} />
          {/* One invisible strip per bucket, so pointing anywhere near it shows its figures */}
          {points.map((p, i) => (
            <rect
              key={p.from}
              x={chart.x(i) - (W - LEFT) / points.length / 2}
              y={0}
              width={(W - LEFT) / points.length}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute right-2 top-0 rounded-lg bg-stone-900 px-3 py-2 text-xs text-white shadow">
          <p className="text-stone-300">From {shortDate(point!.from)}</p>
          <p className="tabular-nums">Materials {inrShort(point!.materials)}</p>
          <p className="tabular-nums">Labour {inrShort(point!.labour)}</p>
        </div>
      </div>

      <div className="flex justify-between pl-12 text-[11px] text-stone-500">
        {points
          .filter((_, i) => i % Math.ceil(points.length / 6) === 0 || i === points.length - 1)
          .map((p) => (
            <span key={p.from}>{shortDate(p.from)}</span>
          ))}
      </div>

      {/* The same figures as a table, for screen readers */}
      <table className="sr-only">
        <caption>Spending per {data.period === "week" ? "week" : data.period === "month" ? "30 days" : "90 days"}</caption>
        <thead>
          <tr>
            <th>From</th>
            <th>Materials</th>
            <th>Labour</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.from}>
              <td>{shortDate(p.from)}</td>
              <td>{inrShort(p.materials)}</td>
              <td>{inrShort(p.labour)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
});