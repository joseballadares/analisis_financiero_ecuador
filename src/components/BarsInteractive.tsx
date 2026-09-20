"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { formatCompactMoney, formatMoney } from "@/lib/format";
import { isNum, niceStep } from "@/lib/chartMath";

export type BSeries = { name: string; color: string; values: (number | null)[] };

const H = 150;

// Barras agrupadas pequeñas por año, con leyenda arriba y cuadro flotante al pasar el cursor (o tocar).
// El eje se acorta a los años con movimiento relevante.
export default function BarsInteractive({ categories: catsIn, series: serIn }: { categories: string[]; series: BSeries[] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [vw, setVw] = useState(320);
  const [hover, setHover] = useState<number | null>(null);

  // Años con movimiento: al menos una serie con valor no despreciable (más del 0,5 % de su máximo).
  const maxAbs = serIn.map((s) => Math.max(0, ...s.values.filter(isNum).map((v) => Math.abs(v))));
  const active = (i: number) => serIn.some((s, k) => isNum(s.values[i]) && s.values[i] !== 0 && Math.abs(s.values[i] as number) >= 0.005 * maxAbs[k]);
  let from = 0;
  let to = catsIn.length - 1;
  while (from < to && !active(from)) from++;
  while (to > from && !active(to)) to--;
  from = Math.max(0, Math.min(from, to - 1));
  const cats = catsIn.slice(from, to + 1);
  const series = serIn.map((s) => ({ ...s, values: s.values.slice(from, to + 1) }));

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setVw(Math.max(220, Math.round(el.clientWidth)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const hide = () => setHover(null);
    const outside = (e: Event) => {
      if (!boxRef.current?.contains(e.target as Node)) hide();
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", hide, { passive: true });
    return () => {
      ro.disconnect();
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", hide);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const all = series.flatMap((s) => s.values).filter(isNum);
  const maxV = Math.max(0, ...all);
  const minV = Math.min(0, ...all);
  const step = niceStep(maxV - minV || 1, 3);
  const top = Math.ceil(maxV / step) * step;
  const bottom = Math.floor(minV / step) * step;
  const ticks: number[] = [];
  for (let v = bottom; v <= top + step / 2; v += step) ticks.push(Math.round(v / step) * step);

  const PAD = { l: 44, r: 6, t: 8, b: 20 };
  const iw = vw - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const n = cats.length;
  const slot = iw / n;
  const groupW = Math.min(slot * 0.78, series.length * 26);
  const bw = groupW / series.length;
  const y = (v: number) => PAD.t + ih - ((v - bottom) / (top - bottom || 1)) * ih;
  const cx = (i: number) => PAD.l + slot * i + slot / 2;

  function pick(e: ReactPointerEvent<SVGSVGElement>) {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) * vw) / r.width;
    setHover(Math.min(Math.max(Math.floor((px - PAD.l) / slot), 0), n - 1));
  }

  const tipLeft = hover === null ? 0 : Math.min(Math.max(cx(hover), 84), vw - 84);
  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <div ref={boxRef} className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${vw} ${H}`}
          width={vw}
          height={H}
          className="block w-full"
          role="img"
          style={{ touchAction: "pan-y" }}
          onPointerMove={pick}
          onPointerDown={(e) => {
            if (timer.current) clearTimeout(timer.current);
            pick(e);
          }}
          onPointerUp={(e) => {
            if (e.pointerType !== "mouse") {
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => setHover(null), 2500);
            }
          }}
          onPointerCancel={() => setHover(null)}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setHover(null);
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={vw - PAD.r} y1={y(t)} y2={y(t)} strokeWidth="1" style={{ stroke: t === 0 ? "var(--chart-gray)" : "var(--chart-gray-soft)" }} />
              <text x={PAD.l - 5} y={y(t) + 4} textAnchor="end" fontSize="10.5" className="fill-muted">
                {formatCompactMoney(t)}
              </text>
            </g>
          ))}
          {hover !== null && <rect x={PAD.l + slot * hover} y={PAD.t} width={slot} height={ih} style={{ fill: "var(--chart-gray-soft)", opacity: 0.35 }} />}
          {cats.map((c, i) =>
            series.map((s, k) => {
              const v = s.values[i];
              if (!isNum(v) || v === 0) return null;
              const x0 = cx(i) - groupW / 2 + k * bw;
              const yv = y(v);
              const y0 = y(0);
              return <rect key={`${c}-${s.name}`} x={x0 + 1} y={Math.min(yv, y0)} width={Math.max(bw - 2, 2)} height={Math.max(Math.abs(y0 - yv), 1.5)} rx="1.5" style={{ fill: s.color }} />;
            }),
          )}
          {cats.map((c, i) =>
            i % (n > 7 ? 2 : 1) === 0 || i === n - 1 ? (
              <text key={c} x={cx(i)} y={H - 5} textAnchor="middle" fontSize="10.5" className="fill-muted">
                {c}
              </text>
            ) : null,
          )}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-max max-w-[200px] rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
            style={{ left: tipLeft, transform: "translateX(-50%)" }}
          >
            <div className="font-semibold">{cats[hover]}</div>
            <div className="mt-1 space-y-0.5">
              {series.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="text-muted">{s.name}</span>
                  <span className="ml-auto pl-3 font-semibold tabular-nums">{isNum(s.values[hover]) ? formatMoney(s.values[hover] as number) : "sin dato"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
