"use client";

import { memo, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { monthLabel, type Series } from "@/lib/inventory/materialsTab";

export const RECEIVED_COLOR = "#047857"; // green
export const ISSUED_COLOR = "#be123c"; // red

/** A round top for the axis: 0–37,000 becomes 0–40,000 */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

const H = 220; // fixed height; the width follows the card, so text stays the same size on a phone and a desktop
const TOP = 10;
const BOTTOM = 26; // room for the month names
const LEFT = 48; // room for the axis figures

/** The element's width in pixels, kept up to date */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/**
 * Received (green) and issued (red) side by side for each month, like the reference chart. Pointing at a month
 * (or tapping it on a phone) shows its two figures. `format` writes a figure: rupees, or a quantity with its unit.
 */
export const BarChart = memo(function BarChart({ months, series, format, axis }: { months: string[]; series: Series; format: (n: number) => string; axis: (n: number) => string }) {
  const [active, setActive] = useState<number | null>(null);
  // A mouse shows the figures while pointing; a finger taps to show them and taps again to hide them.
  // (A tap also fires "pointer enter", so a plain toggle on click would hide them straight away.)
  const pointTo = (i: number) => ({
    onPointerEnter: (e: ReactPointerEvent) => e.pointerType === "mouse" && setActive(i),
    onPointerLeave: (e: ReactPointerEvent) => e.pointerType === "mouse" && setActive(null),
    onPointerUp: (e: ReactPointerEvent) => e.pointerType !== "mouse" && setActive((v) => (v === i ? null : i)),
  });
  const { ref, width: W } = useWidth<HTMLDivElement>();
  const top = niceMax(Math.max(0, ...series.received, ...series.issued));
  const plotH = H - TOP - BOTTOM;
  const slot = (W - LEFT) / months.length;
  const bar = Math.max(4, Math.min(18, slot * 0.3));
  // Narrow screens: one letter a month (J F M…); the tooltip still gives the full month
  const y = (v: number) => TOP + plotH - (v / top) * plotH;
  const crossesYear = months.length > 0 && months[0]!.slice(0, 4) !== months[months.length - 1]!.slice(0, 4);
  const empty = series.received.every((v) => v === 0) && series.issued.every((v) => v === 0);
  const a = active;

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full select-none" role="img" aria-label="Received and issued by month">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={LEFT} x2={W} y1={y(top * f)} y2={y(top * f)} stroke={f === 0 ? "#d6d3d1" : "#e7e5e4"} strokeDasharray={f === 0 ? undefined : "3 4"} />
            <text x={LEFT - 6} y={y(top * f) + 4} textAnchor="end" className="fill-stone-400 text-[10px] tabular-nums">
              {axis(top * f)}
            </text>
          </g>
        ))}
        {months.map((m, i) => {
          const x = LEFT + i * slot + slot / 2;
          const r = series.received[i] ?? 0;
          const s = series.issued[i] ?? 0;
          const dim = a !== null && a !== i;
          const full = monthLabel(m, crossesYear && (i === 0 || m.endsWith("-01")) && slot >= 46);
          const label = slot >= 30 ? full : full.slice(0, 1);
          return (
            <g key={m} {...pointTo(i)} className="cursor-default">
              <title>{`${monthLabel(m, true)}: received ${format(r)}, issued ${format(s)}`}</title>
              <rect x={LEFT + i * slot} y={TOP} width={slot} height={plotH + BOTTOM} fill={a === i ? "#fafaf9" : "transparent"} />
              {r > 0 && <rect x={x - bar - 1.5} y={y(r)} width={bar} height={Math.max(1, TOP + plotH - y(r))} rx={3} fill={RECEIVED_COLOR} opacity={dim ? 0.35 : 1} />}
              {s > 0 && <rect x={x + 1.5} y={y(s)} width={bar} height={Math.max(1, TOP + plotH - y(s))} rx={3} fill={ISSUED_COLOR} opacity={dim ? 0.35 : 1} />}
              <text x={x} y={H - 8} textAnchor="middle" className={`text-[11px] ${a === i ? "fill-stone-900 font-semibold" : "fill-stone-500"}`}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {empty && <p className="absolute inset-x-0 top-1/3 text-center text-sm text-stone-500">Nothing received or issued in the last 12 months yet.</p>}

      {a !== null && !empty && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{ left: `${Math.min(84, Math.max(16, ((LEFT + a * slot + slot / 2) / W) * 100))}%` }} // stays inside the card at either end
        >
          <p className="font-semibold text-stone-900">{monthLabel(months[a]!, true)}</p>
          <p className="mt-0.5 whitespace-nowrap tabular-nums text-stone-700">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: RECEIVED_COLOR }} />
            Received {format(series.received[a] ?? 0)}
          </p>
          <p className="whitespace-nowrap tabular-nums text-stone-700">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: ISSUED_COLOR }} />
            Issued {format(series.issued[a] ?? 0)}
          </p>
        </div>
      )}
    </div>
  );
});

export function Legend() {
  return (
    <div className="flex gap-4 text-xs text-stone-600">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: RECEIVED_COLOR }} /> Received
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: ISSUED_COLOR }} /> Issued
      </span>
    </div>
  );
}