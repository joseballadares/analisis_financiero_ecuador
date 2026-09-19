import type { ReactNode } from "react";
import { formatCompactMoney, formatPercent } from "@/lib/format";

// Paleta de dos colores (azul = foco, gris = contexto). El rojo se reserva para eventos y alertas.
export const C = {
  blue: "var(--chart-blue)",
  blueSoft: "var(--chart-blue-soft)",
  gray: "var(--chart-gray)",
  graySoft: "var(--chart-gray-soft)",
  red: "var(--negative)",
};

export type Series = {
  name: string;
  color: string;
  values: (number | null)[];
};

export type ChartEvent = { year: number; label: string; short?: string };

export const EVENTS: ChartEvent[] = [
  { year: 2020, label: "Pandemia", short: "Pandemia" },
  { year: 2024, label: "Crisis energética", short: "Crisis" },
];

// El SVG se dibuja a dos anchos (escritorio y celular) y CSS muestra el que corresponde, para que el texto
// conserve un tamaño legible en pantallas angostas en vez de encogerse con el gráfico.
const DESKTOP = { w: 480, h: 230 };
const MOBILE = { w: 320, h: 210 };

function Dual({ render }: { render: (w: number, h: number) => ReactNode }) {
  return (
    <>
      <div className="hidden sm:block">{render(DESKTOP.w, DESKTOP.h)}</div>
      <div className="sm:hidden">{render(MOBILE.w, MOBILE.h)}</div>
    </>
  );
}

const isNum = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

function niceStep(range: number, ticks: number) {
  const raw = range / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

function scale(values: (number | null)[], ticksWanted = 3) {
  const nums = values.filter(isNum);
  let min = Math.min(0, ...(nums.length ? nums : [0]));
  let max = Math.max(0, ...(nums.length ? nums : [0]));
  if (min === max) max = min + 1;
  const step = niceStep(max - min, ticksWanted);
  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(v);
  return { min, max, ticks };
}

function regression(values: (number | null)[]) {
  const pts = values
    .map((v, i) => (isNum(v) ? { x: i, y: v } : null))
    .filter((p): p is { x: number; y: number } => p !== null);
  if (pts.length < 3) return null;
  const n = pts.length;
  const sx = pts.reduce((a, p) => a + p.x, 0);
  const sy = pts.reduce((a, p) => a + p.y, 0);
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0);
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
  const den = n * sxx - sx * sx;
  if (den === 0) return null;
  const b = (n * sxy - sx * sy) / den;
  const a = (sy - b * sx) / n;
  return { a, b, x0: pts[0].x, x1: pts[pts.length - 1].x };
}

function Legend({ series, trend }: { series: Series[]; trend?: boolean }) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {series.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
          {s.name}
        </span>
      ))}
      {trend && (
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: C.gray }} />
          Tendencia
        </span>
      )}
    </div>
  );
}

function XLabels({ categories, x, vh }: { categories: string[]; x: (i: number) => number; vh: number }) {
  const every = categories.length > 9 ? 2 : 1;
  return (
    <>
      {categories.map((c, i) =>
        i === categories.length - 1 || (i % every === 0 && categories.length - 1 - i >= every) ? (
          <text key={c + i} x={x(i)} y={vh - 8} textAnchor="middle" className="fill-muted" fontSize="11">
            {c}
          </text>
        ) : null,
      )}
    </>
  );
}

function Events({
  events,
  categories,
  x,
  bottom,
  right,
  compact = false,
}: {
  events?: ChartEvent[];
  categories: string[];
  x: (i: number) => number;
  bottom: number;
  right: number;
  compact?: boolean;
}) {
  if (!events?.length) return null;
  return (
    <>
      {events.map((e) => {
        const i = categories.indexOf(String(e.year));
        if (i < 0) return null;
        const cx = x(i);
        // Si el siguiente evento queda cerca a la derecha, la etiqueta va a la izquierda de su línea para no encimarse.
        const nextIdx = events.map((o) => categories.indexOf(String(o.year))).filter((j) => j > i).sort((a, b) => a - b)[0];
        const crowded = nextIdx !== undefined && x(nextIdx) - cx < (compact ? 190 : 240) && cx > (compact ? 100 : 150);
        const anchor = crowded || cx > right - 110 ? "end" : "start";
        const tx = anchor === "end" ? cx - 4 : cx + 4;
        return (
          <g key={e.year}>
            <line x1={cx} x2={cx} y1={16} y2={bottom} strokeWidth="1.25" strokeDasharray="5 4" style={{ stroke: C.red, opacity: 0.85 }} />
            <text x={tx} y={11} textAnchor={anchor} fontSize="11" style={{ fill: C.red }}>
              {e.year} {compact && e.short ? e.short : e.label}
            </text>
          </g>
        );
      })}
    </>
  );
}

function TrendLines({
  series,
  x,
  y,
  top,
  bottom,
}: {
  series: Series[];
  x: (i: number) => number;
  y: (v: number) => number;
  top: number;
  bottom: number;
}) {
  const clamp = (v: number) => Math.min(Math.max(v, top), bottom);
  return (
    <>
      {series.map((s) => {
        const r = regression(s.values);
        if (!r) return null;
        return (
          <line
            key={s.name}
            x1={x(r.x0)}
            x2={x(r.x1)}
            y1={clamp(y(r.a + r.b * r.x0))}
            y2={clamp(y(r.a + r.b * r.x1))}
            strokeWidth="2"
            strokeDasharray="6 4"
            strokeLinecap="round"
            style={{ stroke: C.gray, opacity: 0.9 }}
          />
        );
      })}
    </>
  );
}

// Barras agrupadas. La última categoría se resalta con etiquetas de valor; el resto queda atenuado.
// `tooltips` da un texto combinado por categoría al pasar el ratón (útil cuando una serie es muy pequeña).
function BarChartAt({
  categories,
  series,
  format = formatCompactMoney,
  trend = false,
  events,
  labelLast = true,
  tooltips,
  legend = true,
  vw,
  vh,
}: {
  vw: number;
  vh: number;
  categories: string[];
  series: Series[];
  format?: (v: number) => string;
  trend?: boolean;
  events?: ChartEvent[];
  labelLast?: boolean;
  tooltips?: string[];
  legend?: boolean;
}) {
  const PAD = { l: 52, r: 12, t: 24, b: 28 };
  const all = series.flatMap((s) => s.values);
  const { min, max, ticks } = scale(all);
  const iw = vw - PAD.l - PAD.r;
  const ih = vh - PAD.t - PAD.b;
  const y = (v: number) => PAD.t + ih - ((v - min) / (max - min)) * ih;
  const slot = iw / categories.length;
  const x = (i: number) => PAD.l + slot * i + slot / 2;
  const bw = Math.min(28, (slot * 0.72) / series.length);
  const last = categories.length - 1;
  const single = series.length === 1;
  return (
    <div>
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={vw - PAD.r} y1={y(t)} y2={y(t)} strokeWidth="1" style={{ stroke: C.graySoft }} />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="fill-muted" fontSize="11">
              {format(t)}
            </text>
          </g>
        ))}
        {series.map((s, si) =>
          s.values.map((v, i) => {
            if (!isNum(v) || v === 0) return null;
            const bx = x(i) - (bw * series.length) / 2 + bw * si;
            const y0 = y(0);
            const y1 = y(v);
            const h = Math.max(3, Math.abs(y1 - y0));
            const top = v >= 0 ? y0 - h : y0;
            const dim = single && i !== last;
            return (
              <rect
                key={s.name + i}
                x={bx}
                y={top}
                width={bw - 1}
                height={h}
                rx="2"
                style={{ fill: s.color, opacity: dim ? 0.45 : 1 }}
              >
                <title>{`${s.name} ${categories[i]}: ${format(v)}`}</title>
              </rect>
            );
          }),
        )}
        {labelLast &&
          series.map((s, si) => {
            const v = s.values[last];
            if (!isNum(v) || v === 0) return null;
            const bx = x(last) - (bw * series.length) / 2 + bw * si + (bw - 1) / 2;
            const yy = v >= 0 ? y(v) - 5 : y(v) + 13;
            return (
              <text key={s.name} x={bx} y={yy} textAnchor="middle" fontSize="11" fontWeight="600" style={{ fill: s.color }}>
                {format(v)}
              </text>
            );
          })}
        {trend && <TrendLines series={series} x={x} y={y} top={PAD.t} bottom={vh - PAD.b} />}
        <Events events={events} categories={categories} x={x} bottom={vh - PAD.b} right={vw} compact={vw < 400} />
        <XLabels categories={categories} x={x} vh={vh} />
        {tooltips &&
          categories.map((c, i) => (
            <rect key={c + "hit"} x={x(i) - slot / 2} y={PAD.t} width={slot} height={ih} fill="transparent">
              <title>{tooltips[i]}</title>
            </rect>
          ))}
      </svg>
      {legend && series.length > 1 && <Legend series={series} trend={trend} />}
    </div>
  );
}

// Líneas con etiquetas directas al final (nombre y valor final) en lugar de leyenda.
function LineChartAt({
  categories,
  series,
  format = (v: number) => formatPercent(v, 0),
  trend = false,
  events,
  endLabels = false,
  vw,
  vh,
}: {
  vw: number;
  vh: number;
  categories: string[];
  series: Series[];
  format?: (v: number) => string;
  trend?: boolean;
  events?: ChartEvent[];
  endLabels?: boolean;
}) {
  const narrow = vw < 400;
  const PAD = { l: narrow ? 46 : 52, r: endLabels ? (narrow ? 100 : 104) : 14, t: 24, b: 28 };
  const all = series.flatMap((s) => s.values);
  const { min, max, ticks } = scale(all);
  const iw = vw - PAD.l - PAD.r;
  const ih = vh - PAD.t - PAD.b;
  const y = (v: number) => PAD.t + ih - ((v - min) / (max - min)) * ih;
  const slot = iw / categories.length;
  const x = (i: number) => PAD.l + slot * i + slot / 2;

  // Posición vertical de las etiquetas finales, separadas al menos 13 px entre sí.
  const ends = series
    .map((s) => {
      let idx = -1;
      s.values.forEach((v, i) => {
        if (isNum(v)) idx = i;
      });
      return idx >= 0 ? { s, idx, v: s.values[idx] as number, ly: y(s.values[idx] as number) } : null;
    })
    .filter((e): e is { s: Series; idx: number; v: number; ly: number } => e !== null)
    .sort((a, b) => a.ly - b.ly);
  for (let i = 1; i < ends.length; i++) if (ends[i].ly - ends[i - 1].ly < 13) ends[i].ly = ends[i - 1].ly + 13;

  return (
    <div>
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={vw - PAD.r} y1={y(t)} y2={y(t)} strokeWidth="1" style={{ stroke: t === 0 ? C.gray : C.graySoft }} />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="fill-muted" fontSize="11">
              {format(t)}
            </text>
          </g>
        ))}
        {series.map((s) => {
          const pts = s.values
            .map((v, i) => (isNum(v) ? [x(i), y(v)] : null))
            .filter((p): p is number[] => p !== null);
          return (
            <g key={s.name}>
              <polyline fill="none" strokeWidth="2.25" strokeLinejoin="round" points={pts.map((p) => p.join(",")).join(" ")} style={{ stroke: s.color }} />
              {s.values.map((v, i) =>
                !isNum(v) ? null : endLabels && i !== s.values.length - 1 && s.values.slice(i + 1).some(isNum) ? (
                  <circle key={i} cx={x(i)} cy={y(v)} r="6" fill="transparent">
                    <title>{`${s.name} ${categories[i]}: ${format(v)}`}</title>
                  </circle>
                ) : (
                  <circle key={i} cx={x(i)} cy={y(v)} r={endLabels ? 3.5 : 3} style={{ fill: s.color }}>
                    <title>{`${s.name} ${categories[i]}: ${format(v)}`}</title>
                  </circle>
                ),
              )}
            </g>
          );
        })}
        {trend && <TrendLines series={series} x={x} y={y} top={PAD.t} bottom={vh - PAD.b} />}
        <Events events={events} categories={categories} x={x} bottom={vh - PAD.b} right={vw - PAD.r + 60} compact={vw < 400} />
        {endLabels &&
          ends.map((e) => (
            <text key={e.s.name} x={x(e.idx) + 8} y={e.ly + 4} fontSize="11" fontWeight="600" style={{ fill: e.s.color }}>
              {e.s.name} {format(e.v)}
            </text>
          ))}
        <XLabels categories={categories} x={x} vh={vh} />
      </svg>
      {!endLabels && series.length > 1 && <Legend series={series} trend={trend} />}
    </div>
  );
}

type BarProps = Omit<Parameters<typeof BarChartAt>[0], "vw" | "vh">;
type LineProps = Omit<Parameters<typeof LineChartAt>[0], "vw" | "vh">;

export function BarChart(props: BarProps) {
  return <Dual render={(w, h) => <BarChartAt {...props} vw={w} vh={h} />} />;
}

export function LineChart(props: LineProps) {
  return <Dual render={(w, h) => <LineChartAt {...props} vw={w} vh={h} />} />;
}

export type Bubble = {
  id: string;
  label: string;
  growth: number;
  revenue: number;
  size: number;
  color?: string;
};

export function BubbleChart({ items, nationalGrowth }: { items: Bubble[]; nationalGrowth: number }) {
  const pl = 62;
  const pr = 30;
  const pt = 36;
  const pb = 40;
  const w = 720;
  const h = 380;
  const pts = items.filter((b) => b.revenue > 0 && Number.isFinite(b.growth));
  const gs = pts.map((b) => b.growth);
  const gmin = Math.min(-0.05, ...gs, nationalGrowth - 0.02);
  const gmax = Math.max(0.05, ...gs, nationalGrowth + 0.02);
  const lmin = Math.floor(Math.log10(Math.min(...pts.map((b) => b.revenue))));
  const lmax = Math.ceil(Math.log10(Math.max(...pts.map((b) => b.revenue))));
  const xs = (g: number) => pl + ((g - gmin) / (gmax - gmin)) * (w - pl - pr);
  const ys = (r: number) => pt + (1 - (Math.log10(r) - lmin) / (lmax - lmin || 1)) * (h - pt - pb);
  const maxSize = Math.max(...pts.map((b) => b.size));
  const rad = (s: number) => 6 + 22 * Math.sqrt(s / maxSize);
  const yTicks: number[] = [];
  for (let e = lmin; e <= lmax; e++) yTicks.push(e);
  const xTicks: number[] = [];
  for (let g = Math.ceil(gmin * 20) / 20; g <= gmax; g += 0.05) xTicks.push(Math.round(g * 100) / 100);
  return (
    <div className="overflow-x-auto">
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[640px]" role="img">
      {yTicks.map((e) => (
        <g key={e}>
          <line x1={pl} x2={w - pr} y1={ys(Math.pow(10, e))} y2={ys(Math.pow(10, e))} style={{ stroke: C.graySoft }} />
          <text x={pl - 6} y={ys(Math.pow(10, e)) + 4} textAnchor="end" className="fill-muted" fontSize="12">
            {formatCompactMoney(Math.pow(10, e))}
          </text>
        </g>
      ))}
      {xTicks.map((g) => (
        <text key={g} x={xs(g)} y={h - 22} textAnchor="middle" className="fill-muted" fontSize="12">
          {formatPercent(g, 0)}
        </text>
      ))}
      <line x1={xs(nationalGrowth)} x2={xs(nationalGrowth)} y1={pt} y2={h - pb} strokeDasharray="4 4" style={{ stroke: C.gray }} />
      <text x={xs(nationalGrowth) + 4} y={pt - 6} className="fill-muted" fontSize="11">
        crecimiento nacional {formatPercent(nationalGrowth, 1)}
      </text>
      <text x={(pl + w - pr) / 2} y={h - 4} textAnchor="middle" className="fill-muted" fontSize="12">
        Crecimiento de ingresos vs año anterior
      </text>
      {pts.map((b) => (
        <g key={b.id}>
          <circle
            cx={xs(b.growth)}
            cy={ys(b.revenue)}
            r={rad(b.size)}
            fillOpacity="0.55"
            style={{ fill: b.color ?? C.blue, stroke: b.color ?? C.blue }}
          >
            <title>{`${b.label}: ${formatPercent(b.growth, 1)} · ${formatCompactMoney(b.revenue)}`}</title>
          </circle>
          <text x={xs(b.growth)} y={ys(b.revenue) + 3} textAnchor="middle" fontSize="11" className="fill-foreground">
            {b.id}
          </text>
        </g>
      ))}
    </svg>
    </div>
  );
}
