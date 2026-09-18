import { formatCompactMoney, formatPercent } from "@/lib/format";

export type Series = {
  name: string;
  color: string;
  values: (number | null)[];
};

const W = 640;
const H = 240;
const PAD = { l: 58, r: 12, t: 12, b: 28 };

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

function Legend({ series }: { series: Series[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
      {series.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
          {s.name}
        </span>
      ))}
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

export function BarChart({
  categories,
  series,
  format = formatCompactMoney,
}: {
  categories: string[];
  series: Series[];
  format?: (v: number) => string;
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
        <XLabels categories={categories} x={x} />
      </svg>
      <Legend series={series} />
    </div>
  );
}

export function LineChart({
  categories,
  series,
  format = (v: number) => formatPercent(v, 0),
}: {
  categories: string[];
  series: Series[];
  format?: (v: number) => string;
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
        <XLabels categories={categories} x={x} />
      </svg>
      <Legend series={series} />
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
      <text x={xs(nationalGrowth) + 4} y={pt + 10} className="fill-muted" fontSize="10">
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
