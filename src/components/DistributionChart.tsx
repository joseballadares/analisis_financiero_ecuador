import type { RatioDist } from "@/lib/db";
import type { Direction } from "@/lib/star";
import { C } from "@/components/charts";
import { percentileOf, zoneColor } from "@/components/Semaforo";

export type DistItem = {
  key: string;
  label: string;
  dist: RatioDist | undefined;
  fmt: (v: number) => string;
  dir: Direction;
};

// Curva normal ajustada con la mediana y el rango intercuartílico de los pares (σ ≈ IQR / 1,349), que es
// robusta a valores extremos; se marca la posición de la empresa. Es una aproximación: la distribución real
// puede ser asimétrica.
function MiniCurve({ item }: { item: DistItem }) {
  const d = item.dist;
  if (!d || d.median === null || d.p25 === null || d.p75 === null || d.own === null || d.n < 10) return null;
  const mu = d.median;
  const sigma = (d.p75 - d.p25) / 1.349;
  if (!(sigma > 0)) return null;
  const own = d.own;
  const lo = Math.min(mu - 3.2 * sigma, own - 0.5 * sigma);
  const hi = Math.max(mu + 3.2 * sigma, own + 0.5 * sigma);
  const w = 300;
  const h = 150;
  const pl = 8;
  const pr = 8;
  const pt = 46;
  const pb = 26;
  const xs = (v: number) => pl + ((v - lo) / (hi - lo)) * (w - pl - pr);
  const pdf = (v: number) => Math.exp(-0.5 * Math.pow((v - mu) / sigma, 2));
  const ys = (p: number) => pt + (1 - p) * (h - pt - pb);
  const N = 80;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const v = lo + ((hi - lo) * i) / N;
    pts.push([xs(v), ys(pdf(v))]);
  }
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L${xs(hi).toFixed(1)},${ys(0)} L${xs(lo).toFixed(1)},${ys(0)} Z`;
  const pct = percentileOf(d);
  const color = zoneColor(pct, item.dir);
  const ownX = Math.min(Math.max(xs(own), pl), w - pr);
  // Área de los pares que quedan por debajo del valor de la empresa (hasta su posición).
  const below = pts.filter((p) => p[0] <= ownX);
  const belowPath =
    below.length > 1
      ? `${below.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")} L${ownX.toFixed(1)},${ys(0)} L${xs(lo).toFixed(1)},${ys(0)} Z`
      : "";
  const anchor = ownX > w - 70 ? "end" : ownX < 70 ? "start" : "middle";
  return (
    <div>
      <div className="text-xs font-semibold">{item.label}</div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img">
        <title>{`${item.label}: empresa ${item.fmt(own)}; mediana de pares ${item.fmt(mu)}; percentil ${pct === null ? "—" : Math.round(pct)} entre ${d.n} empresas`}</title>
        <path d={area} style={{ fill: C.blueSoft, opacity: 0.55 }} />
        {belowPath && <path d={belowPath} style={{ fill: color, opacity: 0.28 }} />}
        <path d={path} fill="none" strokeWidth="2" style={{ stroke: C.blue }} />
        <line x1={xs(mu)} x2={xs(mu)} y1={ys(1)} y2={ys(0)} strokeWidth="1.25" strokeDasharray="4 3" style={{ stroke: C.gray }} />
        <text x={xs(mu)} y={h - 10} textAnchor="middle" fontSize="10" className="fill-muted">
          mediana {item.fmt(mu)}
        </text>
        <line x1={ownX} x2={ownX} y1={pt - 10} y2={ys(0)} strokeWidth="2.5" style={{ stroke: color }} />
        <path d={`M${ownX - 5},${pt - 16} L${ownX + 5},${pt - 16} L${ownX},${pt - 8} Z`} style={{ fill: color }} />
        <text x={ownX} y={pt - 32} textAnchor={anchor} fontSize="11" fontWeight="700" style={{ fill: color }}>
          Aquí está la empresa
        </text>
        <text x={ownX} y={pt - 20} textAnchor={anchor} fontSize="11" fontWeight="600" style={{ fill: color }}>
          {item.fmt(own)}
        </text>
      </svg>
      <div className="text-[11px] text-muted">
        {pct === null
          ? ""
          : `La empresa está por encima del ${Math.round(pct)}% de los ${d.n.toLocaleString("es-EC")} pares (sombreado).`}
      </div>
    </div>
  );
}

export default function DistributionChart({
  items,
  groupLabel,
  n,
  title = "Dónde se ubica frente a empresas de su sector y tamaño",
}: {
  items: DistItem[];
  groupLabel: string;
  n: number;
  title?: string;
}) {
  const shown = items.filter((i) => i.dist && i.dist.own !== null);
  if (shown.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-0.5 text-xs text-muted">
        Distribución (curva normal aproximada) de las {n.toLocaleString("es-EC")} empresas activas más cercanas en ingresos de la{" "}
        {groupLabel}. La barra vertical es la empresa; la línea punteada, la mediana.
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {shown.map((i) => (
          <MiniCurve key={i.key} item={i} />
        ))}
      </div>
    </div>
  );
}
