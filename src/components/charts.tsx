import { formatCompactMoney, formatPercent } from "@/lib/format";

export type Series = {
  name: string;
  color: string;
  values: (number | null)[];
};

export type ChartEvent = { year: number; label: string };

export const EVENTS: ChartEvent[] = [
  { year: 2020, label: "Pandemia" },
  { year: 2024, label: "Crisis energética" },
];

const W = 640;
const H = 250;
const PAD = { l: 58, r: 12, t: 22, b: 28 };

function niceStep(range: number, ticks: number) {
  const raw = range / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

function scale(values: (number | null)[]) {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  let min = Math.min(0, ...(nums.length ? nums : [0]));
  let max = Math.max(0, ...(nums.length ? nums : [0]));
  if (min === max) max = min + 1;
  const step = niceStep(max - min, 4);
  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(v);
  return { min, max, ticks };
}

// Regresión lineal por mínimos cuadrados sobre los puntos con dato (índices de categoría en x).
function regression(values: (number | null)[]) {
  const pts = values
    .map((v, i) => (typeof v === "number" && Number.isFinite(v) ? { x: i, y: v } : null))
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

function Legend({ series, trend, extra }: { series: Series[]; trend?: boolean; extra?: string }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {series.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
          {s.name}
        </span>
      ))}
      {trend && (
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed border-muted" />
          Tendencia
        </span>
      )}
      {extra && <span>{extra}</span>}
    </div>
  );
}

function XLabels({ categories, x }: { categories: string[]; x: (i: number) => number }) {
  const every = categories.length > 9 ? 2 : 1;
  return (
    <>
      {categories.map((c, i) =>
        i % every === 0 ? (
          <text key={c + i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted" fontSize="11">
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
}: {
  events?: ChartEvent[];
  categories: string[];
  x: (i: number) => number;
}) {
  if (!events?.length) return null;
  return (
    <>
      {events.map((e) => {
        const i = categories.indexOf(String(e.year));
        if (i < 0) return null;
        const cx = x(i);
        const anchor = cx > W - 110 ? "end" : "start";
        const tx = anchor === "end" ? cx - 4 : cx + 4;
        return (
          <g key={e.year}>
            <line
              x1={cx}
              x2={cx}
              y1={16}
              y2={H - PAD.b}
              strokeWidth="1.5"
              strokeDasharray="5 4"
              style={{ stroke: "var(--negative)" }}
            />
            <text x={tx} y={11} textAnchor={anchor} fontSize="10" style={{ fill: "var(--negative)" }}>
              {e.year} {e.label}
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
}: {
  series: Series[];
  x: (i: number) => number;
  y: (v: number) => number;
}) {
  const clamp = (v: number) => Math.min(Math.max(v, PAD.t), H - PAD.b);
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
            style={{ stroke: s.color, opacity: 0.9 }}
          />
        );
      })}
    </>
  );
}

export function BarChart({
  categories,
  series,
  format = formatCompactMoney,
  trend = false,
  events,
}: {
  categories: string[];
  series: Series[];
  format?: (v: number) => string;
  trend?: boolean;
  events?: ChartEvent[];
}) {
  const all = series.flatMap((s) => s.values);
  const { min, max, ticks } = scale(all);
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const y = (v: number) => PAD.t + ih - ((v - min) / (max - min)) * ih;
  const slot = iw / categories.length;
  const x = (i: number) => PAD.l + slot * i + slot / 2;
  const bw = Math.min(28, (slot * 0.7) / series.length);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="fill-muted" fontSize="11">
              {format(t)}
            </text>
          </g>
        ))}
        {series.map((s, si) =>
          s.values.map((v, i) => {
            if (v === null || !Number.isFinite(v)) return null;
            const bx = x(i) - (bw * series.length) / 2 + bw * si;
            const y0 = y(0);
            const y1 = y(v);
            return (
              <rect
                key={s.name + i}
                x={bx}
                y={Math.min(y0, y1)}
                width={bw - 1}
                height={Math.max(1, Math.abs(y1 - y0))}
                rx="2"
                style={{ fill: s.color }}
              >
                <title>{`${s.name} ${categories[i]}: ${format(v)}`}</title>
              </rect>
            );
          }),
        )}
        {trend && <TrendLines series={series} x={x} y={y} />}
        <Events events={events} categories={categories} x={x} />
        <XLabels categories={categories} x={x} />
      </svg>
      <Legend series={series} trend={trend} />
    </div>
  );
}

export function LineChart({
  categories,
  series,
  format = (v: number) => formatPercent(v, 0),
  trend = false,
  events,
}: {
  categories: string[];
  series: Series[];
  format?: (v: number) => string;
  trend?: boolean;
  events?: ChartEvent[];
}) {
  const all = series.flatMap((s) => s.values);
  const { min, max, ticks } = scale(all);
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const y = (v: number) => PAD.t + ih - ((v - min) / (max - min)) * ih;
  const slot = iw / categories.length;
  const x = (i: number) => PAD.l + slot * i + slot / 2;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(t)}
              y2={y(t)}
              className={t === 0 ? "stroke-muted" : "stroke-border"}
              strokeWidth="1"
            />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="fill-muted" fontSize="11">
              {format(t)}
            </text>
          </g>
        ))}
        {series.map((s) => {
          const pts = s.values
            .map((v, i) => (v === null || !Number.isFinite(v) ? null : [x(i), y(v)]))
            .filter((p): p is number[] => p !== null);
          return (
            <g key={s.name}>
              <polyline
                fill="none"
                strokeWidth="2"
                points={pts.map((p) => p.join(",")).join(" ")}
                style={{ stroke: s.color }}
              />
              {s.values.map((v, i) =>
                v === null || !Number.isFinite(v) ? null : (
                  <circle key={i} cx={x(i)} cy={y(v)} r="3" style={{ fill: s.color }}>
                    <title>{`${s.name} ${categories[i]}: ${format(v)}`}</title>
                  </circle>
                ),
              )}
            </g>
          );
        })}
        {trend && <TrendLines series={series} x={x} y={y} />}
        <Events events={events} categories={categories} x={x} />
        <XLabels categories={categories} x={x} />
      </svg>
      <Legend series={series} trend={trend} />
    </div>
  );
}

// Barras (eje izquierdo) + línea (eje derecho, escala propia): permite ver una serie pequeña
// (p. ej. la utilidad neta) frente a una grande (los ingresos) sin que quede aplastada.
export function ComboChart({
  categories,
  bars,
  line,
  formatBars = formatCompactMoney,
  formatLine = formatCompactMoney,
  trend = true,
  events,
}: {
  categories: string[];
  bars: Series;
  line: Series;
  formatBars?: (v: number) => string;
  formatLine?: (v: number) => string;
  trend?: boolean;
  events?: ChartEvent[];
}) {
  const PR = 62;
  const left = scale(bars.values);
  const right = scale(line.values);
  const iw = W - PAD.l - PR;
  const ih = H - PAD.t - PAD.b;
  const yl = (v: number) => PAD.t + ih - ((v - left.min) / (left.max - left.min)) * ih;
  const yr = (v: number) => PAD.t + ih - ((v - right.min) / (right.max - right.min)) * ih;
  const slot = iw / categories.length;
  const x = (i: number) => PAD.l + slot * i + slot / 2;
  const bw = Math.min(30, slot * 0.6);
  const pts = line.values
    .map((v, i) => (v === null || !Number.isFinite(v) ? null : [x(i), yr(v)]))
    .filter((p): p is number[] => p !== null);
  const rBars = trend ? regression(bars.values) : null;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {left.ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PR} y1={yl(t)} y2={yl(t)} className="stroke-border" strokeWidth="1" />
            <text x={PAD.l - 6} y={yl(t) + 4} textAnchor="end" className="fill-muted" fontSize="11">
              {formatBars(t)}
            </text>
          </g>
        ))}
        {right.ticks.map((t) => (
          <text key={t} x={W - PR + 6} y={yr(t) + 4} textAnchor="start" fontSize="11" style={{ fill: line.color }}>
            {formatLine(t)}
          </text>
        ))}
        {bars.values.map((v, i) =>
          v === null || !Number.isFinite(v) ? null : (
            <rect
              key={i}
              x={x(i) - bw / 2}
              y={Math.min(yl(0), yl(v))}
              width={bw}
              height={Math.max(1, Math.abs(yl(v) - yl(0)))}
              rx="2"
              style={{ fill: bars.color, opacity: 0.75 }}
            >
              <title>{`${bars.name} ${categories[i]}: ${formatBars(v)}`}</title>
            </rect>
          ),
        )}
        {rBars && (
          <line
            x1={x(rBars.x0)}
            x2={x(rBars.x1)}
            y1={yl(rBars.a + rBars.b * rBars.x0)}
            y2={yl(rBars.a + rBars.b * rBars.x1)}
            strokeWidth="2"
            strokeDasharray="6 4"
            strokeLinecap="round"
            style={{ stroke: bars.color }}
          />
        )}
        <polyline fill="none" strokeWidth="2.5" points={pts.map((p) => p.join(",")).join(" ")} style={{ stroke: line.color }} />
        {line.values.map((v, i) =>
          v === null || !Number.isFinite(v) ? null : (
            <circle key={i} cx={x(i)} cy={yr(v)} r="3.5" style={{ fill: line.color }}>
              <title>{`${line.name} ${categories[i]}: ${formatLine(v)}`}</title>
            </circle>
          ),
        )}
        <Events events={events} categories={categories} x={x} />
        <XLabels categories={categories} x={x} />
      </svg>
      <Legend
        series={[bars, { ...line, name: `${line.name} (eje derecho)` }]}
        trend={trend}
      />
    </div>
  );
}

// Estructura del balance de un año: el activo frente a pasivo + patrimonio apilados.
export function BalanceStructureChart({
  year,
  activos,
  pasivos,
  patrimonio,
}: {
  year: number;
  activos: number;
  pasivos: number;
  patrimonio: number;
}) {
  const W2 = 420;
  const H2 = 240;
  const pl = 62;
  const pr = 16;
  const pt = 12;
  const pb = 34;
  const posStack = Math.max(pasivos, 0) + Math.max(patrimonio, 0);
  const negStack = Math.min(patrimonio, 0) + Math.min(pasivos, 0);
  const { min, max, ticks } = scale([activos, posStack, negStack, 0]);
  const ih = H2 - pt - pb;
  const y = (v: number) => pt + ih - ((v - min) / (max - min)) * ih;
  const bw = 110;
  const x1 = pl + (W2 - pl - pr) * 0.25 - bw / 2;
  const x2 = pl + (W2 - pl - pr) * 0.75 - bw / 2;
  const rect = (x: number, v0: number, v1: number, color: string, title: string) => (
    <rect x={x} y={Math.min(y(v0), y(v1))} width={bw} height={Math.max(1, Math.abs(y(v1) - y(v0)))} style={{ fill: color }}>
      <title>{title}</title>
    </rect>
  );
  const pas = Math.max(pasivos, 0);
  return (
    <div>
      <svg viewBox={`0 0 ${W2} ${H2}`} className="w-full" role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pl} x2={W2 - pr} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth="1" />
            <text x={pl - 6} y={y(t) + 4} textAnchor="end" className="fill-muted" fontSize="11">
              {formatCompactMoney(t)}
            </text>
          </g>
        ))}
        {rect(x1, 0, activos, "var(--brand)", `Activos: ${formatCompactMoney(activos)}`)}
        {rect(x2, 0, pas, "var(--negative)", `Pasivos: ${formatCompactMoney(pasivos)}`)}
        {patrimonio >= 0
          ? rect(x2, pas, pas + patrimonio, "var(--accent)", `Patrimonio: ${formatCompactMoney(patrimonio)}`)
          : rect(x2, 0, patrimonio, "var(--accent)", `Patrimonio (negativo): ${formatCompactMoney(patrimonio)}`)}
        <text x={x1 + bw / 2} y={H2 - 14} textAnchor="middle" className="fill-muted" fontSize="11">
          Activos
        </text>
        <text x={x2 + bw / 2} y={H2 - 14} textAnchor="middle" className="fill-muted" fontSize="11">
          Pasivos + Patrimonio
        </text>
      </svg>
      <Legend
        series={[
          { name: "Activos", color: "var(--brand)", values: [] },
          { name: "Pasivos", color: "var(--negative)", values: [] },
          { name: "Patrimonio", color: "var(--accent)", values: [] },
        ]}
        extra={`Año ${year}`}
      />
    </div>
  );
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
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img">
      {yTicks.map((e) => (
        <g key={e}>
          <line x1={pl} x2={w - pr} y1={ys(Math.pow(10, e))} y2={ys(Math.pow(10, e))} className="stroke-border" />
          <text x={pl - 6} y={ys(Math.pow(10, e)) + 4} textAnchor="end" className="fill-muted" fontSize="11">
            {formatCompactMoney(Math.pow(10, e))}
          </text>
        </g>
      ))}
      {xTicks.map((g) => (
        <text key={g} x={xs(g)} y={h - 22} textAnchor="middle" className="fill-muted" fontSize="11">
          {formatPercent(g, 0)}
        </text>
      ))}
      <line x1={xs(nationalGrowth)} x2={xs(nationalGrowth)} y1={pt} y2={h - pb} className="stroke-muted" strokeDasharray="4 4" />
      <text x={xs(nationalGrowth) + 4} y={pt - 6} className="fill-muted" fontSize="10">
        crecimiento nacional {formatPercent(nationalGrowth, 1)}
      </text>
      <text x={(pl + w - pr) / 2} y={h - 4} textAnchor="middle" className="fill-muted" fontSize="11">
        Crecimiento de ingresos vs año anterior
      </text>
      {pts.map((b) => (
        <g key={b.id}>
          <circle
            cx={xs(b.growth)}
            cy={ys(b.revenue)}
            r={rad(b.size)}
            fillOpacity="0.55"
            style={{ fill: b.color ?? "var(--brand)", stroke: b.color ?? "var(--brand)" }}
          >
            <title>{`${b.label}: ${formatPercent(b.growth, 1)} · ${formatCompactMoney(b.revenue)}`}</title>
          </circle>
          <text x={xs(b.growth)} y={ys(b.revenue) + 3} textAnchor="middle" fontSize="10" className="fill-foreground">
            {b.id}
          </text>
        </g>
      ))}
    </svg>
  );
}
