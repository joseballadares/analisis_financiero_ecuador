"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Events, XLabels, niceStep, regression, type ChartEvent } from "@/components/charts";
import { formatCompactMoney, formatMoney, formatNumber, formatPercent } from "@/lib/format";

export type Unit = "money" | "percent" | "ratio" | "days";
export type LSeries = { name: string; color: string; values: (number | null)[]; unit?: Unit };

const isNum = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

function fmtTick(unit: Unit, v: number, step: number): string {
  if (unit === "money") return formatCompactMoney(v);
  if (unit === "percent") return formatPercent(v, step * 100 < 1 ? 1 : 0);
  if (unit === "ratio") return formatNumber(v, step < 0.1 ? 2 : 1);
  return `${formatNumber(v, 0)} d`;
}

function fmtShort(unit: Unit, v: number): string {
  if (unit === "money") return formatCompactMoney(v);
  if (unit === "percent") return formatPercent(v, 1);
  if (unit === "ratio") return formatNumber(v, 2);
  return `${formatNumber(v, 0)} d`;
}

function fmtFull(unit: Unit, v: number): string {
  if (unit === "money") return formatMoney(v);
  if (unit === "percent") return formatPercent(v, 1);
  if (unit === "ratio") return formatNumber(v, 2);
  return `${formatNumber(v, 0)} días`;
}

// Cambio frente al año anterior: relativo en dinero, absoluto (pp, veces o días) en el resto.
function fmtDelta(unit: Unit, cur: number, prev: number): string | null {
  const sign = (d: number) => (d > 0 ? "+" : d < 0 ? "−" : "");
  if (unit === "money") {
    if (prev === 0) return null;
    const d = (cur - prev) / Math.abs(prev);
    return `${sign(d)}${formatPercent(Math.abs(d), 1)}`;
  }
  const d = cur - prev;
  if (unit === "percent") return `${sign(d)}${formatNumber(Math.abs(d) * 100, 1)} pp`;
  if (unit === "ratio") return `${sign(d)}${formatNumber(Math.abs(d), 2)}`;
  return `${sign(d)}${formatNumber(Math.abs(d), 0)} d`;
}

// Escala ajustada a los datos (incluye el cero cuando los valores están cerca de él o lo cruzan).
function lineScale(values: (number | null)[]) {
  const nums = values.filter(isNum);
  if (nums.length === 0) return { min: 0, max: 1, step: 1, ticks: [0, 1] };
  let lo = Math.min(...nums);
  let hi = Math.max(...nums);
  if (hi - lo === 0) {
    const d = Math.abs(hi) * 0.1 || 1;
    lo -= d;
    hi += d;
  }
  if (lo >= 0 && lo <= hi * 0.4) lo = 0;
  else if (hi <= 0 && hi >= lo * 0.4) hi = 0;
  else {
    const pad = (hi - lo) * 0.12;
    const wasPositive = lo >= 0;
    const wasNegative = hi <= 0;
    lo -= pad;
    hi += pad;
    if (wasPositive && lo < 0) lo = 0;
    if (wasNegative && hi > 0) hi = 0;
  }
  const step = niceStep(hi - lo, 3);
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v / step) * step);
  return { min, max, step, ticks };
}

// Gráfico de líneas interactivo: un punto por año; al pasar el cursor (o tocar) aparece un cuadro flotante con
// el valor de cada serie y su cambio frente al año anterior. Con `stacked`, cada serie usa su propia escala en una
// franja aparte (útil cuando las magnitudes son muy distintas, como ingresos y utilidad neta).
export default function LineInteractive({
  categories,
  series,
  unit,
  stacked = false,
  events,
  trend = false,
}: {
  categories: string[];
  series: LSeries[];
  unit: Unit;
  stacked?: boolean;
  events?: ChartEvent[];
  trend?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [vw, setVw] = useState(480);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setVw(Math.max(260, Math.round(el.clientWidth)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = categories.length;
  const narrow = vw < 400;
  const PAD = { l: narrow ? 46 : 54, r: 18, t: stacked ? 34 : 26, b: 28 };
  const panels: LSeries[][] = stacked ? series.map((s) => [s]) : [series];
  const panelH = stacked ? (narrow ? 108 : 120) : narrow ? 170 : 190;
  const gap = stacked ? 38 : 0;
  const vh = PAD.t + panels.length * panelH + (panels.length - 1) * gap + PAD.b;
  const iw = vw - PAD.l - PAD.r;
  const step = n > 1 ? (iw - 16) / (n - 1) : 0;
  const x = (i: number) => PAD.l + 8 + (n > 1 ? step * i : (iw - 16) / 2);

  function pick(e: ReactPointerEvent<SVGSVGElement>) {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || n === 0) return;
    const px = ((e.clientX - r.left) * vw) / r.width;
    const i = step > 0 ? Math.round((px - PAD.l - 8) / step) : 0;
    setHover(Math.min(Math.max(i, 0), n - 1));
  }

  const tipLeft = hover === null ? 0 : Math.min(Math.max(x(hover), 92), vw - 92);
  const hoverEvent = hover === null ? undefined : events?.find((ev) => String(ev.year) === categories[hover]);

  return (
    <div ref={boxRef} className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${vw} ${vh}`}
        width={vw}
        height={vh}
        className="block w-full"
        role="img"
        style={{ touchAction: "pan-y" }}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setHover(null);
        }}
      >
        {panels.map((ps, pi) => {
          const yTop = PAD.t + pi * (panelH + gap);
          const yBot = yTop + panelH;
          const sc = lineScale(ps.flatMap((s) => s.values));
          const y = (v: number) => yBot - ((v - sc.min) / (sc.max - sc.min)) * panelH;
          const pu = ps[0].unit ?? unit;
          return (
            <g key={pi}>
              {stacked && (
                <text x={PAD.l} y={yTop - 12} fontSize="11" fontWeight="600" style={{ fill: ps[0].color }}>
                  {ps[0].name}
                </text>
              )}
              {sc.ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={PAD.l}
                    x2={vw - PAD.r}
                    y1={y(t)}
                    y2={y(t)}
                    strokeWidth="1"
                    style={{ stroke: t === 0 ? "var(--chart-gray)" : "var(--chart-gray-soft)" }}
                  />
                  <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="fill-muted" fontSize="11">
                    {fmtTick(pu, t, sc.step)}
                  </text>
                </g>
              ))}
              {ps.map((s) => {
                const u = s.unit ?? unit;
                let d = "";
                let pen = false;
                s.values.forEach((v, i) => {
                  if (!isNum(v)) {
                    pen = false;
                    return;
                  }
                  d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
                  pen = true;
                });
                let lastIdx = -1;
                s.values.forEach((v, i) => {
                  if (isNum(v)) lastIdx = i;
                });
                const r = ps.length === 1 && trend ? regression(s.values) : null;
                const clamp = (v: number) => Math.min(Math.max(v, yTop), yBot);
                return (
                  <g key={s.name}>
                    {r && (
                      <line
                        x1={x(r.x0)}
                        x2={x(r.x1)}
                        y1={clamp(y(r.a + r.b * r.x0))}
                        y2={clamp(y(r.a + r.b * r.x1))}
                        strokeWidth="2"
                        strokeDasharray="6 4"
                        strokeLinecap="round"
                        style={{ stroke: "var(--chart-gray)", opacity: 0.9 }}
                      />
                    )}
                    <path d={d} fill="none" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" style={{ stroke: s.color }} />
                    {s.values.map((v, i) =>
                      isNum(v) ? (
                        <circle
                          key={i}
                          cx={x(i)}
                          cy={y(v)}
                          r={hover === i ? 5.5 : 3.5}
                          strokeWidth={hover === i ? 2 : 0}
                          style={{ fill: s.color, stroke: "var(--surface)" }}
                        />
                      ) : null,
                    )}
                    {lastIdx >= 0 && (
                      <text
                        x={x(lastIdx)}
                        y={y(s.values[lastIdx] as number) - 9}
                        textAnchor={x(lastIdx) > vw - 64 ? "end" : "middle"}
                        fontSize="11"
                        fontWeight="600"
                        style={{ fill: s.color }}
                      >
                        {fmtShort(u, s.values[lastIdx] as number)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
        <Events events={events} categories={categories} x={x} bottom={vh - PAD.b} right={vw} compact={narrow} />
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.t - 4}
            y2={vh - PAD.b}
            strokeWidth="1"
            style={{ stroke: "var(--chart-gray)", opacity: 0.8 }}
          />
        )}
        <XLabels categories={categories} x={x} vh={vh} />
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 w-max max-w-[210px] rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
          style={{ left: tipLeft, transform: "translateX(-50%)" }}
        >
          <div className="font-semibold">
            {categories[hover]}
            {hoverEvent && <span className="ml-1.5 font-normal" style={{ color: "var(--negative)" }}>· {hoverEvent.label}</span>}
          </div>
          <div className="mt-1 space-y-1">
            {series.map((s) => {
              const v = s.values[hover];
              const p = hover > 0 ? s.values[hover - 1] : null;
              const u = s.unit ?? unit;
              const dl = isNum(v) && isNum(p) ? fmtDelta(u, v, p) : null;
              return (
                <div key={s.name}>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="text-muted">{s.name}</span>
                    <span className="ml-auto pl-3 font-semibold tabular-nums">{isNum(v) ? fmtFull(u, v) : "sin dato"}</span>
                  </div>
                  {dl && (
                    <div className="pl-3.5 text-[11px] text-muted">
                      {dl} vs {categories[hover - 1]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
