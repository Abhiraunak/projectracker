"use client";

import { memo, useState, type PointerEvent as ReactPointerEvent } from "react";

export interface RadarSeries {
  key: string;
  label: string;
  color: string;
  values: number[]; // one per axis, in axis order
}

const SIZE = 340;
const C = SIZE / 2;
const R = 118; // the outer ring
const RINGS = [0.25, 0.5, 0.75, 1];

/**
 * A radar like the reference: one corner per category, dotted rings, and a filled shape per series.
 * Values are drawn on a square-root scale, so lakhs of labour and a few thousand of tea expenses can sit on one chart
 * and every corner stays visible; the figures shown are always the real amounts.
 * Pointing at (or tapping) a corner shows its figures.
 */
export const RadarChart = memo(function RadarChart({ axes, series, format }: { axes: string[]; series: RadarSeries[]; format: (n: number) => string }) {
  const [active, setActive] = useState<number | null>(null);
  // A mouse shows the figures while pointing; a finger taps to show them and taps again to hide them.
  // (A tap also fires "pointer enter", so a plain toggle on click would hide them straight away.)
  const pointTo = (i: number) => ({
    onPointerEnter: (e: ReactPointerEvent) => e.pointerType === "mouse" && setActive(i),
    onPointerLeave: (e: ReactPointerEvent) => e.pointerType === "mouse" && setActive(null),
    onPointerUp: (e: ReactPointerEvent) => e.pointerType !== "mouse" && setActive((v) => (v === i ? null : i)),
  });
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
  const at = (i: number, r: number) => [C + r * Math.cos(angle(i)), C + r * Math.sin(angle(i))] as const;
  const radius = (v: number) => Math.sqrt(Math.max(0, v) / max) * R;
  const ring = (f: number) => axes.map((_, i) => at(i, R * f).join(",")).join(" ");

  return (
    <div className="relative mx-auto w-full max-w-md">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full select-none" role="img" aria-label="Spent and paid out, by category">
        {RINGS.map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke="#e7e5e4" strokeDasharray="3 4" />
        ))}
        {axes.map((_, i) => {
          const [x, y] = at(i, R);
          return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="#e7e5e4" strokeDasharray="3 4" />;
        })}

        {series.map((s) => (
          <polygon
            key={s.key}
            points={s.values.map((v, i) => at(i, radius(v)).join(",")).join(" ")}
            fill={s.color}
            fillOpacity={0.14}
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}
        {series.map((s) =>
          s.values.map((v, i) => {
            const [x, y] = at(i, radius(v));
            return <circle key={`${s.key}${i}`} cx={x} cy={y} r={active === i ? 5.5 : 4} fill="#fff" stroke={s.color} strokeWidth={2} />;
          })
        )}

        {axes.map((a, i) => {
          const [x, y] = at(i, R + 22);
          const [cx, cy] = at(i, R);
          const anchor = Math.abs(x - C) < 8 ? "middle" : x > C ? "start" : "end";
          return (
            <g key={a} {...pointTo(i)} className="cursor-default">
              {/* A generous invisible target, so a finger can tap the corner */}
              <circle cx={cx} cy={cy} r={26} fill="transparent" />
              <text x={x} y={y + 4} textAnchor={anchor} className={`text-[12px] ${active === i ? "fill-stone-900 font-semibold" : "fill-stone-600"}`}>
                {a}
              </text>
            </g>
          );
        })}
      </svg>

      {active !== null && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-md">
          <p className="font-semibold text-stone-900">{axes[active]}</p>
          {series.map((s) => (
            <p key={s.key} className="mt-0.5 whitespace-nowrap tabular-nums text-stone-700">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
              {s.label} {format(s.values[active] ?? 0)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
});